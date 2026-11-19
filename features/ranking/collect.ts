import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { DailyUsage } from "./metrics";

/**
 * Reads `<claudeDir>/projects/*\/*.jsonl` on the user's PC and turns it into per-day numbers.
 * Only counts leave this function: no message text, file paths, project names or model output.
 */

const ACTIVE_GAP_MS = 5 * 60_000;
const DEFAULT_WINDOW = 200_000;
const LARGE_WINDOW = 1_000_000;

type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
type Entry = {
  type?: string;
  subtype?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  timestamp?: string;
  message?: { id?: string; model?: string; usage?: Usage; content?: unknown };
};

type SessionSummary = {
  start: number;
  end: number;
  peakContextPct: number;
  messages: number;
  clears: number;
  compactions: number;
};

export function localDay(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyDay(day: string): DailyUsage {
  return {
    day,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    sessions: 0,
    messages: 0,
    activeMinutes: 0,
    toolCalls: 0,
    skillCalls: 0,
    mcpCalls: 0,
    subagentCalls: 0,
    compactions: 0,
    clears: 0,
    maxConcurrent: 0,
    peakContextPct: 0,
    avgContextPct: 0,
    over70Sessions: 0,
  };
}

function isHumanText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content.find((c) => c?.type === "text");
    if (text && !content.some((c) => c?.type === "tool_result")) return String(text.text ?? "");
  }
  return null;
}

/** Aggregates one session log into `days` and returns the session's shape. Exported for tests. */
export function addSession(lines: string[], days: Map<string, DailyUsage>, since: number): SessionSummary | null {
  const entries: Entry[] = [];
  for (const line of lines) {
    if (!line) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // a partially written last line is normal while a session is running
    }
  }
  const timed = entries.filter((e) => e.timestamp && !e.isSidechain && (e.type === "user" || e.type === "assistant"));
  if (!timed.length) return null;
  const times = timed.map((e) => Date.parse(e.timestamp!)).sort((a, b) => a - b);
  if (times[times.length - 1] < since) return null;

  const day = (t: number) => {
    const key = localDay(t);
    let d = days.get(key);
    if (!d) days.set(key, (d = emptyDay(key)));
    return d;
  };

  const session: SessionSummary = { start: times[0], end: times[times.length - 1], peakContextPct: 0, messages: 0, clears: 0, compactions: 0 };
  const seenMessages = new Set<string>();
  const seenTools = new Set<string>();

  for (const e of entries) {
    const t = e.timestamp ? Date.parse(e.timestamp) : session.start;
    if (t < since) continue;

    if (e.type === "system" && e.subtype === "compact_boundary") {
      day(t).compactions++;
      session.compactions++;
      continue;
    }
    if (e.isSidechain) continue;

    if (e.type === "user" && !e.isMeta) {
      const text = isHumanText(e.message?.content);
      if (text == null) continue;
      if (text.includes("<command-name>/clear</command-name>")) {
        day(t).clears++;
        session.clears++;
      }
      day(t).messages++;
      session.messages++;
      continue;
    }

    if (e.type !== "assistant" || !e.message) continue;
    const m = e.message;
    const id = m.id ?? `${t}`;
    if (!seenMessages.has(id)) {
      seenMessages.add(id);
      const u = m.usage ?? {};
      const d = day(t);
      d.inputTokens += u.input_tokens ?? 0;
      d.outputTokens += u.output_tokens ?? 0;
      d.cacheWriteTokens += u.cache_creation_input_tokens ?? 0;
      d.cacheReadTokens += u.cache_read_input_tokens ?? 0;
      d.messages++;
      session.messages++;
      const context = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
      const window = m.model?.includes("[1m]") || context > DEFAULT_WINDOW ? LARGE_WINDOW : DEFAULT_WINDOW;
      session.peakContextPct = Math.max(session.peakContextPct, Math.min(100, (context / window) * 100));
    }
    if (Array.isArray(m.content)) {
      for (const block of m.content) {
        if (block?.type !== "tool_use" || seenTools.has(block.id)) continue;
        seenTools.add(block.id);
        const d = day(t);
        d.toolCalls++;
        const name = String(block.name ?? "");
        if (name === "Skill") d.skillCalls++;
        else if (name === "Task" || name === "Agent") d.subagentCalls++;
        else if (name.startsWith("mcp__")) d.mcpCalls++;
      }
    }
  }

  // active time: gaps of 5 minutes or less, credited to the day of the later event
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    if (gap <= ACTIVE_GAP_MS && times[i] >= since) day(times[i]).activeMinutes += gap / 60_000;
  }
  return session;
}

function maxOverlap(intervals: [number, number][]): number {
  const points = intervals.flatMap(([s, e]) => [
    [s, 1],
    [e, -1],
  ]);
  points.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let cur = 0;
  let max = 0;
  for (const [, delta] of points) max = Math.max(max, (cur += delta));
  return max;
}

/** Folds sessions into their start day: count, context stats, concurrency. Exported for tests. */
export function addSessionDays(sessions: SessionSummary[], days: Map<string, DailyUsage>) {
  const byDay = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const key = localDay(s.start);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  for (const [key, list] of byDay) {
    const d = days.get(key) ?? emptyDay(key);
    days.set(key, d);
    d.sessions = list.length;
    d.peakContextPct = Math.round(Math.max(...list.map((s) => s.peakContextPct)) * 10) / 10;
    d.avgContextPct = Math.round((list.reduce((sum, s) => sum + s.peakContextPct, 0) / list.length) * 10) / 10;
    d.over70Sessions = list.filter((s) => s.peakContextPct > 70).length;
    d.maxConcurrent = maxOverlap(list.map((s) => [s.start, s.end]));
  }
}

export async function collectDailyUsage(claudeDir: string, lookbackDays = 30, now = Date.now()): Promise<DailyUsage[]> {
  const since = new Date(now - lookbackDays * 86_400_000).setHours(0, 0, 0, 0);
  const projectsDir = path.join(claudeDir, "projects");
  const days = new Map<string, DailyUsage>();
  const sessions: SessionSummary[] = [];

  for (const project of await readdir(projectsDir, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    const dir = path.join(projectsDir, project.name);
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".jsonl")) continue;
      const full = path.join(dir, file);
      if ((await stat(full)).mtimeMs < since) continue;
      const session = addSession((await readFile(full, "utf8")).split("\n"), days, since);
      if (session && session.start >= since) sessions.push(session);
    }
  }
  addSessionDays(sessions, days);
  return [...days.values()]
    .map((d) => ({ ...d, activeMinutes: Math.round(d.activeMinutes) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
