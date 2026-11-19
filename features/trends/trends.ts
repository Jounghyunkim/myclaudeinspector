import type { SessionSummary } from "@/lib/claude";
import { contextPercent } from "@/lib/claude/context-window";
import { dayKey, startOfDay } from "@/lib/claude/time";

import type { Snapshot } from "./snapshot";

const DAY = 86_400_000;

export type DayPoint = {
  key: string;
  at: number;
  sessions: number;
  over: number;
  conc: number;
  skillUses: number;
  tools: { cli: number; mcp: number; skills: number; used: number; md: number; mem: number } | null;
};

function maxOverlap(items: { start: number; end: number }[]): number {
  const ev: [number, number][] = [];
  for (const i of items) ev.push([i.start, 1], [i.end, -1]);
  ev.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let cur = 0, best = 0;
  for (const [, d] of ev) best = Math.max(best, (cur += d));
  return best;
}

/** 최근 n일(오늘 포함) 날짜별 값. 세션 값은 대화 기록, 도구 값은 그날 스냅샷에서 온다. */
export function dailyPoints(sessions: SessionSummary[], snapshots: Snapshot[], now: number, n = 60): DayPoint[] {
  const today = startOfDay(now);
  const snapByDay = new Map(snapshots.map((s) => [s.date, s]));
  const out: DayPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const at = today - i * DAY;
    const key = dayKey(at);
    const started = sessions.filter((s) => dayKey(s.start) === key);
    const active = sessions
      .filter((s) => s.start < at + DAY && s.end >= at)
      .map((s) => ({ start: Math.max(s.start, at), end: Math.min(s.end, at + DAY) }));
    const snap = snapByDay.get(key);
    out.push({
      key,
      at,
      sessions: started.length,
      over: started.filter((s) => contextPercent(s.peakContextTokens, s.model, s.peakContextTokens) > 70).length,
      conc: maxOverlap(active),
      skillUses: sessions.reduce((c, s) => c + s.skillUses.filter((u) => dayKey(u.at) === key).length, 0),
      tools: snap
        ? { cli: snap.cli.length, mcp: snap.mcp.length, skills: snap.skills.length, used: snap.usedSkills.length, md: snap.claudeMd.reduce((a, f) => a + f.lines, 0), mem: snap.memory.length }
        : null,
    });
  }
  return out;
}

export type ChangeLogItem = { date: string; kind: "CLI" | "MCP" | "Skill" | "CLAUDE.md" | "Memory"; text: string };

function setDiff(a: string[], b: string[]) {
  const A = new Set(a), B = new Set(b);
  return { added: b.filter((x) => !A.has(x)), removed: a.filter((x) => !B.has(x)) };
}

function names(list: string[]): string {
  return list.length <= 2 ? list.join(", ") : `${list.slice(0, 2).join(", ")} 외 ${list.length - 2}개`;
}

/** 이웃한 두 스냅샷을 비교한 변화 기록(최신순) */
export function changeLog(snapshots: Snapshot[]): ChangeLogItem[] {
  const out: ChangeLogItem[] = [];
  for (let i = snapshots.length - 1; i >= 1; i--) {
    const a = snapshots[i - 1], b = snapshots[i];
    const push = (kind: ChangeLogItem["kind"], text: string) => out.push({ date: b.date, kind, text });
    const cli = setDiff(a.cli, b.cli);
    if (cli.added.length) push("CLI", `${names(cli.added)}가 설치됐어요`);
    if (cli.removed.length) push("CLI", `${names(cli.removed)}가 없어졌어요`);
    const mcp = setDiff(a.mcp, b.mcp);
    if (mcp.added.length) push("MCP", `${names(mcp.added)} 서버를 연결했어요`);
    if (mcp.removed.length) push("MCP", `${names(mcp.removed)} 서버 연결을 뺐어요`);
    const sk = setDiff(a.skills, b.skills);
    if (sk.added.length) push("Skill", `Skill ${sk.added.length}개가 설치됐어요${sk.removed.length ? "" : ` (${a.skills.length} → ${b.skills.length}개)`}`);
    if (sk.removed.length) push("Skill", `${names(sk.removed)} Skill이 없어졌어요`);
    const used = setDiff(a.usedSkills, b.usedSkills);
    if (used.added.length) push("Skill", `${names(used.added)}를 처음 썼어요`);
    const am = new Map(a.claudeMd.map((f) => [f.name, f.lines]));
    for (const f of b.claudeMd) {
      const before = am.get(f.name);
      if (before === undefined) push("CLAUDE.md", `${f.name}가 생겼어요 (${f.lines}줄)`);
      else if (before !== f.lines) push("CLAUDE.md", `${f.name}가 ${Math.abs(f.lines - before)}줄 ${f.lines > before ? "늘었어요" : "줄었어요"} (${before} → ${f.lines}줄)`);
    }
    const bm = new Set(b.claudeMd.map((f) => f.name));
    for (const f of a.claudeMd) if (!bm.has(f.name)) push("CLAUDE.md", `${f.name}가 없어졌어요`);
    const mem = setDiff(a.memory, b.memory);
    if (mem.added.length) push("Memory", `${names(mem.added)} 메모가 생겼어요`);
    if (mem.removed.length) push("Memory", `${names(mem.removed)} 메모가 지워졌어요`);
  }
  return out;
}
