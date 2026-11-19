import { expect, test } from "vitest";

import { buildSessionsView, maxOverlap } from "./sessions";

test("maxOverlap은 동시에 겹친 구간의 최대 개수를 센다", () => {
  expect(maxOverlap([{ start: 0, end: 10 }, { start: 5, end: 15 }, { start: 20, end: 30 }])).toBe(2);
  expect(maxOverlap([])).toBe(0);
});

test("열린 세션은 지금까지 이어지고 상태가 표에 반영된다", () => {
  const now = new Date(2026, 10, 19, 14, 0).getTime();
  const s = (id: string, start: number, end: number) => ({ id, title: id, firstPrompt: null, start, end, messages: 3, model: null, lastContextTokens: 0, peakContextTokens: 0, compacts: 0, branch: "main", skillUses: [], usages: [] });
  const v = buildSessionsView(
    [s("a", now - 3_600_000, now - 60_000), s("b", now - 2 * 86_400_000, now - 2 * 86_400_000 + 1000)],
    [{ sessionId: "a", name: "a", status: "busy", folder: "x", app: "Desktop", startedAt: now - 3_600_000 }],
    now,
  );
  expect(v.timeline).toHaveLength(1);
  expect(v.timeline[0]).toMatchObject({ running: true, end: now });
  expect(v.recent.map((r) => r.status)).toEqual(["busy", "done"]);
  expect(v.todayCount).toBe(1);
  expect(v.weekCount).toBe(2);
});
