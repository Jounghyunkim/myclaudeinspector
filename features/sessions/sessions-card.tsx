import Link from "next/link";

import { InfoCard } from "@/components/info-card";
import { StatusPill } from "@/components/meter";
import { Stat, StatRow } from "@/components/stat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, formatRelative, formatTime, startOfDay } from "@/lib/claude/time";
import { cn } from "@/lib/utils";

import type { SessionsView } from "./sessions";
import { LiveRefresh } from "./live-refresh";
import { Timeline } from "./timeline";

const STATUS = { busy: "작업 중", idle: "대기", done: "끝남" } as const;

function StatusBadge({ s }: { s: keyof typeof STATUS }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-px text-xs font-semibold whitespace-nowrap", s === "busy" && "border-transparent bg-primary/25", s === "done" && "text-muted-foreground")}>
      <i className={cn("size-[7px] rounded-full", s === "busy" ? "animate-pulse bg-primary" : s === "idle" ? "bg-muted-foreground" : "border border-muted-foreground")} />
      {STATUS[s]}
    </span>
  );
}

export function SessionsCard({ view, now, readAt, detailHref, trendHref, className }: { view: SessionsView; now: number; readAt: number; detailHref: string; trendHref: string; className?: string }) {
  const busy = view.live.filter((l) => l.status === "busy").length;
  return (
    <InfoCard
      className={className}
      title="세션"
      description="지금 열려 있는 Claude 세션과 이 프로젝트의 최근 세션 기록"
      detailHref={detailHref}
      trendHref={trendHref}
      help={{
        what: <>세션은 Claude와 나누는 대화 한 묶음이에요. <code>/clear</code>를 하거나 새 창을 열면 새 세션이 시작돼요. 세션을 여러 개 열어 두면 Claude가 동시에 여러 일을 할 수 있어요.</>,
        why: "한 세션에서 주제가 다른 일을 계속하면 컨텍스트가 빨리 차고 답이 흐려져요. 일 하나에 세션 하나, 오래 걸리는 일은 세션을 나눠 동시에 돌리는 게 Claude를 에이전트처럼 쓰는 방법이에요.",
      }}
    >
      <LiveRefresh />
      <StatRow>
        <Stat label="지금 열린 세션" value={view.live.length} note={`작업 중 ${busy} · 대기 ${view.live.length - busy}`} />
        <Stat label="오늘 세션" value={view.todayCount} note="이 프로젝트" />
        <Stat label="이번 주 세션" value={view.weekCount} note={`하루 평균 ${(view.weekCount / 7).toFixed(1)}개`} />
        <Stat label="동시에 돌린 세션" value={view.maxConcurrentToday} unit="개" note="오늘 최대" />
        <Stat label="자동 압축" value={view.compactsThisWeek} unit="회" note="이번 주 · 컨텍스트가 꽉 찬 횟수" />
      </StatRow>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="flex flex-col gap-2.5 rounded-lg border p-3">
          <h3 className="flex items-baseline gap-1.5 text-[1.02em] font-medium">
            지금 열린 세션 <span className="text-xs text-muted-foreground">PC 전체</span>
            <Link href={detailHref} className="ml-auto text-xs whitespace-nowrap text-primary hover:underline">자세히 →</Link>
          </h3>
          {view.live.length === 0 ? (
            <p className="text-sm text-muted-foreground">지금 열려 있는 Claude Code 세션이 없어요.</p>
          ) : (
            <ul className="flex flex-col">
              {view.live.map((l) => (
                <li key={l.sessionId + l.startedAt} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 border-t py-1.5 first:border-t-0">
                  <StatusBadge s={l.status} />
                  <span className="truncate text-[13px] font-semibold" title={l.name}>{l.name}</span>
                  <span className="col-start-2 text-xs text-muted-foreground">
                    {l.folder} · {l.app} · {formatDuration(now - l.startedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <span className="text-xs text-muted-foreground">PC에서 실행 중인 Claude Code 세션이에요. 30초마다 다시 읽어요. 마지막으로 읽은 시각 {formatTime(readAt)}</span>
        </section>
        <section className="flex flex-col gap-2.5 rounded-lg border p-3">
          <h3 className="text-[1.02em] font-medium">
            오늘 타임라인 <span className="text-xs text-muted-foreground">이 프로젝트 · 막대에 올리면 자세히</span>
          </h3>
          <Timeline bars={view.timeline} now={now} dayStart={startOfDay(now)} />
        </section>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-[1.02em] font-medium">최근 세션 <span className="text-xs text-muted-foreground">이 프로젝트</span></h3>
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>세션</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>시작</TableHead>
              <TableHead className="text-right">길이</TableHead>
              <TableHead className="text-right">메시지</TableHead>
              <TableHead>모델</TableHead>
              <TableHead className="text-right">컨텍스트</TableHead>
              <TableHead className="text-right">압축</TableHead>
              <TableHead>브랜치</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.recent.map((r) => (
              <TableRow key={r.id} className={r.ctx > 70 ? "bg-warn/[0.08]" : undefined}>
                <TableCell className="min-w-[180px] font-medium whitespace-normal">{r.name}</TableCell>
                <TableCell><StatusBadge s={r.status} /></TableCell>
                <TableCell className="whitespace-nowrap">{formatRelative(r.start, now)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatDuration(r.length)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.messages}</TableCell>
                <TableCell className="whitespace-nowrap">{prettyModelShort(r.model)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.ctx > 70 ? <StatusPill>{r.ctx}%</StatusPill> : `${r.ctx}%`}</TableCell>
                <TableCell className="text-right tabular-nums">{r.compacts ? `${r.compacts}회` : "–"}</TableCell>
                <TableCell><code className="whitespace-nowrap">{r.branch ?? "–"}</code></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </InfoCard>
  );
}

function prettyModelShort(model: string | null): string {
  if (!model) return "–";
  const m = /claude-(opus|sonnet|haiku|fable)-(\d+)-(\d+)/i.exec(model);
  return m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}` : model;
}
