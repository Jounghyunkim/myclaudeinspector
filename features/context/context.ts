import type { SessionSummary } from "@/lib/claude";
import { contextPercent } from "@/lib/claude/context-window";
import { sessionName } from "@/lib/claude/session-name";

export const CONTEXT_LIMIT = 70;

export type ContextRow = { id: string; name: string; pct: number; model: string; lastAt: number };

/** 이 프로젝트의 최근 세션 5개(마지막 활동 순)와 세션별 컨텍스트 사용률 */
export function recentContext(sessions: SessionSummary[], n = 5): ContextRow[] {
  return [...sessions]
    .sort((a, b) => b.end - a.end)
    .slice(0, n)
    .map((s) => ({
      id: s.id,
      name: sessionName(s),
      pct: contextPercent(s.lastContextTokens, s.model, s.peakContextTokens),
      model: prettyModel(s.model),
      lastAt: s.end,
    }));
}

export function prettyModel(model: string | null): string {
  if (!model) return "모델 정보 없음";
  const m = /claude-(opus|sonnet|haiku|fable)-(\d+)-(\d+)/i.exec(model);
  if (!m) return model;
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}`;
}
