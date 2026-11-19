import { Legend } from "@/components/charts";
import { InfoCard } from "@/components/info-card";
import { Meter, StatusPill } from "@/components/meter";
import { Stat } from "@/components/stat";
import { formatRelative } from "@/lib/claude/time";

import { CONTEXT_LIMIT, type ContextRow } from "./context";

export function ContextCard({ rows, now, detailHref, className }: { rows: ContextRow[]; now: number; detailHref: string; className?: string }) {
  const over = rows.filter((r) => r.pct > CONTEXT_LIMIT).length;
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
  return (
    <InfoCard
      className={className}
      title="컨텍스트 윈도"
      description={`이 프로젝트의 최근 세션 ${rows.length}개 · 세션별 사용률`}
      detailHref={detailHref}
      help={{
        what: "Claude가 답 하나를 만들 때 함께 읽는 범위예요. 대화, 읽은 파일, 명령 결과가 모두 여기에 쌓여요.",
        why: "70%를 넘으면 앞부분 내용을 놓치기 쉬워요. 다른 일로 넘어갈 때는 /clear로 새로 시작하고, 같은 일이면 /compact로 줄여요. 막대 위의 세로 눈금이 적정선인 70%예요.",
      }}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">이 프로젝트에서 연 세션이 아직 없어요.</p>
      ) : (
        <>
          <div className="flex gap-8">
            <Stat label={`${CONTEXT_LIMIT}% 넘은 세션`} value={over} unit="개" />
            <Stat label={`${rows.length}개 평균`} value={avg} unit="%" />
          </div>
          <ul className="flex flex-col gap-3">
            {rows.map((r) => {
              const isOver = r.pct > CONTEXT_LIMIT;
              return (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_52px] items-center gap-x-3 gap-y-1">
                  <span className="truncate text-[13px]" title={r.name}>{r.name}</span>
                  <span className="row-span-2 text-right text-sm font-bold tabular-nums tracking-normal">{r.pct}%</span>
                  <Meter size="sm" value={r.pct} tick={CONTEXT_LIMIT} high={isOver} label={`${r.name} 컨텍스트 ${r.pct}%`} />
                  <span className="col-span-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {r.model} · {formatRelative(r.lastAt, now)}
                    {isOver ? <StatusPill>{CONTEXT_LIMIT}% 넘음</StatusPill> : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <Legend items={[{ name: "적정", color: "var(--primary)" }, { name: `${CONTEXT_LIMIT}% 넘음`, color: "var(--warn)" }, { name: `적정선 ${CONTEXT_LIMIT}%`, color: "", shape: "tick" }]} />
        </>
      )}
    </InfoCard>
  );
}
