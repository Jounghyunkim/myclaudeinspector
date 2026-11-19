import Link from "next/link";
import type { ReactNode } from "react";

import { CopyButton } from "@/components/copy-button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { CourseFigure } from "./course-figure";
import { DOC, TOPICS, type Topic } from "./topics";

function Box({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <span className={cn("rounded-md border bg-background px-3 py-2 text-center text-[13px] leading-normal", strong && "border-2 border-primary font-semibold")}>{children}</span>;
}

function Diagram({ kind, limits }: { kind: NonNullable<Topic["diagram"]>; limits?: { fiveHour: number | null; sevenDay: number | null } }) {
  const wrap = "flex flex-col gap-3 rounded-md border bg-[color-mix(in_oklch,var(--primary)_8%,var(--muted))] p-4";
  const cap = (t: string) => <p className="basis-full text-xs leading-normal text-muted-foreground">{t}</p>;
  if (kind === "usage") {
    const row = (k: string, v: number | null) => (
      <div className="grid grid-cols-[76px_minmax(0,1fr)_40px] items-center gap-2.5 text-[13px]">
        <span>{k}</span>
        <span className="relative h-3.5 overflow-hidden rounded-full bg-background"><i className={cn("absolute inset-y-0 left-0 rounded-full", (v ?? 0) >= 80 ? "bg-[linear-gradient(90deg,var(--primary),var(--warn)_70%,var(--crit))]" : "bg-primary")} style={{ width: `${v ?? 0}%` }} /></span>
        <span className="text-right font-bold tabular-nums tracking-normal">{v == null ? "–" : `${v}%`}</span>
      </div>
    );
    return (
      <div className={wrap} role="img" aria-label="5시간 창과 주간 창 그림">
        {row("5시간 한도", limits?.fiveHour ?? null)}
        {row("주간 한도", limits?.sevenDay ?? null)}
        {cap("짧은 창(5시간)은 자주 비워지고, 긴 창(일주일)은 계속 쌓여요. 둘 중 하나라도 100%가 되면 작업이 멈춰요.")}
      </div>
    );
  }
  if (kind === "cli")
    return (
      <div className={cn(wrap, "flex-row flex-wrap items-center justify-center")} role="img" aria-label="나와 Claude가 같은 터미널에서 같은 명령을 실행하는 그림">
        <Box>나</Box><span className="text-muted-foreground">→</span><Box strong>터미널<br /><code>gh issue list</code></Box><span className="text-muted-foreground">←</span><Box>Claude</Box>
        {cap("Claude의 명령 실행 도구는 내 PC의 터미널을 써요. 그래서 내가 로그인한 계정 그대로 같은 명령을 실행해요.")}
      </div>
    );
  if (kind === "mcp")
    return (
      <div className={cn(wrap, "flex-row flex-wrap items-center justify-center")} role="img" aria-label="Claude Code에 MCP 규격으로 여러 서버가 꽂히는 그림">
        <Box strong>Claude Code</Box><span className="text-[13px] font-semibold text-muted-foreground">⇄ MCP ⇄</span>
        <span className="flex flex-col gap-1.5"><Box>브라우저 (playwright)</Box><Box>GitHub</Box><Box>데이터베이스</Box></span>
        {cap("서비스를 만드는 쪽이 MCP 규격에 맞춰 도구를 내놓고, Claude Code는 그것을 꽂아 써요.")}
      </div>
    );
  return (
    <div className={cn(wrap, "grid sm:grid-cols-2")} role="img" aria-label="CLAUDE.md는 매번 전부 읽고, Skill은 필요할 때 본문을 읽는 그림">
      <div className="flex flex-col gap-2 text-[13px]"><b>CLAUDE.md</b><Box strong>세션마다 전부 읽음</Box><span className="text-xs text-muted-foreground">README 고칠 때도 커밋 절차까지 읽어요</span></div>
      <div className="flex flex-col gap-2 text-[13px]"><b>Skill</b><Box>평소엔 이름과 description만</Box><span className="text-center text-muted-foreground">↓ 커밋해 줘</span><Box strong>그때 SKILL.md 본문을 읽음</Box></div>
    </div>
  );
}

export function TopicPage({
  topic,
  query,
  mine,
  readAt,
  limits,
}: {
  topic: Topic;
  query: string;
  mine: { label: string; value: string; note: string }[];
  readAt: string;
  limits?: { fiveHour: number | null; sevenDay: number | null };
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <Link href={`/${query}`} className="self-start px-2 text-[13px] text-primary hover:underline">← 대시보드로</Link>
      <nav aria-label="주제" className="flex flex-wrap gap-1.5">
        {TOPICS.map((t) => (
          <Link
            key={t.slug}
            href={`/learn/${t.slug}${query}`}
            aria-current={t.slug === topic.slug ? "page" : undefined}
            className={cn("rounded-full border bg-card px-3 py-1 text-[13px] hover:border-primary", t.slug === topic.slug && "border-transparent bg-primary font-semibold text-primary-foreground")}
          >
            {t.nav}
          </Link>
        ))}
      </nav>
      <header className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">자세히 보기</span>
        <h1 className="font-heading text-[1.3em] font-semibold">{topic.title}</h1>
        <p className="max-w-[62ch] text-[15px] leading-loose">{topic.lead}</p>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardContent className="flex flex-col gap-4">
            {topic.figure ? <CourseFigure f={topic.figure} /> : topic.diagram ? <Diagram kind={topic.diagram} limits={limits} /> : null}
            <h2 className="font-heading text-[1.12em] font-medium">쉽게 말하면</h2>
            <div className="flex flex-col gap-2.5 text-[15px] leading-loose [&_code]:rounded [&_code]:bg-white/[0.08] [&_code]:px-1.5 [&_code]:text-[0.9em] [&_code]:text-[#bbb]">
              {topic.easy.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {topic.figure2 ? <CourseFigure f={topic.figure2} /> : null}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-2">
              <div>
                <h2 className="font-heading text-[1.12em] font-medium">내 상태</h2>
                <p className="text-[13px] text-muted-foreground">대시보드에서 불러온 값 · {readAt}</p>
              </div>
              {mine.map((m, i) => (
                <div key={m.label} className={cn("flex flex-col gap-0.5 py-2.5", i && "border-t")}>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                  <span className="font-heading text-[26px] leading-tight font-semibold tracking-normal">{m.value}</span>
                  <span className="text-xs text-muted-foreground">{m.note}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="font-heading text-[1.12em] font-medium">이렇게 해 보세요</h2>
              <ul className="flex flex-col gap-3">
                {topic.tips.map((t) => (
                  <li key={t.title} className="flex flex-col gap-1">
                    <b>{t.title}</b>
                    <span className="text-[13px] text-muted-foreground">{t.text}</span>
                    {t.code ? (
                      <div className="mt-0.5 flex items-center gap-2 rounded-md bg-muted py-1.5 pr-1.5 pl-2.5">
                        <code className="min-w-0 flex-1 text-[13px] [overflow-wrap:anywhere]">{t.code}</code>
                        <CopyButton text={t.code} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">명령은 Claude Code 입력창에 붙여 넣어요. 이 화면은 설정을 직접 바꾸지 않아요.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2">
              <div>
                <h2 className="font-heading text-[1.12em] font-medium">관련 강의</h2>
                <p className="text-[13px] text-muted-foreground">제대로 배우기 강의 자료 · 새 탭에서 열려요</p>
              </div>
              <ul className="flex flex-col gap-2">
                {topic.lessons.map((l) => (
                  <li key={l.path}>
                    <a href={l.external ? l.path : DOC + l.path} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0.5 rounded-md border bg-background px-3 py-2.5 hover:border-primary">
                      <span className="text-xs text-muted-foreground">{l.chapter}</span>
                      <span className="text-sm font-semibold">{l.title}</span>
                      <span className="text-xs text-muted-foreground">강의 페이지 열기 ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
