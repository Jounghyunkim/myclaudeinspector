import { stat } from "node:fs/promises";
import path from "node:path";

import type { SnapshotInput } from "@/features/trends";
import type { ToolsView } from "@/features/tools";
import { defaultClaudeDir, readClaudeJson, scanProjectSessions } from "@/lib/claude";

export type Paths = { claude: string; project: string };
export type PathCheck =
  | { state: "empty"; paths: Paths }
  | { state: "error"; paths: Paths; bad: "claude" | "project"; message: string }
  | { state: "ok"; paths: Paths };

async function isDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}

export async function checkPaths(sp: Record<string, string | string[] | undefined>): Promise<PathCheck> {
  const paths = { claude: one(sp.claude) || defaultClaudeDir(), project: one(sp.project) };
  if (!paths.project) return { state: "empty", paths };
  if (!(await isDir(paths.claude))) {
    return { state: "error", paths, bad: "claude", message: "Claude 설치 폴더를 읽지 못했어요. 보통은 사용자 폴더 아래의 .claude 폴더예요." };
  }
  if (!(await isDir(paths.project))) {
    return { state: "error", paths, bad: "project", message: "폴더가 없어요. 오타가 없는지 확인해 주세요. Claude 설치 경로는 정상적으로 읽었지만, 프로젝트 정보 없이는 대시보드를 보여 줄 수 없어요." };
  }
  return { state: "ok", paths: { claude: path.resolve(paths.claude), project: path.resolve(paths.project) } };
}

export function query(paths: Paths): string {
  return `?${new URLSearchParams({ claude: paths.claude, project: paths.project }).toString()}`;
}

/** 여러 화면이 같이 쓰는 기본 읽기 */
export async function readBase(paths: Paths) {
  const [claudeJson, sessions] = await Promise.all([readClaudeJson(paths.claude, paths.project), scanProjectSessions(paths.claude, paths.project)]);
  return { claudeJson, sessions, now: Date.now() };
}

/** 도구 현황에서 스냅샷에 담을 숫자와 이름만 고른다 */
export function snapshotOf(tools: ToolsView): SnapshotInput {
  return {
    cli: tools.cli.filter((c) => c.version).map((c) => c.name),
    mcp: tools.mcp.map((m) => m.name),
    skills: tools.skills.map((s) => s.name),
    usedSkills: tools.skills.filter((s) => s.uses > 0).map((s) => s.name),
    claudeMd: tools.claudeMd.map((f) => ({ name: f.name, lines: f.lines })),
    memory: tools.memory.filter((m) => m.name !== "MEMORY.md").map((m) => m.name),
  };
}
