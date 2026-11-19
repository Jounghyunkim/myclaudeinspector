"use client";

import { useState } from "react";

import { ColumnChart, Legend, type Series } from "@/components/charts";
import { InfoCard } from "@/components/info-card";
import { Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { compactNumber, type TokenBucket } from "./usage";

const SERIES: Series[] = [
  { key: "input", name: "입력", color: "var(--s1)" },
  { key: "output", name: "출력", color: "var(--s2)" },
  { key: "cacheWrite", name: "캐시 쓰기", color: "var(--s3)" },
];

export function TokenCountCard({ days, weeks, detailHref, className }: { days: TokenBucket[]; weeks: TokenBucket[]; detailHref: string; className?: string }) {
  const [range, setRange] = useState<"day" | "week">("day");
  const [table, setTable] = useState(false);
  const rows = range === "day" ? days : weeks;
  const cur = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const io = cur.input + cur.output, pio = prev.input + prev.output;
  const delta = pio ? Math.round(((io - pio) / pio) * 100) : null;
  const unit = range === "day" ? "오늘" : "이번 주";
  return (
    <InfoCard
      className={className}
      title="토큰 수"
      description="대화 기록에 남은 토큰을 더한 값"
      detailHref={detailHref}
      actions={
        <Tabs value={range} onValueChange={(v) => setRange(v as "day" | "week")}>
          <TabsList>
            <TabsTrigger value="day">최근 7일</TabsTrigger>
            <TabsTrigger value="week">최근 4주</TabsTrigger>
          </TabsList>
        </Tabs>
      }
      help={{
        what: "토큰은 Claude가 글을 읽고 쓰는 단위예요. 입력은 내가 보낸 말과 파일, 출력은 Claude가 쓴 답, 캐시 쓰기는 다시 읽으려고 저장해 둔 내용이에요.",
        why: "토큰을 많이 쓸수록 플랜 한도가 빨리 줄어요. 어느 날 갑자기 늘었다면 큰 파일을 읽었거나 세션이 너무 길어진 거예요.",
      }}
    >
      <div className="grid flex-1 gap-5 [grid-template-columns:minmax(0,1fr)] xl:[grid-template-rows:1fr_auto]">
        <div className="flex min-h-0 flex-col gap-2">
          <Legend items={SERIES.map((s) => ({ name: s.name, color: s.color }))} />
          <ColumnChart
            className="min-h-[240px] flex-1 xl:max-h-[620px]"
            height="fill"
            data={rows.map((b) => ({ label: b.label, title: range === "day" ? (b.label === "오늘" ? "오늘" : b.label) : b.label, values: { input: b.input, output: b.output, cacheWrite: b.cacheWrite } }))}
            series={SERIES}
            fmt={compactNumber}
            ariaLabel={`${range === "day" ? "최근 7일" : "최근 4주"} 토큰 수 막대 차트`}
          />
          <Button variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={() => setTable((v) => !v)} aria-expanded={table}>
            {table ? "표 닫기" : "표로 보기"}
          </Button>
          {table ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{range === "day" ? "날짜" : "주"}</TableHead>
                  <TableHead className="text-right">입력</TableHead>
                  <TableHead className="text-right">출력</TableHead>
                  <TableHead className="text-right">캐시 쓰기</TableHead>
                  <TableHead className="text-right">캐시 읽기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.key}>
                    <TableCell>{b.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{compactNumber(b.input)}</TableCell>
                    <TableCell className="text-right tabular-nums">{compactNumber(b.output)}</TableCell>
                    <TableCell className="text-right tabular-nums">{compactNumber(b.cacheWrite)}</TableCell>
                    <TableCell className="text-right tabular-nums">{compactNumber(b.cacheRead)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </div>
        <div className={cn("flex flex-wrap gap-6 border-t pt-2")}>
          <Stat
            label={`${unit} 입력 + 출력`}
            value={compactNumber(io)}
            note={delta == null ? "비교할 값이 없어요" : <><b>{delta >= 0 ? "+" : ""}{delta}%</b> {range === "day" ? "어제보다" : "지난주보다"}</>}
          />
          <Stat label={`${unit} 캐시 쓰기`} value={compactNumber(cur.cacheWrite)} />
          <Stat label={`${unit} 캐시 읽기`} value={compactNumber(cur.cacheRead)} note="한도에 주는 영향이 작아요" />
        </div>
      </div>
    </InfoCard>
  );
}
