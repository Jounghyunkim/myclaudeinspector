import { parseSubmit, submitUsage } from "@/features/ranking";

import { errorResponse } from "../errors";

/** POST { token, days: DailyUsage[] } — upserts the days for the account that owns the token. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseSubmit(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const { token, days } = parsed.value;
    const nickname = await submitUsage(token, days);
    return Response.json({ nickname, days: days.length });
  } catch (err) {
    return errorResponse(err);
  }
}
