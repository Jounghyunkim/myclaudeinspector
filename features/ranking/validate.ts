import type { DailyUsage } from "./metrics";

export type SubmitInput = { token: string; days: DailyUsage[] };

const NUMBER_FIELDS = [
  "inputTokens",
  "outputTokens",
  "cacheWriteTokens",
  "cacheReadTokens",
  "sessions",
  "messages",
  "activeMinutes",
  "toolCalls",
  "skillCalls",
  "mcpCalls",
  "subagentCalls",
  "compactions",
  "clears",
  "maxConcurrent",
  "peakContextPct",
  "avgContextPct",
  "over70Sessions",
] as const satisfies readonly (keyof DailyUsage)[];

export const MAX_DAYS_PER_SUBMIT = 400;

/** Returns the cleaned input, or an error message for the submitter. */
export function parseSubmit(body: unknown): { ok: true; value: SubmitInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "JSON 본문이 필요합니다." };
  const b = body as Record<string, unknown>;
  if (typeof b.token !== "string" || !b.token.startsWith("mci_")) return { ok: false, error: "token이 필요합니다. /settings에서 받으세요." };
  if (!Array.isArray(b.days) || b.days.length > MAX_DAYS_PER_SUBMIT) {
    return { ok: false, error: `days는 최대 ${MAX_DAYS_PER_SUBMIT}개의 배열이어야 합니다.` };
  }

  const days: DailyUsage[] = [];
  for (const raw of b.days) {
    const d = raw as Record<string, unknown>;
    if (typeof d?.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.day)) {
      return { ok: false, error: "day는 YYYY-MM-DD 형식이어야 합니다." };
    }
    const day = { day: d.day } as DailyUsage;
    for (const f of NUMBER_FIELDS) {
      const v = d[f] ?? 0;
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return { ok: false, error: `${d.day}의 ${f} 값이 잘못됐습니다.` };
      day[f] = f.endsWith("Pct") ? Math.min(100, Math.round(v * 10) / 10) : Math.round(v);
    }
    days.push(day);
  }
  return { ok: true, value: { token: b.token, days } };
}

/** Submit token from an `Authorization: Bearer mci_...` header, or null. */
export function bearerToken(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+(mci_\S+)$/i);
  return m ? m[1] : null;
}

export function parsePeriod(raw: string | null | undefined, fallback: number): number {
  const n = Number(raw);
  return raw != null && raw !== "" && Number.isInteger(n) && n >= 0 && n <= 3650 ? n : fallback;
}
