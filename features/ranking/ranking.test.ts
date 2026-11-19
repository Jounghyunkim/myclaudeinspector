import { describe, expect, it } from "vitest";

import { addSession, addSessionDays, localDay } from "./collect";
import { findMetric, type DailyUsage, type ParticipantStats } from "./metrics";
import { compare, rankBy } from "./rank";
import { bearerToken, parseSubmit } from "./validate";

function stats(nickname: string, patch: Partial<ParticipantStats>): ParticipantStats {
  return {
    nickname,
    lastSubmittedAt: "",
    activeDays: 1,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    sessions: 1,
    messages: 0,
    activeMinutes: 0,
    toolCalls: 0,
    skillCalls: 0,
    mcpCalls: 0,
    subagentCalls: 0,
    compactions: 0,
    clears: 0,
    maxConcurrent: 0,
    peakContextPct: 0,
    avgContextPct: 0,
    over70Sessions: 0,
    ...patch,
  };
}

describe("rankBy", () => {
  it("ranks higher-is-better metrics descending with shared ranks for ties", () => {
    const rows = [stats("a", { outputTokens: 10 }), stats("b", { outputTokens: 30 }), stats("c", { outputTokens: 10 })];
    const ranked = rankBy(rows, findMetric("outputTokens")!);
    expect(ranked.map((r) => [r.nickname, r.rank])).toEqual([
      ["b", 1],
      ["a", 2],
      ["c", 2],
    ]);
  });

  it("ranks lower-is-better metrics ascending and skips people with no sessions", () => {
    const rows = [
      stats("a", { sessions: 10, over70Sessions: 5 }),
      stats("b", { sessions: 10, over70Sessions: 1 }),
      stats("idle", { sessions: 0 }),
    ];
    const ranked = rankBy(rows, findMetric("over70Rate")!);
    expect(ranked.map((r) => [r.nickname, r.value])).toEqual([
      ["b", 10],
      ["a", 50],
    ]);
  });
});

describe("compare", () => {
  it("returns every metric with ranks for the requested people and the group average", () => {
    const rows = [stats("a", { toolCalls: 10 }), stats("b", { toolCalls: 30 })];
    const tool = compare(rows, ["a", "b"]).find((c) => c.metric.key === "toolCalls")!;
    expect(tool.average).toBe(20);
    expect(tool.values.map((v) => [v.nickname, v.rank])).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
  });
});

describe("parseSubmit", () => {
  it("requires a submit token and valid dates, fills missing numbers with 0", () => {
    expect(parseSubmit({ token: "nope", days: [] }).ok).toBe(false);
    expect(parseSubmit({ token: "mci_abc", days: [{ day: "19-11" }] }).ok).toBe(false);
    const ok = parseSubmit({ token: "mci_abc", days: [{ day: "2026-11-19", sessions: 2 }] });
    expect(ok.ok && ok.value.days[0].sessions).toBe(2);
    expect(ok.ok && ok.value.days[0].toolCalls).toBe(0);
  });
});

describe("bearerToken", () => {
  it("reads only an mci_ submit token from a Bearer header", () => {
    expect(bearerToken("Bearer mci_abc123")).toBe("mci_abc123");
    expect(bearerToken("bearer mci_abc123")).toBe("mci_abc123");
    expect(bearerToken("Bearer eyJhbGciOi")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("collect", () => {
  const at = (min: number) => new Date(2026, 10, 19, 10, min).toISOString();
  const line = (o: object) => JSON.stringify(o);

  it("counts tokens once per message, tools by kind, active minutes and context peak", () => {
    const lines = [
      line({ type: "user", timestamp: at(0), message: { content: "hello" } }),
      line({
        type: "assistant",
        timestamp: at(1),
        message: {
          id: "m1",
          model: "claude-sonnet",
          usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 150_000, cache_read_input_tokens: 0 },
          content: [{ type: "tool_use", id: "t1", name: "Skill" }],
        },
      }),
      // same message streamed again: usage must not double
      line({
        type: "assistant",
        timestamp: at(1),
        message: { id: "m1", usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: "tool_use", id: "t2", name: "mcp__x__y" }] },
      }),
      line({ type: "user", timestamp: at(3), message: { content: [{ type: "tool_result" }] } }),
      line({ type: "system", subtype: "compact_boundary", timestamp: at(30) }),
      line({ type: "user", timestamp: at(30), message: { content: "<command-name>/clear</command-name>" } }),
    ];
    const days = new Map<string, DailyUsage>();
    const session = addSession(lines, days, 0)!;
    addSessionDays([session], days);
    const d = days.get(localDay(Date.parse(at(0))))!;

    expect(d.outputTokens).toBe(5);
    expect(d.cacheWriteTokens).toBe(150_000);
    expect([d.toolCalls, d.skillCalls, d.mcpCalls]).toEqual([2, 1, 1]);
    expect([d.compactions, d.clears, d.sessions, d.over70Sessions]).toEqual([1, 1, 1, 1]);
    expect(d.peakContextPct).toBe(75);
    expect(Math.round(d.activeMinutes)).toBe(3); // 0→1→3 counted, 3→30 gap skipped
  });
});
