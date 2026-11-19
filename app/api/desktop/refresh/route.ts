import { NextResponse } from "next/server";

import { readTools } from "@/features/tools";
import { saveTodaySnapshot } from "@/features/trends";
import { isDesktop } from "@/lib/desktop";

import { checkPaths, readBase, snapshotOf } from "../../../_data/inspect";

/** 데스크톱 앱의 주기 업데이트: 현황을 새로 읽고 그날 스냅샷을 갱신한다. 웹 배포에서는 쓰지 않는다. */
export async function POST(request: Request) {
  if (!isDesktop()) return NextResponse.json({ error: "desktop only" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { claude?: string; project?: string };
  const check = await checkPaths({ claude: body.claude, project: body.project });
  if (check.state !== "ok") return NextResponse.json({ ok: false, reason: check.state });
  const { claudeJson, sessions, now } = await readBase(check.paths);
  const tools = await readTools(check.paths.claude, check.paths.project, claudeJson, sessions);
  const saved = await saveTodaySnapshot(check.paths.project, now, snapshotOf(tools));
  return NextResponse.json({ ok: saved.saved, at: now });
}
