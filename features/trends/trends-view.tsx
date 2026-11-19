"use client";

import Link from "next/link";
import { useState } from "react";

import { ColumnChart, Legend, LineChart, type Datum } from "@/components/charts";
import { InfoCard } from "@/components/info-card";
import { Stat, StatRow } from "@/components/stat";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { ChangeLogItem, DayPoint } from "./trends";

const md = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()}`; };
const mdK = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
const dateK = (key: string) => { const [, m, d] = key.split("-").map(Number); return `${m}월 ${d}일`; };
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const sign = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v);

function Sparkline({ values }: { values: (number | null)[] }) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (!pts.length) return <div className="h-[34px]" />;
  const w = 160, h = 34;
  const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
  const x = (i: number) => 2 + ((w - 4) * i) / Math.max(1, values.length - 1);
  const y = (v: number) => (hi === lo ? h / 2 : 3 + (h - 6) * (1 - (v - lo) / (hi - lo)));
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <path d={pts.map((p, k) => `${k ? "L" : "M"}${x(p[0])},${y(p[1])}`).join("")} fill="none" stroke="var(--s1)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={x(last[0])} cy={y(last[1])} r={3} fill="var(--s1)" />
    </svg>
  );
}

const TILES = [
  ["cli", "CLI 설치", "개"],
  ["mcp", "MCP 서버", "개"],
  ["skills", "Skill 설치", "개"],
  ["used", "한 번이라도 쓴 Skill", "개"],
  ["md", "CLAUDE.md", "줄"],
  ["mem", "Memory 메모", "개"],
] as const;

export function TrendsView({ points, log, snapshotCount, firstSnapshot, savedLabel, dashHref, sessionsHref, skillsHref }: {
  points: DayPoint[];
  log: ChangeLogItem[];
  snapshotCount: number;
  firstSnapshot: string | null;
  savedLabel: string;
  dashHref: string;
  sessionsHref: string;
  skillsHref: string;
}) {
  const [n, setN] = useState<14 | 30>(14);
  const cur = points.slice(-n);
  const prev = points.slice(-2 * n, -n);
  const hasPrev = prev.some((p) => p.sessions > 0);
  const labelEvery = n > 14 ? 7 : 3;
  const sess = sum(cur.map((p) => p.sessions)), psess = sum(prev.map((p) => p.sessions));
  const avg = sess / n, pavg = psess / n;
  const rat = sess ? Math.round((sum(cur.map((p) => p.over)) / sess) * 100) : 0;
  const prat = psess ? Math.round((sum(prev.map((p) => p.over)) / psess) * 100) : 0;
  const multi = cur.filter((p) => p.conc >= 2).length, pmulti = prev.filter((p) => p.conc >= 2).length;
  const note = hasPrev ? `앞 ${n}일보다` : "앞 기간 기록 없음";
  const roll = (idx: number) => {
    const win = points.slice(Math.max(0, idx - 6), idx + 1);
    const s = sum(win.map((p) => p.sessions));
    return s ? Math.round((sum(win.map((p) => p.over)) / s) * 100) : null;
  };
  const offset = points.length - n;
  const ratioData: Datum[] = cur.map((p, i) => ({
    label: i === cur.length - 1 ? "오늘" : md(p.at),
    title: mdK(p.at),
    values: { roll: roll(offset + i), day: p.sessions ? Math.round((p.over / p.sessions) * 100) : null },
  }));
  const col = (k: "sessions" | "conc" | "skillUses"): Datum[] => cur.map((p, i) => ({ label: i === cur.length - 1 ? "오늘" : md(p.at), title: mdK(p.at), values: { v: p[k] } }));
  const toolPts = cur.filter((p) => p.tools);
  const logInRange = log.filter((l) => l.date >= cur[0].key);

  return (
    <div className="flex flex-col gap-4">
      <Link href={dashHref} className="self-start px-2 text-[13px] text-primary hover:underline">← 대시보드로</Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-[1.3em] font-semibold">트렌드</h1>
          <p className="text-[15px] leading-loose">하루에 한 번 남기는 스냅샷으로 세션과 도구가 어떻게 바뀌어 왔는지 봐요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full border px-2 py-px text-xs">
            스냅샷 {snapshotCount}개{firstSnapshot ? ` · ${dateK(firstSnapshot)}부터` : ""} · {savedLabel}
          </span>
          <Tabs value={String(n)} onValueChange={(v) => setN(Number(v) as 14 | 30)}>
            <TabsList>
              <TabsTrigger value="14">최근 14일</TabsTrigger>
              <TabsTrigger value="30">최근 30일</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <InfoCard
        title="세션 트렌드"
        description="이 프로젝트의 대화 기록으로 계산해요. 스냅샷을 남기기 전 날짜도 볼 수 있어요."
        detailHref={sessionsHref}
        help={{
          what: "날마다 세션을 몇 개 열었는지, 컨텍스트가 70%를 넘을 때까지 끌고 간 세션이 얼마나 되는지, 동시에 몇 개를 돌렸는지 보여 줘요. 위쪽 숫자는 고른 기간을 바로 앞 같은 길이의 기간과 비교한 거예요.",
          why: "70% 넘은 세션 비율이 줄고 동시에 돌린 세션이 늘면, 일을 잘게 나눠 맡기고 세션을 제때 정리하고 있다는 뜻이에요.",
        }}
      >
        <StatRow>
          <Stat label="세션" value={sess} unit="개" note={`하루 평균 ${avg.toFixed(1)}개`} />
          <Stat label="하루 평균 세션" value={avg.toFixed(1)} unit="개" note={hasPrev ? <><b>{sign(+(avg - pavg).toFixed(1))}</b> {note}</> : note} />
          <Stat label="70% 넘은 세션 비율" value={rat} unit="%" note={hasPrev ? <><b>{sign(rat - prat)}%p</b> {note} · 낮을수록 좋아요</> : `${note} · 낮을수록 좋아요`} />
          <Stat label="2개 이상 동시에 돌린 날" value={multi} unit="일" note={hasPrev ? <><b>{sign(multi - pmulti)}일</b> {note}</> : note} />
          <Stat label="최대 동시 세션" value={Math.max(0, ...cur.map((p) => p.conc))} unit="개" note="기간 중 가장 많을 때" />
        </StatRow>
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="flex flex-col gap-1.5">
            <h3 className="text-[1.02em] font-medium">하루 세션 수</h3>
            <ColumnChart data={col("sessions")} series={[{ key: "v", name: "세션", color: "var(--s1)" }]} fmt={(v) => String(Math.round(v))} height={220} labelEvery={labelEvery} ariaLabel="하루 세션 수 막대 차트" />
          </section>
          <section className="flex flex-col gap-1.5">
            <h3 className="text-[1.02em] font-medium">70% 넘은 세션 비율 <span className="text-xs text-muted-foreground">낮을수록 좋아요</span></h3>
            <LineChart
              data={ratioData}
              lineKey="roll"
              dotKey="day"
              color="var(--s2)"
              fmt={(v) => `${Math.round(v)}%`}
              labelEvery={labelEvery}
              ariaLabel="70% 넘은 세션 비율 선 차트"
              rows={(d) => [
                { name: "그날", value: d.values.day == null ? "세션 없음" : `${d.values.day}%`, color: "var(--s2)" },
                { name: "최근 7일", value: d.values.roll == null ? "–" : `${d.values.roll}%` },
              ]}
            />
            <Legend items={[{ name: "최근 7일 비율", color: "var(--s2)", shape: "line" }, { name: "그날 비율", color: "var(--s2)", shape: "dot" }]} />
          </section>
          <section className="flex flex-col gap-1.5">
            <h3 className="text-[1.02em] font-medium">하루 최대 동시 세션</h3>
            <ColumnChart data={col("conc")} series={[{ key: "v", name: "최대 동시 세션", color: "var(--s3)" }]} fmt={(v) => String(Math.round(v))} height={220} labelEvery={labelEvery} ariaLabel="하루 최대 동시 세션 막대 차트" />
          </section>
        </div>
      </InfoCard>

      <InfoCard
        title="도구 트렌드"
        description="매일 남긴 스냅샷끼리 비교해요. 스냅샷을 남기기 시작한 날부터 볼 수 있어요."
        detailHref={skillsHref}
        help={{
          what: "CLI, MCP, Skill, CLAUDE.md, Memory가 날짜별로 어떻게 바뀌었는지 보여 줘요. 언제 무엇이 추가되거나 빠졌는지는 아래 변화 기록에 남아요.",
          why: "설치만 하고 안 쓰는 Skill이 늘거나 CLAUDE.md가 계속 길어지면 정리할 때예요. 쓴 Skill 수가 늘면 Claude에게 맡기는 방식이 넓어지고 있다는 뜻이에요.",
        }}
      >
        {snapshotCount < 2 ? (
          <Empty className="rounded-lg border">
            <EmptyHeader>
              <EmptyTitle>아직 비교할 스냅샷이 없어요</EmptyTitle>
              <EmptyDescription>오늘 첫 스냅샷을 남겼어요. 내일 이 화면을 다시 열면 오늘과 비교한 변화가 보이기 시작해요.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {TILES.map(([k, label, unit]) => {
                const vals = cur.map((p) => p.tools?.[k] ?? null);
                const first = toolPts[0]?.tools?.[k];
                const last = toolPts[toolPts.length - 1]?.tools?.[k];
                const d = first != null && last != null ? last - first : 0;
                return (
                  <div key={k} className="flex min-w-0 flex-col gap-1 rounded-lg border bg-background px-3 py-2.5" aria-label={`${label} ${last ?? "–"}${unit}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs whitespace-nowrap">{d ? <b>{sign(d)}{unit}</b> : <span className="text-muted-foreground">변화 없음</span>}</span>
                    </div>
                    <span className="font-heading text-[26px] leading-tight font-semibold tracking-normal">{last ?? "–"}<small className="ml-0.5 text-[0.45em] text-muted-foreground">{unit}</small></span>
                    <Sparkline values={vals} />
                    <span className="text-xs text-muted-foreground">{toolPts[0] ? `${mdK(toolPts[0].at)} 대비` : ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <section className="flex flex-col gap-1.5">
                <h3 className="text-[1.02em] font-medium">하루 Skill 사용 횟수</h3>
                <ColumnChart data={col("skillUses")} series={[{ key: "v", name: "Skill 사용", color: "var(--s1)" }]} fmt={(v) => String(Math.round(v))} height={220} labelEvery={labelEvery} ariaLabel="하루 Skill 사용 횟수 막대 차트" />
              </section>
              <section className="flex flex-col gap-1.5">
                <h3 className="text-[1.02em] font-medium">변화 기록 <span className="text-xs text-muted-foreground">스냅샷 비교</span></h3>
                <ol className="flex flex-col">
                  {logInRange.length ? (
                    logInRange.map((l, i) => (
                      <li key={i} className="grid grid-cols-[64px_auto_minmax(0,1fr)] items-center gap-2 border-t py-1.5 first:border-t-0">
                        <span className="text-xs whitespace-nowrap text-muted-foreground">{l.date === points[points.length - 1].key ? "오늘" : dateK(l.date)}</span>
                        <Badge variant="secondary">{l.kind}</Badge>
                        <span className="text-[13px]">{l.text}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-muted-foreground">이 기간에는 바뀐 것이 없어요.</li>
                  )}
                </ol>
              </section>
            </div>
          </div>
        )}
      </InfoCard>

      <InfoCard title="스냅샷 기록" description="날짜별로 남긴 값이에요. 파일은 이 앱의 폴더에만 저장되고 PC 밖으로 나가지 않아요.">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              {["날짜", "세션", "70% 넘음", "동시 최대", "CLI", "MCP", "Skill 설치", "Skill 씀", "CLAUDE.md", "Memory"].map((h, i) => (
                <TableHead key={h} className={i ? "text-right" : undefined}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...cur].reverse().map((p, i) => (
              <TableRow key={p.key}>
                <TableCell className="whitespace-nowrap">{i === 0 ? `오늘 (${md(p.at)})` : mdK(p.at)}</TableCell>
                {[p.sessions, p.over, p.conc, p.tools?.cli, p.tools?.mcp, p.tools?.skills, p.tools?.used, p.tools?.md, p.tools?.mem].map((v, j) => (
                  <TableCell key={j} className="text-right tabular-nums">{v ?? "–"}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <span className="text-xs text-muted-foreground">저장 위치 <code>~/.my-claude-inspector/snapshots/</code> · 하루 한 번, 그날 처음 불러올 때 남기고 같은 날 다시 불러오면 새 값으로 바꿔요.</span>
      </InfoCard>
    </div>
  );
}
