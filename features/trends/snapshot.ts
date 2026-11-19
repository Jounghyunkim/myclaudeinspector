import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { encodeProjectDir } from "@/lib/claude/paths";
import { dayKey } from "@/lib/claude/time";

/** 하루 한 장. 화면에 보이는 숫자와 이름만 담는다(파일 본문·대화 내용·비밀 정보는 담지 않는다). */
export type Snapshot = {
  version: 1;
  date: string;
  savedAt: number;
  project: string;
  cli: string[];
  mcp: string[];
  skills: string[];
  usedSkills: string[];
  claudeMd: { name: string; lines: number }[];
  memory: string[];
};

export function snapshotRoot(): string {
  return path.join(os.homedir(), ".my-claude-inspector", "snapshots");
}

export function snapshotDir(projectPath: string): string {
  return path.join(snapshotRoot(), encodeProjectDir(projectPath));
}

/** 스냅샷에 담을 값. 화면을 조합하는 쪽이 도구 현황에서 채워 넘긴다. */
export type SnapshotInput = Omit<Snapshot, "version" | "date" | "savedAt" | "project">;

/** 오늘 스냅샷을 새 값으로 쓴다. 다른 날짜 파일은 건드리지 않는다. */
export async function saveTodaySnapshot(
  projectPath: string,
  now: number,
  input: SnapshotInput,
  dir = snapshotDir(projectPath),
): Promise<{ saved: boolean }> {
  try {
    await mkdir(dir, { recursive: true });
    const snap: Snapshot = { version: 1, date: dayKey(now), savedAt: now, project: projectPath, ...input };
    await writeFile(path.join(dir, `${snap.date}.json`), JSON.stringify(snap, null, 2), "utf8");
    return { saved: true };
  } catch {
    return { saved: false };
  }
}

export async function listSnapshots(projectPath: string, dir = snapshotDir(projectPath)): Promise<Snapshot[]> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n));
  } catch {
    return [];
  }
  const out: Snapshot[] = [];
  for (const n of names.sort()) {
    try {
      const s = JSON.parse(await readFile(path.join(dir, n), "utf8")) as Snapshot;
      if (s.version === 1) out.push(s);
    } catch {
      // 읽지 못한 스냅샷은 건너뛴다
    }
  }
  return out;
}
