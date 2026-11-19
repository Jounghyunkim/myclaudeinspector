import os from "node:os";
import path from "node:path";

/** 사용자 홈의 기본 Claude 설치 경로 */
export function defaultClaudeDir(): string {
  return path.join(os.homedir(), ".claude");
}

/** Claude Code가 ~/.claude/projects 아래에 프로젝트 폴더 이름을 만드는 방식: 영문·숫자 외 문자는 모두 '-' */
export function encodeProjectDir(projectPath: string): string {
  return path.resolve(projectPath).replace(/[^a-zA-Z0-9]/g, "-");
}

export function projectDataDir(claudeDir: string, projectPath: string): string {
  return path.join(claudeDir, "projects", encodeProjectDir(projectPath));
}

/** ~/.claude.json 은 ~/.claude 폴더와 같은 위치(홈)에 있다 */
export function claudeJsonPath(claudeDir: string): string {
  return path.join(path.dirname(path.resolve(claudeDir)), ".claude.json");
}

/** ~/.claude.json 의 projects 키는 슬래시 경로를 쓴다 */
export function projectKey(projectPath: string): string {
  return path.resolve(projectPath).replace(/\\/g, "/");
}
