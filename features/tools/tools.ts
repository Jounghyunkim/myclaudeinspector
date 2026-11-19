import { exec } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { ClaudeJsonView, McpServerConfig, SessionSummary } from "@/lib/claude";
import { parseFrontmatter } from "@/lib/claude/frontmatter";
import { projectDataDir } from "@/lib/claude/paths";

// ── CLI ──
export const COURSE_CLIS: { name: string; use: string }[] = [
  { name: "claude", use: "Claude Code 자체" },
  { name: "git", use: "변경 기록, 커밋" },
  { name: "gh", use: "GitHub 저장소와 PR" },
  { name: "node", use: "JavaScript 실행" },
  { name: "bun", use: "패키지 설치, 앱 실행" },
  { name: "vercel", use: "앱 배포 (배포 실습)" },
  { name: "supabase", use: "로그인·DB (Feedme 실습)" },
];
export type CliStatus = { name: string; use: string; version: string | null };

export function parseVersion(out: string): string | null {
  return /(\d+\.\d+(?:\.\d+)?)/.exec(out)?.[1] ?? null;
}

function versionOf(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    // COURSE_CLIS의 고정된 이름만 실행한다. Windows의 .cmd 실행 파일도 찾도록 셸 명령으로 부른다.
    exec(`${cmd} --version`, { timeout: 8000, windowsHide: true }, (err, stdout, stderr) => {
      if (err && !stdout) return resolve(null);
      resolve(parseVersion(`${stdout}\n${stderr}`));
    });
  });
}

export async function readCli(): Promise<CliStatus[]> {
  return Promise.all(COURSE_CLIS.map(async (c) => ({ ...c, version: await versionOf(c.name) })));
}

// ── Skills ──
export type SkillInfo = { name: string; scope: "프로젝트" | "사용자" | "플러그인"; path: string; description: string; uses: number };

async function skillsIn(dir: string, scope: SkillInfo["scope"], prefix = ""): Promise<SkillInfo[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const out: SkillInfo[] = [];
  for (const n of names) {
    const file = path.join(dir, n, "SKILL.md");
    try {
      const fm = parseFrontmatter(await readFile(file, "utf8"));
      out.push({ name: prefix + (fm.data.name || n), scope, path: file, description: fm.data.description ?? "", uses: 0 });
    } catch {
      // SKILL.md가 없는 폴더
    }
  }
  return out;
}

export async function readSkills(claudeDir: string, projectPath: string, usage: ClaudeJsonView["skillUsage"]): Promise<SkillInfo[]> {
  const lists = [await skillsIn(path.join(projectPath, ".claude", "skills"), "프로젝트"), await skillsIn(path.join(claudeDir, "skills"), "사용자")];
  try {
    const j = JSON.parse(await readFile(path.join(claudeDir, "plugins", "installed_plugins.json"), "utf8")) as {
      plugins?: Record<string, { scope?: string; projectPath?: string; installPath?: string }[]>;
    };
    for (const [id, installs] of Object.entries(j.plugins ?? {})) {
      const plugin = id.split("@")[0];
      const inst = installs.find((i) => i.scope === "user" || (i.projectPath && path.resolve(i.projectPath).toLowerCase() === path.resolve(projectPath).toLowerCase()));
      if (inst?.installPath) lists.push(await skillsIn(path.join(inst.installPath, "skills"), "플러그인", `${plugin}:`));
    }
  } catch {
    // 플러그인 없음
  }
  const seen = new Set<string>();
  const all = lists.flat().filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)));
  for (const s of all) s.uses = usage[s.name]?.usageCount ?? 0;
  return all.sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
}

// ── MCP ──
export type McpInfo = { name: string; type: string; where: string; command: string; known: string | null };

export const KNOWN_MCP: Record<string, string> = {
  playwright: "브라우저를 직접 열고 클릭, 입력, 스크린샷을 할 수 있게 해 주는 서버예요. 만든 웹 화면이 실제로 동작하는지 Claude가 확인할 때 써요.",
  "next-devtools": "실행 중인 Next.js 앱의 오류와 경로 정보를 Claude에게 알려 주는 서버예요.",
  context7: "라이브러리의 최신 문서를 찾아 Claude에게 건네주는 서버예요.",
  github: "GitHub 이슈와 PR을 읽고 쓰게 해 주는 서버예요. gh CLI가 있으면 CLI부터 써 보세요.",
  supabase: "Supabase 프로젝트의 테이블과 설정을 다루게 해 주는 서버예요.",
};

function knownOf(name: string, cfg: McpServerConfig): string | null {
  const hay = `${name} ${cfg.command ?? ""} ${(cfg.args ?? []).join(" ")} ${cfg.url ?? ""}`.toLowerCase();
  const key = Object.keys(KNOWN_MCP).find((k) => hay.includes(k));
  return key ? KNOWN_MCP[key] : null;
}

function toMcp(name: string, cfg: McpServerConfig, where: string): McpInfo {
  const command = cfg.url ?? [cfg.command, ...(cfg.args ?? [])].filter(Boolean).join(" ");
  return { name, type: cfg.type ?? (cfg.url ? "http" : "stdio"), where, command, known: knownOf(name, cfg) };
}

