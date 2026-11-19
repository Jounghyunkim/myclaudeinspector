import { readFile } from "node:fs/promises";

import { claudeJsonPath, projectKey } from "./paths";

export type LimitWindow = { utilization: number; resetsAt: string | null };
export type McpServerConfig = { type?: string; command?: string; args?: string[]; url?: string };

/** ~/.claude.json 에서 대시보드가 쓰는 값만 골라 낸 것. 계정·인증 값은 담지 않는다. */
export type ClaudeJsonView = {
  limits: { fiveHour: LimitWindow | null; sevenDay: LimitWindow | null; fetchedAt: number | null } | null;
  skillUsage: Record<string, { usageCount: number; lastUsedAt: number | null }>;
  userMcp: Record<string, McpServerConfig>;
  localMcp: Record<string, McpServerConfig>;
};

const EMPTY: ClaudeJsonView = { limits: null, skillUsage: {}, userMcp: {}, localMcp: {} };

function pickWindow(w: unknown): LimitWindow | null {
  if (!w || typeof w !== "object") return null;
  const o = w as { utilization?: unknown; resets_at?: unknown };
  if (typeof o.utilization !== "number") return null;
  return { utilization: o.utilization, resetsAt: typeof o.resets_at === "string" ? o.resets_at : null };
}

function pickMcp(v: unknown): Record<string, McpServerConfig> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, McpServerConfig> = {};
  for (const [name, c] of Object.entries(v as Record<string, Record<string, unknown>>)) {
    // env, headers 처럼 비밀이 들어갈 수 있는 값은 옮기지 않는다
    out[name] = {
      type: typeof c?.type === "string" ? c.type : undefined,
      command: typeof c?.command === "string" ? c.command : undefined,
      args: Array.isArray(c?.args) ? c.args.filter((a): a is string => typeof a === "string") : undefined,
      url: typeof c?.url === "string" ? c.url : undefined,
    };
  }
  return out;
}

export function pickClaudeJson(raw: unknown, projectPath: string): ClaudeJsonView {
  if (!raw || typeof raw !== "object") return EMPTY;
  const j = raw as Record<string, unknown>;
  const cu = j.cachedUsageUtilization as { utilization?: Record<string, unknown>; fetchedAtMs?: unknown } | undefined;
  const limits = cu?.utilization
    ? {
        fiveHour: pickWindow(cu.utilization.five_hour),
        sevenDay: pickWindow(cu.utilization.seven_day),
        fetchedAt: typeof cu.fetchedAtMs === "number" ? cu.fetchedAtMs : null,
      }
    : null;
  const skillUsage: ClaudeJsonView["skillUsage"] = {};
  for (const [k, v] of Object.entries((j.skillUsage as Record<string, { usageCount?: unknown; lastUsedAt?: unknown }>) ?? {})) {
    if (typeof v?.usageCount === "number") {
      skillUsage[k] = { usageCount: v.usageCount, lastUsedAt: typeof v.lastUsedAt === "number" ? v.lastUsedAt : null };
    }
  }
  const projects = (j.projects as Record<string, { mcpServers?: unknown }>) ?? {};
  const key = projectKey(projectPath).toLowerCase();
  const proj = Object.entries(projects).find(([k]) => k.replace(/\\/g, "/").toLowerCase() === key)?.[1];
  return { limits, skillUsage, userMcp: pickMcp(j.mcpServers), localMcp: pickMcp(proj?.mcpServers) };
}

export async function readClaudeJson(claudeDir: string, projectPath: string): Promise<ClaudeJsonView> {
  try {
    const text = await readFile(claudeJsonPath(claudeDir), "utf8");
    return pickClaudeJson(JSON.parse(text), projectPath);
  } catch {
    return EMPTY;
  }
}
