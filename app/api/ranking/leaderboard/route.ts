import type { NextRequest } from "next/server";

import { DEFAULT_METRIC, DEFAULT_PERIOD, findMetric, parsePeriod, periodStats, rankBy } from "@/features/ranking";

import { errorResponse } from "../errors";

/** GET ?metric=totalTokens&period=7 — ranking of every participant active in the period. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const metric = findMetric(params.get("metric") ?? DEFAULT_METRIC);
  if (!metric) return Response.json({ error: "알 수 없는 지표입니다. /api/ranking/metrics를 확인하세요." }, { status: 400 });
  const period = parsePeriod(params.get("period"), DEFAULT_PERIOD);
  try {
    const entries = rankBy(await periodStats(period), metric);
    return Response.json({ metric: metric.key, better: metric.better, unit: metric.unit, period, entries });
  } catch (err) {
    return errorResponse(err);
  }
}
