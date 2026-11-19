import { describe, expect, test } from "vitest";

import { recommend, type RecommendInput } from "./recommend";

const base: RecommendInput = {
  limits: [{ name: "주간 한도", pct: 40, resetsLabel: null }],
  contexts: [{ name: "a", pct: 30 }],
  unusedSkills: [],
  claudeMdLines: 50,
};

describe("recommend (AC18 규칙 순서)", () => {
  test("1. 한도 80% 이상이면 모델 변경을 먼저 추천한다", () => {
    const r = recommend({ ...base, limits: [{ name: "주간 한도", pct: 84, resetsLabel: "11월 22일 오전 9:00에" }], contexts: [{ name: "a", pct: 90 }], unusedSkills: [{ name: "tdd", description: "" }] });
    expect(r.rule).toBe(1);
    expect(r.title).toContain("84%");
    expect(r.prompt).toBe("/model sonnet");
  });
  test("2. 한도가 괜찮으면 70% 넘은 세션을 정리하라고 한다", () => {
    const r = recommend({ ...base, contexts: [{ name: "긴 세션", pct: 78 }], unusedSkills: [{ name: "tdd", description: "" }] });
    expect(r.rule).toBe(2);
    expect(r.body).toContain("긴 세션");
  });
  test("3. 그다음 안 쓴 Skill", () => {
    expect(recommend({ ...base, unusedSkills: [{ name: "tdd", description: "Test-driven development." }], claudeMdLines: 500 }).rule).toBe(3);
  });
  test("4. 그다음 200줄 넘는 CLAUDE.md", () => {
    expect(recommend({ ...base, claudeMdLines: 230 }).rule).toBe(4);
  });
  test("5. 해당 없으면 다음 기능", () => {
    expect(recommend(base).rule).toBe(5);
  });
  test("한도 값이 없으면 규칙 1을 건너뛴다", () => {
    expect(recommend({ ...base, limits: [], contexts: [{ name: "a", pct: 75 }] }).rule).toBe(2);
  });
});
