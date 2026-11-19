"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { McpInfo, MdFile, MemoryFile, SkillInfo } from "./tools";

export function ToolSection({ title, sub, href, className, children }: { title: string; sub: string; href: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2.5 rounded-lg border bg-card p-3", className)} aria-label={title}>
      <h3 className="flex items-baseline gap-1.5 text-[1.02em] font-medium">
        {title} <span className="text-xs text-muted-foreground">{sub}</span>
        <Link href={href} className="ml-auto text-xs whitespace-nowrap text-primary hover:underline">자세히 →</Link>
      </h3>
      {children}
    </section>
  );
}

function pickClass(on: boolean) {
  return cn("cursor-pointer rounded-md outline-none hover:bg-muted focus-visible:bg-muted", on && "bg-primary/15 hover:bg-primary/20");
}

function Intro({ head, desc, note, srcLabel, src }: { head: ReactNode; desc: string | null; note: string | null; srcLabel: string; src: string }) {
  const [open, setOpen] = useState(false);
  // 세 줄을 넘을 만큼 긴 설명에만 펼치기 버튼을 둔다
  const clamped = (desc?.length ?? 0) > 120;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-l-[3px] border-l-primary bg-background px-3 py-2.5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-1.5">{head}</div>
      {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
      {desc ? (
        <>
          <p className={cn("text-[13px] leading-normal", !open && "line-clamp-3")}>{desc}</p>
          {clamped || open ? (
            <button type="button" className="self-start text-xs underline" onClick={() => setOpen((v) => !v)}>
              {open ? "접기" : "전체 보기"}
            </button>
          ) : null}
        </>
      ) : null}
      <div className="text-xs break-all text-muted-foreground">
        {srcLabel} <code className="text-[11px]">{src}</code>
      </div>
    </div>
  );
}

