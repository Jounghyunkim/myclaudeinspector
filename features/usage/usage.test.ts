import { describe, expect, test } from "vitest";

import { planLimits, tokenSeries } from "./usage";

const now = new Date(2026, 10, 19, 14, 7).getTime();

describe("planLimits", () => {
  test("값이 없으면 none (0%로 보이지 않게)", () => {
    expect(planLimits(null, now)).toEqual({ state: "none", liveIssue: null });
  });
  test("초기화 시각이 지난 값은 0%로 본다", () => {
    const r = planLimits({ fiveHour: { utilization: 62, resetsAt: new Date(now - 1000).toISOString() }, sevenDay: { utilization: 84, resetsAt: new Date(now + 86_400_000).toISOString() }, fetchedAt: now, source: "cache" }, now);
    expect(r.state === "ok" && r.fiveHour?.pct).toBe(0);
    expect(r.state === "ok" && r.sevenDay?.pct).toBe(84);
  });
  test("캐시 값이면 실시간 조회 실패 이유를 함께 넘기고, 실시간 값이면 넘기지 않는다", () => {
    const w = { fiveHour: { utilization: 10, resetsAt: null }, sevenDay: null, fetchedAt: now };
    expect(planLimits({ ...w, source: "cache" }, now, "expired")).toMatchObject({ state: "ok", source: "cache", liveIssue: "expired" });
    expect(planLimits({ ...w, source: "live" }, now, "expired")).toMatchObject({ state: "ok", source: "live", liveIssue: null });
  });
});

describe("tokenSeries", () => {
  test("응답 토큰을 날짜와 주로 더하고, 오늘이 마지막 칸이다", () => {
    const u = (at: number, n: number) => ({ at, input: n, output: n, cacheWrite: n, cacheRead: n });
    const s = { usages: [u(now, 10), u(now - 86_400_000, 5), u(now - 10 * 86_400_000, 7)] } as never;
    const { days, weeks } = tokenSeries([s], now);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ label: "오늘", input: 10 });
    expect(days[5].input).toBe(5);
    expect(weeks).toHaveLength(4);
    expect(weeks[3].input).toBe(15);
    expect(weeks[2].input).toBe(7);
  });
});
