import { readFile } from "node:fs/promises";
import path from "node:path";

import { pickLimits, type ClaudeJsonView } from "./claude-json";

export type LiveIssue = "no-login" | "expired" | "failed";
export type LiveLimits =
  | { ok: true; limits: NonNullable<ClaudeJsonView["limits"]> }
  | { ok: false; issue: LiveIssue };

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const TTL_MS = 60_000;
let memo: { key: string; at: number; value: LiveLimits } | null = null;

/** Reads the CLI login token from <claudeDir>/.credentials.json. The token never leaves this module. */
async function readToken(
  claudeDir: string,
): Promise<{ token: string; expiresAt: number | null } | null> {
  try {
    const j = JSON.parse(
      await readFile(path.join(claudeDir, ".credentials.json"), "utf8"),
    ) as {
      claudeAiOauth?: { accessToken?: unknown; expiresAt?: unknown };
    };
    const o = j.claudeAiOauth;
    if (typeof o?.accessToken !== "string" || !o.accessToken) return null;
    return {
      token: o.accessToken,
      expiresAt: typeof o.expiresAt === "number" ? o.expiresAt : null,
    };
  } catch {
    return null;
  }
}

/** Asks Anthropic for the current plan-limit usage. Results are memoized for a minute per Claude folder. */
export async function readLiveLimits(
  claudeDir: string,
  now = Date.now(),
): Promise<LiveLimits> {
  if (memo && memo.key === claudeDir && now - memo.at < TTL_MS)
    return memo.value;
  const value = await fetchLive(claudeDir, now);
  memo = { key: claudeDir, at: now, value };
  return value;
}

async function fetchLive(claudeDir: string, now: number): Promise<LiveLimits> {
  const cred = await readToken(claudeDir);
  if (!cred) return { ok: false, issue: "no-login" };
  if (cred.expiresAt != null && cred.expiresAt <= now)
    return { ok: false, issue: "expired" };
  try {
    const res = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${cred.token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (res.status === 401) return { ok: false, issue: "expired" };
    if (!res.ok) return { ok: false, issue: "failed" };
    const limits = pickLimits(await res.json(), now);
    return limits ? { ok: true, limits } : { ok: false, issue: "failed" };
  } catch {
    return { ok: false, issue: "failed" };
  }
}
