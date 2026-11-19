import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

import type { DailyUsage, ParticipantStats } from "./metrics";

/** Server-side access to the ranking RPCs. Never import from client components. */

export class RankingStoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function rpc<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message: string = data?.message ?? `Supabase 요청 실패 (${res.status})`;
    if (message.includes("nickname already taken")) throw new RankingStoreError("다른 계정이 같은 표시 이름을 쓰고 있습니다. /settings에서 표시 이름을 바꾸세요.", 409);
    if (message.includes("invalid token")) throw new RankingStoreError("전송 토큰이 맞지 않습니다. /settings에서 새 토큰을 받으세요.", 401);
    if (message.includes("display name required")) throw new RankingStoreError("/settings에서 표시 이름(2–24자)을 먼저 정하세요.", 400);
    if (data?.code === "PGRST202") throw new RankingStoreError("랭킹 테이블이 아직 없습니다. 마이그레이션을 먼저 적용하세요.", 503);
    throw new RankingStoreError(message, res.status >= 500 ? 502 : 400);
  }
  return data as T;
}

/** Submits days for the account that owns the token. Returns the nickname used in the ranking. */
export async function submitUsage(token: string, days: DailyUsage[]): Promise<string> {
  return rpc<string>("ranking_submit_with_token", { p_token: token, p_days: days });
}

/** Days of records the token owner currently has in the ranking. */
export async function myRecordDays(token: string): Promise<number> {
  return rpc<number>("ranking_my_record_days", { p_token: token });
}

/** Deletes every ranking record of the token owner. The account and token stay. Returns deleted days. */
export async function deleteMyRecords(token: string): Promise<number> {
  return rpc<number>("ranking_delete_my_records", { p_token: token });
}

const camel =(s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const TEXT_COLUMNS = new Set(["nickname", "last_submitted_at"]);

/** Totals per participant for the last `days` days (0 = all time). */
export async function periodStats(days: number): Promise<ParticipantStats[]> {
  const rows = await rpc<Record<string, unknown>[]>("ranking_period_stats", { p_days: days });
  return rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(row)) out[camel(k)] = TEXT_COLUMNS.has(k) ? String(v) : Number(v);
    return out as unknown as ParticipantStats;
  });
}
