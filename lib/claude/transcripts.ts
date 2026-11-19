import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { cache } from "react";

import { projectDataDir } from "./paths";

/** 응답 하나의 토큰 사용 기록 */
export type UsageRecord = { at: number; input: number; output: number; cacheWrite: number; cacheRead: number };

/** 대화 기록 파일 하나(세션 하나)를 요약한 값 */
export type SessionSummary = {
  id: string;
  title: string | null;
  firstPrompt: string | null;
  start: number;
  end: number;
  messages: number;
  model: string | null;
  /** 마지막 응답이 읽은 컨텍스트 토큰 수 */
  lastContextTokens: number;
  /** 세션 중 가장 많이 읽은 컨텍스트 토큰 수 */
  peakContextTokens: number;
  compacts: number;
  branch: string | null;
  skillUses: { at: number; name: string }[];
  usages: UsageRecord[];
};

type Entry = Record<string, unknown> & {
  type?: string;
  timestamp?: string;
  isSidechain?: boolean;
  isMeta?: boolean;
  message?: { id?: string; model?: string; usage?: Record<string, number>; content?: unknown };
};

function textOf(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const t = content.find((c) => c && typeof c === "object" && (c as { type?: string }).type === "text") as
      | { text?: string }
      | undefined;
    return t?.text ?? null;
  }
  return null;
}

/** 대화 기록 한 줄씩을 받아 세션 요약을 만든다. 하위 에이전트(sidechain) 기록은 제외한다. */
export function summarizeEntries(id: string, entries: Iterable<Entry>): SessionSummary | null {
  const s: SessionSummary = {
    id, title: null, firstPrompt: null, start: Infinity, end: -Infinity, messages: 0, model: null,
    lastContextTokens: 0, peakContextTokens: 0, compacts: 0, branch: null, skillUses: [], usages: [],
  };
  const seen = new Set<string>();
  for (const e of entries) {
    if (e.type === "custom-title" && typeof e.customTitle === "string") s.title = e.customTitle;
    if (e.isSidechain) continue;
    const at = e.timestamp ? Date.parse(e.timestamp) : NaN;
    if (Number.isFinite(at) && (e.type === "user" || e.type === "assistant" || e.type === "system")) {
      s.start = Math.min(s.start, at);
      s.end = Math.max(s.end, at);
    }
    if (typeof e.gitBranch === "string" && e.gitBranch) s.branch = e.gitBranch;
    if (e.type === "system" && e.subtype === "compact_boundary") s.compacts++;
    if (e.type === "user" && !e.isMeta) {
      const text = textOf(e.message?.content);
      if (text !== null && typeof e.message?.content === "string") {
        s.messages++;
        if (!s.firstPrompt && !text.startsWith("<")) s.firstPrompt = text.trim().slice(0, 80);
      }
    }
    if (e.type === "assistant" && e.message) {
      const m = e.message;
      if (Array.isArray(m.content)) {
        for (const c of m.content as { type?: string; name?: string; input?: { skill?: unknown } }[]) {
          if (c?.type === "tool_use" && c.name === "Skill" && typeof c.input?.skill === "string" && Number.isFinite(at)) {
            s.skillUses.push({ at, name: c.input.skill });
          }
        }
      }
      const mid = m.id ?? "";
      if (mid && seen.has(mid)) continue;
      if (mid) seen.add(mid);
      if (m.model && m.model !== "<synthetic>") s.model = m.model;
      s.messages++;
      const u = m.usage;
      if (u && Number.isFinite(at)) {
        const input = u.input_tokens ?? 0, cacheWrite = u.cache_creation_input_tokens ?? 0, cacheRead = u.cache_read_input_tokens ?? 0;
        s.usages.push({ at, input, output: u.output_tokens ?? 0, cacheWrite, cacheRead });
        const ctx = input + cacheWrite + cacheRead;
        s.lastContextTokens = ctx;
        s.peakContextTokens = Math.max(s.peakContextTokens, ctx);
      }
    }
  }
  if (!Number.isFinite(s.start)) return null;
  return s;
}

async function readSession(file: string): Promise<SessionSummary | null> {
  const rl = readline.createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  const entries: Entry[] = [];
  for await (const line of rl) {
    if (!line) continue;
    try {
      entries.push(JSON.parse(line) as Entry);
    } catch {
      // 쓰는 중인 마지막 줄은 건너뛴다
    }
  }
  return summarizeEntries(path.basename(file, ".jsonl"), entries);
}

const fileCache = new Map<string, { mtime: number; size: number; summary: SessionSummary | null }>();

/** 이 프로젝트의 모든 세션 요약. 바뀌지 않은 파일은 다시 읽지 않는다. */
export const scanProjectSessions = cache(async (claudeDir: string, projectPath: string): Promise<SessionSummary[]> => {
  const dir = projectDataDir(claudeDir, projectPath);
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith(".jsonl"));
  } catch {
    return [];
  }
  const out: SessionSummary[] = [];
  for (const n of names) {
    const file = path.join(dir, n);
    const st = await stat(file);
    const hit = fileCache.get(file);
    let summary = hit && hit.mtime === st.mtimeMs && hit.size === st.size ? hit.summary : undefined;
    if (summary === undefined) {
      summary = await readSession(file);
      fileCache.set(file, { mtime: st.mtimeMs, size: st.size, summary });
    }
    if (summary) out.push(summary);
  }
  return out.sort((a, b) => b.start - a.start);
});

export { sessionName } from "./session-name";
