import type { ClaudeJsonView, LimitSource, LiveIssue, SessionSummary } from "@/lib/claude";
import { dayKey, formatDate, startOfDay } from "@/lib/claude/time";

export const HIGH_LIMIT = 80;

export type LimitView = { pct: number; resetsAt: number | null; expired: boolean };
export type PlanLimits =
  | { state: "none"; liveIssue: LiveIssue | null }
  | {
      state: "ok";
      fiveHour: LimitView | null;
      sevenDay: LimitView | null;
      fetchedAt: number | null;
      source: LimitSource;
      /** Why the live fetch failed, when the shown value comes from the cache */
      liveIssue: LiveIssue | null;
    };

export function planLimits(limits: ClaudeJsonView["limits"], now: number, liveIssue: LiveIssue | null = null): PlanLimits {
  if (!limits || (!limits.fiveHour && !limits.sevenDay)) return { state: "none", liveIssue };
  const conv = (w: { utilization: number; resetsAt: string | null } | null): LimitView | null => {
    if (!w) return null;
    const resetsAt = w.resetsAt ? Date.parse(w.resetsAt) : null;
    const expired = resetsAt != null && resetsAt < now;
    // 초기화 시각이 지났다면 받아 둔 값은 이미 0으로 돌아간 상태다
    return { pct: expired ? 0 : Math.round(w.utilization), resetsAt, expired };
  };
  return {
    state: "ok",
    fiveHour: conv(limits.fiveHour),
    sevenDay: conv(limits.sevenDay),
    fetchedAt: limits.fetchedAt,
    source: limits.source,
    liveIssue: limits.source === "live" ? null : liveIssue,
  };
}

export type TokenBucket = { key: string; label: string; input: number; output: number; cacheWrite: number; cacheRead: number };

function emptyBucket(key: string, label: string): TokenBucket {
  return { key, label, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
}

/** 최근 7일(일별)과 최근 4주(7일 단위) 토큰 합 */
export function tokenSeries(sessions: SessionSummary[], now: number): { days: TokenBucket[]; weeks: TokenBucket[] } {
  const today = startOfDay(now);
  const days: TokenBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const t = today - i * 86_400_000;
    const d = new Date(t);
    days.push(emptyBucket(dayKey(t), i === 0 ? "오늘" : `${d.getMonth() + 1}/${d.getDate()}`));
  }
  const weeks: TokenBucket[] = [];
  for (let w = 3; w >= 0; w--) {
    const end = today - w * 7 * 86_400_000;
    const start = end - 6 * 86_400_000;
    weeks.push(emptyBucket(String(w), w === 0 ? "이번 주" : `${formatDate(start).replace("월 ", "/").replace("일", "")}~`));
  }
  const dayIndex = new Map(days.map((b, i) => [b.key, i]));
  for (const s of sessions) {
    for (const u of s.usages) {
      const di = dayIndex.get(dayKey(u.at));
      if (di != null) add(days[di], u);
      const ago = Math.floor((today + 86_400_000 - 1 - u.at) / (7 * 86_400_000));
      if (ago >= 0 && ago < 4) add(weeks[3 - ago], u);
    }
  }
  return { days, weeks };
}

function add(b: TokenBucket, u: { input: number; output: number; cacheWrite: number; cacheRead: number }) {
  b.input += u.input;
  b.output += u.output;
  b.cacheWrite += u.cacheWrite;
  b.cacheRead += u.cacheRead;
}

export function compactNumber(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return String(n);
}
