import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { listSnapshots, saveTodaySnapshot, type Snapshot } from "./snapshot";
import { changeLog, dailyPoints } from "./trends";

const snap = (date: string, p: Partial<Snapshot> = {}): Snapshot => ({ version: 1, date, savedAt: 0, project: "p", cli: ["git"], mcp: [], skills: ["a"], usedSkills: [], claudeMd: [{ name: "CLAUDE.md", lines: 30 }], memory: [], ...p });

describe("스냅샷 저장 (AC27)", () => {
  test("같은 날은 덮어쓰고 다른 날 파일은 그대로 둔다", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "snap-"));
    await writeFile(path.join(dir, "2026-11-18.json"), JSON.stringify(snap("2026-11-18")));
    const now = new Date(2026, 10, 19, 9).getTime();
    const input = { cli: ["git"], mcp: [], skills: ["a"], usedSkills: [], claudeMd: [], memory: [] };
    await saveTodaySnapshot("p", now, input, dir);
    await saveTodaySnapshot("p", now + 1000, { ...input, mcp: ["playwright"] }, dir);
    expect((await readdir(dir)).sort()).toEqual(["2026-11-18.json", "2026-11-19.json"]);
    const list = await listSnapshots("p", dir);
    expect(list.map((s) => s.date)).toEqual(["2026-11-18", "2026-11-19"]);
    expect(list[1].mcp).toEqual(["playwright"]);
  });
});

describe("changeLog (AC30)", () => {
  test("추가·삭제·줄 수 변화를 최신순으로 적는다", () => {
    const log = changeLog([
      snap("2026-11-17"),
      snap("2026-11-18", { mcp: ["playwright"], cli: ["git", "gh"] }),
      snap("2026-11-19", { mcp: ["playwright"], cli: ["git", "gh"], claudeMd: [{ name: "CLAUDE.md", lines: 42 }], memory: ["user-role.md"] }),
    ]);
    expect(log.map((l) => `${l.date} ${l.kind}`)).toEqual(["2026-11-19 CLAUDE.md", "2026-11-19 Memory", "2026-11-18 CLI", "2026-11-18 MCP"]);
    expect(log[0].text).toContain("12줄 늘었어요");
  });
});

describe("dailyPoints (AC29)", () => {
  test("시작한 날짜에 세션을 세고, 70% 넘은 세션과 동시 세션을 계산한다", () => {
    const now = new Date(2026, 10, 19, 15).getTime();
    const at = (h: number) => new Date(2026, 10, 19, h).getTime();
    const s = (start: number, end: number, peak: number) => ({ id: String(start), title: null, firstPrompt: null, start, end, messages: 1, model: null, lastContextTokens: peak, peakContextTokens: peak, compacts: 0, branch: null, skillUses: [{ at: start, name: "commit" }], usages: [] });
    const pts = dailyPoints([s(at(9), at(11), 150_000), s(at(10), at(12), 20_000), s(at(13), at(14), 0)], [snap("2026-11-19")], now, 3);
    const today = pts[2];
    expect(today).toMatchObject({ sessions: 3, over: 1, conc: 2, skillUses: 3 });
    expect(today.tools).toMatchObject({ cli: 1, md: 30 });
    expect(pts[1].tools).toBeNull();
  });
});