function Bars({ rows, selected, onPick }: { rows: { key: string; label: string; value: number }[]; selected: string | null; onPick: (k: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="flex flex-col gap-1">
      {rows.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            aria-pressed={selected === r.key}
            onClick={() => onPick(r.key)}
            className={cn("grid w-full grid-cols-[104px_minmax(0,1fr)_30px] items-center gap-2 px-1 py-0.5 text-left text-xs", pickClass(selected === r.key))}
          >
            <span className="truncate font-mono tracking-normal" title={r.label}>{r.label}</span>
            <span className="h-3"><i className="block h-full min-w-0.5 rounded-r bg-chart-3" style={{ width: `${(r.value / max) * 100}%` }} /></span>
            <span className="text-right font-semibold tabular-nums tracking-normal">{r.value}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function SkillsPanel({ skills }: { skills: SkillInfo[] }) {
  const used = skills.filter((s) => s.uses > 0);
  const unused = skills.filter((s) => s.uses === 0);
  const [sel, setSel] = useState<string | null>(skills[0]?.name ?? null);
  const s = skills.find((x) => x.name === sel);
  if (!skills.length) return <p className="text-sm text-muted-foreground">설치된 Skill이 없어요.</p>;
  return (
    <>
      {used.length ? <Bars rows={used.slice(0, 8).map((x) => ({ key: x.name, label: x.name, value: x.uses }))} selected={sel} onPick={setSel} /> : <p className="text-xs text-muted-foreground">아직 사용한 Skill이 없어요.</p>}
      {unused.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">아직 안 쓴 Skill {unused.length}개</span>
          <div className="flex flex-wrap gap-1">
            {unused.map((x) => (
              <button key={x.name} type="button" aria-pressed={sel === x.name} onClick={() => setSel(x.name)} className={cn("rounded-full border px-2 py-px text-xs hover:border-primary", sel === x.name && "border-primary bg-primary/15")}>
                {x.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {s ? (
        <Intro
          key={s.name}
          head={<><code className="font-bold">{s.name}</code><Badge variant="secondary">{s.scope}</Badge><span className="text-xs text-muted-foreground">{s.uses ? `사용 ${s.uses}회` : "아직 안 씀"}</span></>}
          desc={s.description || null}
          note={s.description ? null : "description이 비어 있어요. Claude가 이 Skill을 언제 꺼내 쓸지 판단하기 어려워요."}
          srcLabel="출처"
          src={s.path}
        />
      ) : null}
    </>
  );
}

export function McpPanel({ servers }: { servers: McpInfo[] }) {
  const [sel, setSel] = useState(0);
  const m = servers[sel];
  return (
    <>
      {servers.length ? (
        <ul className="flex flex-col">
          {servers.map((s, i) => (
            <li key={s.name + s.where}>
              <button type="button" aria-pressed={sel === i} onClick={() => setSel(i)} className={cn("grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 px-1 py-1.5 text-left", pickClass(sel === i))}>
                <code>{s.name}</code>
                <Badge variant="secondary">{s.type}</Badge>
                <span className="truncate text-right text-xs text-muted-foreground">{s.where}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">로컬에 설정한 MCP 서버가 없어요.</p>
      )}
      {m ? (
        <Intro
          key={m.name + m.where}
          head={<><code className="font-bold">{m.name}</code><Badge variant="secondary">{m.type}</Badge><span className="text-xs text-muted-foreground">{m.where}</span></>}
          desc={m.known}
          note={m.known ? null : "설정 파일에는 설명이 없어요. 아래 실행 명령의 패키지 이름으로 어떤 서버인지 찾아보세요."}
          srcLabel="실행 명령"
          src={m.command || "–"}
        />
      ) : null}
      <p className="text-xs text-muted-foreground">Claude Desktop에서 연결한 커넥터(Google Calendar 등)는 계정에 저장돼서 여기 보이지 않아요. Desktop 앱의 커넥터 설정에서 확인하세요.</p>
    </>
  );
}

function FileView({ name, badge, lines, note, text, path }: { name: string; badge: string; lines: number; note: string; text: string; path: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-background px-3 py-2.5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-1.5">
        <code className="font-bold">{name}</code>
        <Badge variant="secondary">{badge}</Badge>
        <span className="text-xs text-muted-foreground">{lines}줄</span>
      </div>
      <span className="text-xs text-muted-foreground">{note}</span>
      <pre className="max-h-[300px] overflow-auto rounded border bg-background py-2 pr-2.5 font-mono text-xs leading-relaxed tracking-normal whitespace-pre-wrap [counter-reset:ln] [overflow-wrap:anywhere]">
        {text.split("\n").map((l, i) => (
          <span
            key={i}
            className={cn(
              "relative block pl-11 [counter-increment:ln] before:absolute before:left-0 before:w-[34px] before:text-right before:text-muted-foreground/70 before:content-[counter(ln)]",
              /^@\S/.test(l) && "bg-primary/20 font-bold",
              l === "---" && "text-muted-foreground",
            )}
          >
            {l || " "}
          </span>
        ))}
      </pre>
      <div className="text-xs break-all text-muted-foreground">파일 위치 <code className="text-[11px]">{path}</code></div>
    </div>
  );
}

function mdNote(f: MdFile): string {
  if (/^@\S/m.test(f.text) && f.lines <= 3) return "@로 시작하는 줄은 다른 파일 내용을 그 자리에 불러와요. 그래서 짧아 보여도 실제로는 불러온 파일 전체를 읽어요.";
  if (f.importedBy) return `${f.importedBy}가 @로 불러오는 파일이에요.`;
  if (f.scope === "사용자") return "모든 프로젝트에 공통으로 적용돼요.";
  return "이 프로젝트에서 세션을 시작할 때마다 먼저 읽어요.";
}

export function ClaudeMdPanel({ files }: { files: MdFile[] }) {
  const [sel, setSel] = useState(0);
  if (!files.length) return <p className="text-sm text-muted-foreground">CLAUDE.md가 없어요. Claude Code에서 /init으로 만들 수 있어요.</p>;
  const f = files[sel];
  return (
    <>
      <Bars rows={files.map((x, i) => ({ key: String(i), label: x.name, value: x.lines }))} selected={String(sel)} onPick={(k) => setSel(Number(k))} />
      <span className="text-xs text-muted-foreground">200줄을 넘으면 가끔 쓰는 절차를 Skill로 옮기라고 추천해요.</span>
      <FileView name={f.name} badge={f.scope} lines={f.lines} note={mdNote(f)} text={f.text} path={f.path} />
    </>
  );
}

export function MemoryPanel({ files }: { files: MemoryFile[] }) {
  const [sel, setSel] = useState(0);
  if (!files.length) return <p className="text-sm text-muted-foreground">이 프로젝트에 저장된 메모가 아직 없어요.</p>;
  const f = files[sel];
  const note = f.name === "MEMORY.md" ? "목차 파일이에요. 세션을 시작할 때 이 목록을 먼저 읽고, 각 파일은 필요할 때 열어 봐요." : "맨 위 --- 사이는 frontmatter예요. description을 보고 Claude가 이 기억이 지금 필요한지 판단해요.";
  return (
    <>
      <ul className="flex flex-col">
        {files.map((x, i) => (
          <li key={x.name}>
            <button type="button" aria-pressed={sel === i} onClick={() => setSel(i)} className={cn("grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 px-1 py-1.5 text-left", pickClass(sel === i))}>
              <code>{x.name}</code>
              <Badge variant={x.kind === "목차" ? "outline" : "secondary"}>{x.kind}</Badge>
              <span className="text-xs text-muted-foreground">{x.description}</span>
            </button>
          </li>
        ))}
      </ul>
      <FileView name={f.name} badge={f.kind} lines={f.text ? f.text.split("\n").length : 0} note={note} text={f.text} path={f.path} />
    </>
  );
}
