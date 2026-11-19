import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { readLiveLimits } from "./live-usage";

const now = Date.parse("2026-11-19T08:00:00Z");

async function dirWith(cred: unknown): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "live-usage-"));
  if (cred !== undefined) await writeFile(path.join(dir, ".credentials.json"), JSON.stringify(cred));
  return dir;
}

afterEach(() => vi.unstubAllGlobals());

describe("readLiveLimits", () => {
  test("로그인 파일이 없으면 no-login", async () => {
    expect(await readLiveLimits(await dirWith(undefined), now)).toEqual({ ok: false, issue: "no-login" });
  });

  test("토큰이 만료됐으면 요청하지 않고 expired", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const dir = await dirWith({ claudeAiOauth: { accessToken: "t", expiresAt: now - 1 } });
    expect(await readLiveLimits(dir, now)).toEqual({ ok: false, issue: "expired" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("응답의 five_hour·seven_day를 실시간 값으로 고른다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ five_hour: { utilization: 42, resets_at: "2026-11-19T10:00:00Z" }, seven_day: { utilization: 7, resets_at: null } })),
    );
    const dir = await dirWith({ claudeAiOauth: { accessToken: "t", expiresAt: now + 60_000 } });
    expect(await readLiveLimits(dir, now)).toEqual({
      ok: true,
      limits: { fiveHour: { utilization: 42, resetsAt: "2026-11-19T10:00:00Z" }, sevenDay: { utilization: 7, resetsAt: null }, fetchedAt: now, source: "live" },
    });
  });

  test("401이면 expired", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    const dir = await dirWith({ claudeAiOauth: { accessToken: "t", expiresAt: now + 60_000 } });
    expect(await readLiveLimits(dir, now)).toEqual({ ok: false, issue: "expired" });
  });
});