export async function readMcp(projectPath: string, cj: ClaudeJsonView): Promise<McpInfo[]> {
  const out: McpInfo[] = [];
  try {
    const j = JSON.parse(await readFile(path.join(projectPath, ".mcp.json"), "utf8")) as { mcpServers?: Record<string, Record<string, unknown>> };
    for (const [n, c] of Object.entries(j.mcpServers ?? {})) {
      out.push(toMcp(n, { type: c.type as string, command: c.command as string, args: c.args as string[], url: c.url as string }, "프로젝트 .mcp.json"));
    }
  } catch {
    // 프로젝트 .mcp.json 없음
  }
  for (const [n, c] of Object.entries(cj.localMcp)) out.push(toMcp(n, c, "이 프로젝트만 (~/.claude.json)"));
  for (const [n, c] of Object.entries(cj.userMcp)) out.push(toMcp(n, c, "모든 프로젝트 (~/.claude.json)"));
  return out;
}

// ── CLAUDE.md ──
export type MdFile = { name: string; scope: "프로젝트" | "사용자"; path: string; text: string; lines: number; importedBy: string | null };

async function readText(file: string): Promise<string | null> {
  try {
    return (await readFile(file, "utf8")).replace(/\r\n/g, "\n").replace(/\n$/, "");
  } catch {
    return null;
  }
}

export async function readClaudeMd(claudeDir: string, projectPath: string): Promise<MdFile[]> {
  const roots: { name: string; scope: MdFile["scope"]; file: string }[] = [
    { name: "~/.claude/CLAUDE.md", scope: "사용자", file: path.join(claudeDir, "CLAUDE.md") },
    { name: "CLAUDE.md", scope: "프로젝트", file: path.join(projectPath, "CLAUDE.md") },
    { name: ".claude/CLAUDE.md", scope: "프로젝트", file: path.join(projectPath, ".claude", "CLAUDE.md") },
    { name: "CLAUDE.local.md", scope: "프로젝트", file: path.join(projectPath, "CLAUDE.local.md") },
  ];
  const out: MdFile[] = [];
  const seen = new Set<string>();
  const visit = async (name: string, scope: MdFile["scope"], file: string, importedBy: string | null, depth: number) => {
    const key = path.resolve(file).toLowerCase();
    if (seen.has(key) || depth > 4) return;
    const text = await readText(file);
    if (text === null) return;
    seen.add(key);
    out.push({ name, scope, path: file, text, lines: text === "" ? 0 : text.split("\n").length, importedBy });
    for (const m of text.matchAll(/^@(\S+)\s*$/gm)) {
      const target = m[1].startsWith("~") ? path.join(path.dirname(claudeDir), m[1].slice(1)) : path.resolve(path.dirname(file), m[1]);
      await visit(path.relative(projectPath, target).startsWith("..") ? target : path.relative(projectPath, target).replace(/\\/g, "/"), scope, target, name, depth + 1);
    }
  };
  for (const r of roots) await visit(r.name, r.scope, r.file, null, 0);
  return out.sort((a, b) => b.lines - a.lines);
}

// ── Memory ──
export type MemoryFile = { name: string; kind: string; description: string; path: string; text: string };

export async function readMemory(claudeDir: string, projectPath: string): Promise<MemoryFile[]> {
  const dir = path.join(projectDataDir(claudeDir, projectPath), "memory");
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith(".md"));
  } catch {
    return [];
  }
  const out: MemoryFile[] = [];
  for (const n of names) {
    const text = (await readText(path.join(dir, n))) ?? "";
    const fm = parseFrontmatter(text);
    out.push({
      name: n,
      kind: n === "MEMORY.md" ? "목차" : fm.data["metadata.type"] || fm.data.type || "메모",
      description: n === "MEMORY.md" ? `기억 파일 ${names.length - 1}개의 목록` : fm.data.description ?? "",
      path: path.join(dir, n),
      text,
    });
  }
  return out.sort((a, b) => (a.name === "MEMORY.md" ? -1 : b.name === "MEMORY.md" ? 1 : a.name.localeCompare(b.name)));
}

// ── 묶음 ──
export type ToolsView = { cli: CliStatus[]; skills: SkillInfo[]; mcp: McpInfo[]; claudeMd: MdFile[]; memory: MemoryFile[] };

export async function readTools(claudeDir: string, projectPath: string, cj: ClaudeJsonView, sessions: SessionSummary[]): Promise<ToolsView> {
  const [cli, skills, mcp, claudeMd, memory] = await Promise.all([
    readCli(),
    readSkills(claudeDir, projectPath, cj.skillUsage),
    readMcp(projectPath, cj),
    readClaudeMd(claudeDir, projectPath),
    readMemory(claudeDir, projectPath),
  ]);
  // ~/.claude.json 에 기록이 없을 때는 대화 기록의 Skill 호출로 사용 횟수를 채운다
  if (skills.every((s) => s.uses === 0)) {
    const count = new Map<string, number>();
    for (const s of sessions) for (const u of s.skillUses) count.set(u.name, (count.get(u.name) ?? 0) + 1);
    for (const s of skills) s.uses = count.get(s.name) ?? 0;
    skills.sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  }
  return { cli, skills, mcp, claudeMd, memory };
}
