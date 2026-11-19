import { redirect } from "next/navigation";

import { readTools } from "@/features/tools";
import { changeLog, dailyPoints, listSnapshots, saveTodaySnapshot, TrendsView } from "@/features/trends";
import { dayKey, formatTime } from "@/lib/claude/time";

import { checkPaths, query, readBase, snapshotOf } from "../_data/inspect";

export const dynamic = "force-dynamic";

export default async function Trends({ searchParams }: PageProps<"/trends">) {
  const check = await checkPaths(await searchParams);
  if (check.state !== "ok") redirect(`/${check.state === "empty" ? "" : query(check.paths)}`);
  const { paths } = check;
  const { claudeJson, sessions, now } = await readBase(paths);
  let snapshots = await listSnapshots(paths.project);
  if (!snapshots.some((s) => s.date === dayKey(now))) {
    // 트렌드 화면으로 바로 들어와도 그날 스냅샷이 남는다
    await saveTodaySnapshot(paths.project, now, snapshotOf(await readTools(paths.claude, paths.project, claudeJson, sessions)));
    snapshots = await listSnapshots(paths.project);
  }
  const today = snapshots.find((s) => s.date === dayKey(now));
  const q = query(paths);
  return (
    <TrendsView
      points={dailyPoints(sessions, snapshots, now, 60)}
      log={changeLog(snapshots)}
      snapshotCount={snapshots.length}
      firstSnapshot={snapshots[0]?.date ?? null}
      savedLabel={today ? `오늘 ${formatTime(today.savedAt)}에 남김` : "오늘 스냅샷을 남기지 못했어요"}
      dashHref={`/${q}`}
      sessionsHref={`/learn/sessions${q}`}
      skillsHref={`/learn/skills${q}`}
    />
  );
}
