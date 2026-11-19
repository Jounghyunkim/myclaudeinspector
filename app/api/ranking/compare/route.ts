import type { NextRequest } from "next/server";

import { DEFAULT_PERIOD, compare, parsePeriod, periodStats } from "@/features/ranking";

import { errorResponse } from "../errors";

/** GET ?nicknames=a,b&period=7 — every metric for the given people, with rank and group average. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const nicknames = (params.get("nicknames") ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (!nicknames.length) return Response.json({ error: "nicknames 파라미터가 필요합니다." }, { status: 400 });
  const period = parsePeriod(params.get("period"), DEFAULT_PERIOD);
  try {
    const metrics = compare(await periodStats(period), nicknames).map(({ metric, ...rest }) => ({
      metric: metric.key,
      label: metric.label,
      unit: metric.unit,
      better: metric.better,
      ...rest,
    }));
    return Response.json({ period, nicknames, metrics });
  } catch (err) {
    return errorResponse(err);
  }
}
