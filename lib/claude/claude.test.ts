import { describe, expect, test } from "vitest";

import { contextPercent } from "./context-window";
import { parseFrontmatter } from "./frontmatter";
import { encodeProjectDir } from "./paths";
import { pickClaudeJson } from "./claude-json";
import { summarizeEntries } from "./transcripts";

describe("encodeProjectDir", () => {
  test("Claude Code처럼 영문·숫자 외 문자를 '-'로 바꾼다", () => {
    expect(encodeProjectDir("D:\\workspace_ccedu\\myclaudeinspector")).toBe("D--workspace-ccedu-myclaudeinspector");
  });
});

describe("parseFrontmatter", () => {
  test("한 줄, 따옴표, 블록 값과 하위 키를 읽는다", () => {
    const fm = parseFrontmatter(`---\nname: commit\ndescription: "Create commits"\nmetadata:\n  type: feedback\nlong: >\n  first line\n  second line\n---\nbody`);
    expect(fm.data).toMatchObject({ name: "commit", description: "Create commits", "metadata.type": "feedback", long: "first line second line" });
    expect(fm.body).toBe("body");
  });
  test("frontmatter가 없으면 본문 전체를 돌려준다", () => {
    expect(parseFrontmatter("# 제목").data).toEqual({});
  });
});

describe("pickClaudeJson", () => {
  test("한도·Skill 사용 기록·MCP만 고르고 env 같은 값은 옮기지 않는다", () => {
    const v = pickClaudeJson(
      {
        oauthAccount: { emailAddress: "secret@example.com" },
        cachedUsageUtilization: { fetchedAtMs: 1, utilization: { five_hour: { utilization: 62, resets_at: "2026-11-19T07:30:00Z" } } },
        skillUsage: { commit: { usageCount: 7, lastUsedAt: 2 } },
        mcpServers: { gh: { command: "npx", args: ["x"], env: { TOKEN: "t" } } },
        projects: { "D:/work/app": { mcpServers: { pw: { type: "stdio", command: "npx" } } } },
      },
      "D:\\work\\app",
    );
    expect(v.limits?.fiveHour).toEqual({ utilization: 62, resetsAt: "2026-11-19T07:30:00Z" });
    expect(v.skillUsage.commit.usageCount).toBe(7);
    expect(v.userMcp.gh).toEqual({ type: undefined, command: "npx", args: ["x"], url: undefined });
    expect(Object.keys(v.localMcp)).toEqual(["pw"]);
    expect(JSON.stringify(v)).not.toContain("secret");
    expect(JSON.stringify(v)).not.toContain("TOKEN");
  });
});

describe("summarizeEntries", () => {
  const t = (m: number) => new Date(Date.UTC(2026, 10, 19, 1, m)).toISOString();
  test("같은 응답의 토큰은 한 번만 세고, sidechain은 빼며, 압축·Skill·제목을 모은다", () => {
    const usage = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000 };
    const s = summarizeEntries("s1", [
      { type: "user", timestamp: t(0), message: { content: "로그인 버그 고쳐 줘" }, gitBranch: "main" },
      { type: "assistant", timestamp: t(1), message: { id: "m1", model: "claude-opus-5-5", usage, content: [{ type: "text", text: "a" }] } },
      { type: "assistant", timestamp: t(1), message: { id: "m1", model: "claude-opus-5-5", usage, content: [{ type: "tool_use", name: "Skill", input: { skill: "commit" } }] } },
      { type: "assistant", timestamp: t(2), isSidechain: true, message: { id: "m2", usage: { input_tokens: 999999 } } },
      { type: "system", subtype: "compact_boundary", timestamp: t(3) },
      { type: "custom-title", customTitle: "버그 수정" },
    ])!;
    expect(s.usages).toHaveLength(1);
    expect(s.lastContextTokens).toBe(1110);
    expect(s.compacts).toBe(1);
    expect(s.skillUses.map((u) => u.name)).toEqual(["commit"]);
    expect(s.title).toBe("버그 수정");
    expect(s.firstPrompt).toBe("로그인 버그 고쳐 줘");
    expect(s.messages).toBe(2);
    expect(s.branch).toBe("main");
  });
});

describe("contextPercent", () => {
  test("기본 20만 토큰 창, 20만을 넘게 읽은 세션은 100만 창으로 본다", () => {
    expect(contextPercent(140_000, "claude-opus-5-5")).toBe(70);
    expect(contextPercent(300_000, "claude-opus-5-5", 300_000)).toBe(30);
  });
});
