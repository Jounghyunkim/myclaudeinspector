import Link from "next/link";
import { TrophyIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_METRIC,
  DEFAULT_PERIOD,
  METRICS,
  PERIODS,
  RankingStoreError,
  compare,
  findMetric,
  formatMetric,
  parsePeriod,
  periodStats,
  rankBy,
  type ParticipantStats,
} from "@/features/ranking";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Claude 사용 랭킹 — My Claude Inspector" };

type Search = { metric?: string; period?: string; me?: string; vs?: string };

function href(current: Search, patch: Partial<Search>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
  return `/ranking?${params}`;
}

export default async function RankingPage({ searchParams }: PageProps<"/ranking">) {
  const raw = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const search: Search = { metric: one(raw.metric), period: one(raw.period), me: one(raw.me), vs: one(raw.vs) };
  // signed in: compare against my own nickname unless another one was asked for
  const myName = await myDisplayName();
  if (!search.me && myName) search.me = myName;
  const metric = findMetric(search.metric) ?? findMetric(DEFAULT_METRIC)!;
  const period = parsePeriod(search.period, DEFAULT_PERIOD);

  let stats: ParticipantStats[] = [];
  let error: string | null = null;
  try {
    stats = await periodStats(period);
  } catch (err) {
    error = err instanceof RankingStoreError ? err.message : "랭킹을 불러오지 못했습니다.";
  }

  const ranking = rankBy(stats, metric);
  const compared = search.me ? [search.me, ...(search.vs ? [search.vs] : [])] : [];
  const comparison = compared.length ? compare(stats, compared) : [];
  const groups = [...new Set(METRICS.map((m) => m.group))];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Claude 사용 랭킹</h1>
          <p className="text-sm text-muted-foreground">
            교육생들이 보낸 하루 단위 사용량(숫자만)으로 순위를 매기고 서로 비교합니다.
          </p>
        </div>
        <nav aria-label="기간" className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={href(search, { period: String(p.days) })}
              aria-current={p.days === period ? "page" : undefined}
              className={buttonVariants({ size: "sm", variant: p.days === period ? "default" : "outline" })}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>랭킹을 불러오지 못했습니다</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <nav aria-label="지표" className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group} className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-xs text-muted-foreground">{group}</span>
            {METRICS.filter((m) => m.group === group).map((m) => (
              <Link
                key={m.key}
                href={href(search, { metric: m.key })}
                aria-current={m.key === metric.key ? "page" : undefined}
                className={buttonVariants({ size: "xs", variant: m.key === metric.key ? "default" : "outline" })}
              >
                {m.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{metric.label} 순위</CardTitle>
            <CardDescription>
              {metric.description} {metric.better === "low" ? "낮을수록 순위가 높습니다." : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <TrophyIcon />
                  </EmptyMedia>
                  <EmptyTitle>이 기간에 보낸 기록이 없어요</EmptyTitle>
                  <EmptyDescription>
                    로그인한 뒤 <Link href="/settings" className="underline underline-offset-4">설정</Link>에서 전송 토큰을 받아 내 PC에서 <code>bun run ranking:submit</code>을 실행하면 첫 기록이 올라갑니다.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">순위</TableHead>
                      <TableHead>닉네임</TableHead>
                      <TableHead className="text-right">{metric.label}</TableHead>
                      <TableHead className="text-right">상위</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((r) => (
                      <TableRow key={r.nickname} data-state={compared.includes(r.nickname) ? "selected" : undefined}>
                        <TableCell className="font-medium tabular-nums">{r.rank}</TableCell>
                        <TableCell>
                          <Link href={href(search, { me: r.nickname })} className="underline-offset-4 hover:underline">
                            {r.nickname}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMetric(r.value, metric.unit)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {Math.round((r.rank / ranking.length) * 100)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>비교</CardTitle>
            <CardDescription>내 닉네임을 넣으면 모든 지표의 순위와 평균을 함께 봅니다. 상대를 넣으면 둘을 나란히 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form action="/ranking" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="metric" value={metric.key} />
              <input type="hidden" name="period" value={String(period)} />
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="me">내 닉네임</Label>
                <Input id="me" name="me" defaultValue={search.me} required />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="vs">비교할 닉네임 (선택)</Label>
                <Input id="vs" name="vs" defaultValue={search.vs} />
              </div>
              <Button type="submit">비교하기</Button>
            </form>

            {compared.length > 0 && (
              <ComparisonTable names={compared} rows={comparison} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function myDisplayName(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
  return profile?.display_name?.trim() || null;
}

function ComparisonTable({ names, rows }: { names: string[]; rows: ReturnType<typeof compare> }) {
  const missing = names.filter((n) => !rows.some((r) => r.values.some((v) => v.nickname === n)));
  return (
    <div className="flex flex-col gap-3">
      {missing.length > 0 && (
        <Alert>
          <AlertTitle>이 기간에 기록이 없는 닉네임</AlertTitle>
          <AlertDescription>{missing.join(", ")} — 기간을 늘리거나 기록을 먼저 보내세요.</AlertDescription>
        </Alert>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>지표</TableHead>
              {names.map((n) => (
                <TableHead key={n} className="text-right">
                  {n}
                </TableHead>
              ))}
              <TableHead className="text-right">평균</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ metric, average, participants, values }) => (
              <TableRow key={metric.key}>
                <TableCell>{metric.label}</TableCell>
                {names.map((n) => {
                  const v = values.find((x) => x.nickname === n);
                  return (
                    <TableCell key={n} className="text-right tabular-nums">
                      {v ? (
                        <span className="inline-flex items-center justify-end gap-2">
                          {formatMetric(v.value, metric.unit)}
                          <Badge variant={v.rank === 1 ? "default" : "secondary"}>
                            {v.rank}/{participants}위
                          </Badge>
                        </span>
                      ) : (
                        "–"
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatMetric(average, metric.unit)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
