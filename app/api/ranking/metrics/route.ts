import { METRICS, PERIODS } from "@/features/ranking";

/** GET — metric keys and periods the leaderboard accepts. */
export function GET() {
  return Response.json({
    periods: PERIODS,
    metrics: METRICS.map(({ key, label, group, unit, better, description }) => ({ key, label, group, unit, better, description })),
  });
}
