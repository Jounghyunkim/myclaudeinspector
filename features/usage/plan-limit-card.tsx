import { InfoCard } from "@/components/info-card";
import { Meter, StatusPill } from "@/components/meter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate, formatDuration, formatRelative, formatTime } from "@/lib/claude";

import type { LiveIssue } from "@/lib/claude";

import { HIGH_LIMIT, type LimitView, type PlanLimits } from "./usage";

const ISSUE_TEXT: Record<LiveIssue, string> = {
  "no-login": "Claude Code CLI 로그인 정보를 찾지 못해 실시간 값을 받아 오지 못했어요.",
  expired: "Claude Code CLI 로그인이 만료돼 실시간 값을 받아 오지 못했어요. 터미널에서 claude를 한 번 실행하면 로그인이 갱신돼요.",
  failed: "사용량 서버에 연결하지 못해 실시간 값을 받아 오지 못했어요. 잠시 뒤 새로고침해 보세요.",
};

function LiveIssueNote({ issue }: { issue: LiveIssue }) {
  return (
    <Alert>
      <AlertTitle>마지막으로 저장된 값을 보여 주고 있어요</AlertTitle>
      <AlertDescription>{ISSUE_TEXT[issue]}</AlertDescription>
    </Alert>
  );
}

function Row({ name, v, now, longReset }: { name: string; v: LimitView; now: number; longReset: boolean }) {
  const high = v.pct >= HIGH_LIMIT;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {name} {high ? <StatusPill>{HIGH_LIMIT}% 넘음</StatusPill> : null}
          </span>
          <span className="font-heading text-[40px] leading-none font-bold tracking-normal">
            {v.pct}
            <small className="ml-0.5 text-[0.45em] text-muted-foreground">%</small>
          </span>
        </div>
        {v.resetsAt ? (
          <div className="flex flex-col items-end text-right">
            <span className="text-xs text-muted-foreground">초기화까지</span>
            <span className="text-[13px]">
              <b>{v.expired ? "지남" : formatDuration(v.resetsAt - now)}</b> · {longReset ? `${formatDate(v.resetsAt)} ${formatTime(v.resetsAt)}` : formatTime(v.resetsAt)}
            </span>
          </div>
        ) : null}
      </div>
      <Meter value={v.pct} tick={HIGH_LIMIT} high={high} label={`${name} 사용률 ${v.pct}%`} />
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums" aria-hidden>
        <span>0%</span>
        <span className="relative left-[30%]">{HIGH_LIMIT}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

export function PlanLimitCard({ limits, now, detailHref, className }: { limits: PlanLimits; now: number; detailHref: string; className?: string }) {
  return (
    <InfoCard
      className={className}
      title="플랜 한도 사용률"
      description="이 값이 100%가 되면 초기화 시각까지 작업이 멈춰요"
      detailHref={detailHref}
      help={{
        what: "Claude 구독 플랜에는 5시간 동안 쓸 수 있는 양과 일주일 동안 쓸 수 있는 양이 따로 있어요. 막대는 그중 얼마나 썼는지예요.",
        why: "둘 중 하나라도 100%가 되면 초기화될 때까지 Claude에게 일을 맡길 수 없어요. 80%를 넘으면 가벼운 모델로 바꾸는 것이 좋아요.",
      }}
    >
      {limits.state === "none" ? (
        <Alert>
          <AlertTitle>한도 사용률을 아직 알 수 없어요</AlertTitle>
          <AlertDescription>
            {limits.liveIssue ? `${ISSUE_TEXT[limits.liveIssue]} ` : null}
            Claude Code를 한 번 실행하거나 <code>/usage</code>를 입력하면 값이 저장되고, 여기서 보여 줄 수 있어요. 아래 토큰 수는 대화 기록으로 계산해서 그대로 볼 수 있어요.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {limits.liveIssue ? <LiveIssueNote issue={limits.liveIssue} /> : null}
          {limits.fiveHour ? <Row name="5시간 한도" v={limits.fiveHour} now={now} longReset={false} /> : null}
          {limits.sevenDay ? <Row name="주간 한도" v={limits.sevenDay} now={now} longReset /> : null}
          <p className="text-xs text-muted-foreground">
            {limits.source === "live" ? "사용량 서버에서 받아 온 값이에요" : "Claude가 마지막으로 받아 둔 값이에요"}
            {limits.fetchedAt ? ` (${formatRelative(limits.fetchedAt, now)} 기준)` : ""}. 정확한 값은 Claude Code에서 <code>/usage</code>로 확인하세요.
          </p>
        </>
      )}
    </InfoCard>
  );
}
