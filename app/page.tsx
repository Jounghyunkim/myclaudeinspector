import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ContextCard, recentContext } from "@/features/context";
import { recommend, RecommendationCard } from "@/features/recommendation";
import { buildSessionsView, readLiveSessions, SessionsCard } from "@/features/sessions";
import { readTools, ToolsCard } from "@/features/tools";
import { saveTodaySnapshot } from "@/features/trends";
import { PlanLimitCard, planLimits, TokenCountCard, tokenSeries } from "@/features/usage";
import { formatDate, formatRelative, formatTime } from "@/lib/claude/time";
import { isDesktop } from "@/lib/desktop";

import { DesktopStatus } from "@/components/desktop-status";

import { PathForm } from "./_components/path-form";
import { checkPaths, query, readBase, snapshotOf } from "./_data/inspect";

export const dynamic = "force-dynamic";

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h1 className="font-heading text-[1.3em] font-semibold">My Claude Inspector</h1>
        <p className="mt-0.5 text-[13px] leading-loose text-muted-foreground">
          내 Claude가 지금 어떤 상태인지 한눈에 보고, 더 잘 쓰는 방법을 추천받아요. 파일은 읽기만 하고 PC 밖으로 보내지 않아요.
        </p>
      </div>
      {children}
    </div>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const check = await checkPaths(await searchParams);
  if (check.state !== "ok") {
    return (
      <>
        <div className="grid items-center gap-4 xl:grid-cols-[5fr_7fr]">
          <Header />
          <PathForm check={check} />
        </div>
        {check.state === "error" ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>{check.bad === "project" ? "프로젝트 폴더를 읽지 못했어요" : "Claude 설치 폴더를 읽지 못했어요"}</AlertTitle>
            <AlertDescription>
              <code>{check.bad === "project" ? check.paths.project : check.paths.claude}</code> {check.message}
            </AlertDescription>
          </Alert>
        ) : (
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyTitle>아직 불러온 정보가 없어요</EmptyTitle>
              <EmptyDescription>
                위에 Claude 설치 경로(보통 그대로 두면 돼요)와 살펴볼 프로젝트 폴더 경로를 넣고 <b>불러오기</b>를 누르세요. 토큰 사용량, 컨텍스트, 세션, 도구 현황과 오늘의 추천이 여기에 나타나요.
              </EmptyDescription>
            </EmptyHeader>
            {isDesktop() ? null : (
              <Link href="/download" className={buttonVariants({ variant: "outline", size: "sm" })}>
                내 PC에서 쓰려면 데스크톱 앱 다운로드 →
              </Link>
            )}
          </Empty>
        )}
      </>
    );
  }

  const { paths } = check;
  const { claudeJson, sessions, now } = await readBase(paths);
  const [live, tools] = await Promise.all([readLiveSessions(paths.claude), readTools(paths.claude, paths.project, claudeJson, sessions)]);
  const limits = planLimits(claudeJson.limits, now);
  const tokens = tokenSeries(sessions, now);
  const contexts = recentContext(sessions);
  const sessionsView = buildSessionsView(sessions, live, now);
  const snapshot = await saveTodaySnapshot(paths.project, now, snapshotOf(tools));
  const q = query(paths);
  const learn = (topic: string) => `/learn/${topic}${q}`;
  const rec = recommend({
    limits:
      limits.state === "ok"
        ? [
            ...(limits.fiveHour ? [{ name: "5시간 한도", pct: limits.fiveHour.pct, resetsLabel: limits.fiveHour.resetsAt ? formatTime(limits.fiveHour.resetsAt) + "에" : null }] : []),
            ...(limits.sevenDay ? [{ name: "주간 한도", pct: limits.sevenDay.pct, resetsLabel: limits.sevenDay.resetsAt ? `${formatDate(limits.sevenDay.resetsAt)} ${formatTime(limits.sevenDay.resetsAt)}에` : null }] : []),
          ]
        : [],
    contexts,
    unusedSkills: tools.skills.filter((s) => s.uses === 0).map((s) => ({ name: s.name, description: s.description })),
    claudeMdLines: tools.claudeMd.reduce((n, f) => n + f.lines, 0),
  });

  return (
    <>
      <div className="grid items-center gap-4 xl:grid-cols-[5fr_7fr]">
        <Header>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border px-2 py-px text-xs">
              마지막 불러오기 {formatRelative(now, now).replace("오늘 ", "")}
              {snapshot.saved ? " · 오늘 스냅샷 남김" : " · 스냅샷을 남기지 못했어요"}
            </span>
            {isDesktop() ? (
              <DesktopStatus />
            ) : (
              <Link href={`/trends${q}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                트렌드 보기 →
              </Link>
            )}
          </div>
        </Header>
        <PathForm check={check} />
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <RecommendationCard rec={rec} className="xl:col-span-4" />
        <PlanLimitCard limits={limits} now={now} detailHref={learn("usage")} className="xl:col-span-4" />
        <ContextCard rows={contexts} now={now} detailHref={learn("context")} className="xl:col-span-4" />
        <TokenCountCard days={tokens.days} weeks={tokens.weeks} detailHref={learn("usage")} className="xl:col-span-12 wide:col-span-5" />
        <SessionsCard view={sessionsView} now={now} readAt={now} detailHref={learn("sessions")} trendHref={`/trends${q}`} className="xl:col-span-12 wide:col-span-7" />
        <ToolsCard
          tools={tools}
          className="xl:col-span-12"
          links={{ cli: learn("cli"), skills: learn("skills"), mcp: learn("mcp"), claudemd: learn("claudemd"), memory: learn("memory"), trends: `/trends${q}` }}
        />
      </div>
    </>
  );
}
