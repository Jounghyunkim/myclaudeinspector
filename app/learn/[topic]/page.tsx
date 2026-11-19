import { notFound } from "next/navigation";

import { recentContext } from "@/features/context";
import { topicOf, TopicPage, type TopicSlug } from "@/features/learn";
import { buildSessionsView, readLiveSessions } from "@/features/sessions";
import { readTools } from "@/features/tools";
import { compactNumber, planLimits, tokenSeries } from "@/features/usage";
import { formatRelative, formatTime } from "@/lib/claude/time";

import { checkPaths, query, readBase, type Paths } from "../../_data/inspect";

export const dynamic = "force-dynamic";

type Mine = { label: string; value: string; note: string }[];

async function mineFor(slug: TopicSlug, paths: Paths) {
  const { claudeJson, sessions, now } = await readBase(paths);
  const limits = planLimits(claudeJson.limits, now);
  const lim = { fiveHour: limits.state === "ok" ? limits.fiveHour?.pct ?? null : null, sevenDay: limits.state === "ok" ? limits.sevenDay?.pct ?? null : null };
  const readAt = `${formatRelative(now, now)}`;
  let mine: Mine = [];
  if (slug === "usage") {
    const t = tokenSeries(sessions, now).days;
    const io = t[6].input + t[6].output, pio = t[5].input + t[5].output;
    mine = [
      { label: "5시간 한도", value: lim.fiveHour == null ? "값 없음" : `${lim.fiveHour}%`, note: limits.state === "ok" && limits.fiveHour?.resetsAt ? `${formatTime(limits.fiveHour.resetsAt)}에 초기화돼요` : "/usage로 확인할 수 있어요" },
      { label: "주간 한도", value: lim.sevenDay == null ? "값 없음" : `${lim.sevenDay}%`, note: (lim.sevenDay ?? 0) >= 80 ? "80%를 넘었어요. 남은 기간은 아껴 써야 해요" : "아직 여유가 있어요" },
      { label: "오늘 입력 + 출력", value: compactNumber(io), note: pio ? `어제보다 ${Math.round(((io - pio) / pio) * 100)}% ${io >= pio ? "많아요" : "적어요"}` : "어제 기록이 없어요" },
    ];
  } else if (slug === "context") {
    const rows = recentContext(sessions);
    const over = rows.filter((r) => r.pct > 70);
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
    mine = [
      { label: `최근 세션 ${rows.length}개 평균`, value: `${avg}%`, note: avg > 70 ? "정리가 필요해요" : "적정 범위예요" },
      { label: "70% 넘은 세션", value: `${over.length}개`, note: over.map((o) => `${o.name} (${o.pct}%)`).join(", ") || "없어요" },
    ];
  } else if (slug === "sessions") {
    const v = buildSessionsView(sessions, await readLiveSessions(paths.claude), now);
    const busy = v.live.filter((l) => l.status === "busy").length;
    mine = [
      { label: "지금 열린 세션", value: `${v.live.length}개`, note: `작업 중 ${busy}, 대기 ${v.live.length - busy}` },
      { label: "오늘 동시에 돌린 세션", value: `최대 ${v.maxConcurrentToday}개`, note: v.maxConcurrentToday >= 2 ? "여러 일을 한 번에 맡겼어요" : "세션을 나눠 동시에 맡겨 보세요" },
      { label: "이번 주 자동 압축", value: `${v.compactsThisWeek}회`, note: "책상이 꽉 차서 Claude가 스스로 요약한 횟수예요" },
    ];
  } else {
    const tools = await readTools(paths.claude, paths.project, claudeJson, sessions);
    if (slug === "cli") {
      const missing = tools.cli.filter((c) => !c.version).map((c) => c.name);
      mine = [{ label: "설치된 CLI", value: `${tools.cli.length - missing.length} / ${tools.cli.length}`, note: missing.length ? `${missing.join(", ")}가 없어요` : "모두 설치돼 있어요" }];
    } else if (slug === "mcp") {
      mine = [{ label: "로컬에 설정한 MCP 서버", value: `${tools.mcp.length}개`, note: tools.mcp.map((m) => `${m.name} (${m.where})`).join(", ") || "아직 없어요" }];
    } else if (slug === "skills") {
      const top = tools.skills[0];
      mine = [
        { label: "설치된 Skill", value: `${tools.skills.length}개`, note: `그중 ${tools.skills.filter((s) => s.uses === 0).length}개는 아직 안 썼어요` },
        { label: "가장 많이 쓴 Skill", value: top && top.uses ? top.name : "–", note: top && top.uses ? `${top.uses}회` : "아직 쓴 Skill이 없어요" },
      ];
    } else if (slug === "claudemd") {
      const total = tools.claudeMd.reduce((n, f) => n + f.lines, 0);
      const longest = tools.claudeMd[0];
      mine = [
        { label: "CLAUDE.md 합계", value: `${total}줄`, note: `파일 ${tools.claudeMd.length}개, ${total > 200 ? "길어요. Skill로 옮길 절차가 있는지 보세요" : "적당한 길이예요"}` },
        { label: "가장 긴 파일", value: longest?.name ?? "–", note: longest ? `${longest.lines}줄${longest.importedBy ? `, ${longest.importedBy}가 @로 불러와요` : ""}` : "CLAUDE.md가 없어요" },
      ];
    } else {
      const notes = tools.memory.filter((m) => m.name !== "MEMORY.md");
      const kinds = Object.entries(notes.reduce<Record<string, number>>((a, m) => ((a[m.kind] = (a[m.kind] ?? 0) + 1), a), {}));
      mine = [{ label: "이 프로젝트의 메모", value: `${notes.length}개`, note: kinds.map(([k, n]) => `${k} ${n}`).join(", ") || "아직 없어요" }];
    }
  }
  return { mine, readAt, lim };
}

export default async function LearnTopic({ params, searchParams }: PageProps<"/learn/[topic]">) {
  const { topic: slug } = await params;
  const topic = topicOf(slug);
  if (!topic) notFound();
  const check = await checkPaths(await searchParams);
  if (check.state !== "ok") {
    return (
      <TopicPage
        topic={topic}
        query={check.state === "empty" ? "" : query(check.paths)}
        readAt="아직 불러오지 않았어요"
        mine={[{ label: "내 상태", value: "–", note: "대시보드에서 경로를 넣고 불러오면 내 값이 여기에 보여요." }]}
      />
    );
  }
  const { mine, readAt, lim } = await mineFor(topic.slug, check.paths);
  return <TopicPage topic={topic} query={query(check.paths)} mine={mine} readAt={readAt} limits={lim} />;
}
