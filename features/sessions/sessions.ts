import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { SessionSummary } from "@/lib/claude";
import { contextPercent } from "@/lib/claude/context-window";
import { sessionName } from "@/lib/claude/session-name";
import { startOfDay } from "@/lib/claude/time";

export type LiveSession = { sessionId: string; name: string; status: "busy" | "idle"; folder: string; app: string; startedAt: number };

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** ~/.claude/sessions/*.json 상태 파일. 같은 폴더의 .key 파일은 읽지 않는다. */
export async function readLiveSessions(claudeDir: string): Promise<LiveSession[]> {
  const dir = path.join(claudeDir, "sessions");
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => /^\d+\.json$/.test(n));
  } catch {
    return [];
  }
  const out: LiveSession[] = [];
  for (const n of names) {
    try {
      const j = JSON.parse(await readFile(path.join(dir, n), "utf8")) as Record<string, unknown>;
      const pid = Number(j.pid);
      if (!Number.isFinite(pid) || !alive(pid)) continue;
      const entry = String(j.entrypoint ?? "");
      out.push({
        sessionId: String(j.sessionId ?? ""),
        name: typeof j.name === "string" && j.name ? j.name : "(이름 없는 세션)",
        status: j.status === "busy" ? "busy" : "idle",
        folder: typeof j.cwd === "string" ? path.basename(j.cwd) : "",
        app: /desktop/i.test(entry) ? "Desktop" : /cli|sdk/i.test(entry) || !entry ? "CLI" : entry,
        startedAt: Number(j.startedAt) || 0,
      });
    } catch {
      // 쓰는 중인 파일은 건너뛴다
    }
  }
  return out.sort((a, b) => (a.status === b.status ? b.startedAt - a.startedAt : a.status === "busy" ? -1 : 1));
}

export type Interval = { start: number; end: number };

/** 구간이 가장 많이 겹친 개수 */
export function maxOverlap(items: Interval[]): number {
  const ev: [number, number][] = [];
  for (const i of items) if (i.end >= i.start) ev.push([i.start, 1], [i.end, -1]);
  ev.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let cur = 0, best = 0;
  for (const [, d] of ev) best = Math.max(best, (cur += d));
  return best;
}

export type TimelineBar = { id: string; name: string; start: number; end: number; running: boolean; messages: number; model: string | null; ctx: number };
export type RecentRow = { id: string; name: string; status: "busy" | "idle" | "done"; start: number; length: number; messages: number; model: string | null; ctx: number; compacts: number; branch: string | null };

export type SessionsView = {
  live: LiveSession[];
  todayCount: number;
  weekCount: number;
  maxConcurrentToday: number;
  compactsThisWeek: number;
  timeline: TimelineBar[];
  recent: RecentRow[];
};

export function buildSessionsView(sessions: SessionSummary[], live: LiveSession[], now: number): SessionsView {
  const today = startOfDay(now);
  const weekStart = today - 6 * 86_400_000;
  const liveById = new Map(live.map((l) => [l.sessionId, l]));
  const ctx = (s: SessionSummary) => contextPercent(s.lastContextTokens, s.model, s.peakContextTokens);
  const timeline = sessions
    .filter((s) => s.end >= today)
    .map((s) => {
      const running = liveById.has(s.id);
      return { id: s.id, name: sessionName(s), start: Math.max(s.start, today), end: running ? now : s.end, running, messages: s.messages, model: s.model, ctx: ctx(s) };
    })
    .sort((a, b) => a.start - b.start);
  const recent = [...sessions]
    .sort((a, b) => b.end - a.end)
    .slice(0, 5)
    .map((s): RecentRow => ({
      id: s.id,
      name: sessionName(s),
      status: liveById.get(s.id)?.status ?? "done",
      start: s.start,
      length: (liveById.has(s.id) ? now : s.end) - s.start,
      messages: s.messages,
      model: s.model,
      ctx: ctx(s),
      compacts: s.compacts,
      branch: s.branch,
    }));
  return {
    live,
    todayCount: sessions.filter((s) => s.start >= today).length,
    weekCount: sessions.filter((s) => s.start >= weekStart).length,
    maxConcurrentToday: maxOverlap(timeline),
    compactsThisWeek: sessions.filter((s) => s.end >= weekStart).reduce((n, s) => n + s.compacts, 0),
    timeline,
    recent,
  };
}
