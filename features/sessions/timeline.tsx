"use client";

import { useState } from "react";

import { Legend } from "@/components/charts";
import { formatDuration, formatTime } from "@/lib/claude/time";

import type { TimelineBar } from "./sessions";

export function Timeline({ bars, now, dayStart }: { bars: TimelineBar[]; now: number; dayStart: number }) {
  const [tip, setTip] = useState<{ x: number; y: number; bar: TimelineBar } | null>(null);
  const H = 3_600_000;
  const earliest = Math.min(dayStart + 9 * H, ...bars.map((b) => b.start));
  const latest = Math.max(dayStart + 18 * H, now, ...bars.map((b) => b.end));
  const from = Math.floor((earliest - dayStart) / (3 * H)) * 3 * H + dayStart;
  const to = Math.ceil((latest - dayStart) / (3 * H)) * 3 * H + dayStart;
  const pct = (t: number) => ((t - from) / (to - from)) * 100;
  const ticks: number[] = [];
  for (let t = from; t <= to; t += 3 * H) ticks.push(t);
  const hourLabel = (t: number) => {
    const h = new Date(t).getHours();
    return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}시`;
  };
  if (bars.length === 0) return <p className="text-sm text-muted-foreground">오늘 이 프로젝트에서 연 세션이 없어요.</p>;
  return (
    <div className="flex flex-col gap-1">
      <div className="relative flex flex-col gap-3 py-1.5">
        {ticks.map((t) => (
          <i key={t} className="absolute inset-y-0 w-px bg-grid" style={{ left: `${pct(t)}%` }} aria-hidden />
        ))}
        <i className="absolute -inset-y-0.5 w-0.5 -ml-px rounded-sm bg-foreground/55" style={{ left: `${pct(now)}%` }} aria-hidden />
        {bars.map((b) => (
          <div key={b.id} className="relative h-[34px]">
            <button
              type="button"
              aria-label={`${b.name}, ${formatTime(b.start)}부터 ${b.running ? "지금까지" : formatTime(b.end) + "까지"}`}
              className={
                "absolute top-0 h-3.5 min-w-1 cursor-pointer rounded hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
                (b.running ? "rounded-r-none bg-[linear-gradient(90deg,var(--primary)_80%,color-mix(in_oklch,var(--primary)_30%,transparent))]" : "bg-s1")
              }
              style={{ left: `${pct(b.start)}%`, width: `${Math.max(0.5, pct(b.end) - pct(b.start))}%` }}
              onPointerMove={(e) => setTip({ x: e.clientX, y: e.clientY, bar: b })}
              onPointerLeave={() => setTip(null)}
              onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top, bar: b }); }}
              onBlur={() => setTip(null)}
            />
            <span className="absolute top-[17px] max-w-[60%] truncate text-xs" style={{ left: `${Math.min(pct(b.start), 60)}%` }}>
              {b.name}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-4 border-t border-axis" aria-hidden>
        {ticks.map((t, i) => (
          <span
            key={t}
            className="absolute top-0.5 text-[11px] whitespace-nowrap text-muted-foreground tracking-normal"
            style={{ left: `${pct(t)}%`, transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
          >
            {hourLabel(t)}
          </span>
        ))}
      </div>
      <Legend items={[{ name: "끝난 세션", color: "var(--s1)" }, { name: "작업 중", color: "var(--primary)" }, { name: "지금", color: "", shape: "tick" }]} />
      {tip ? (
        <div role="status" className="pointer-events-none fixed z-50 min-w-[160px] rounded-md border bg-popover px-2.5 py-2 text-xs tracking-[0.02em] shadow-lg" style={{ left: tip.x + 14, top: Math.max(8, tip.y - 120) }}>
          <div className="mb-1 text-muted-foreground">{tip.bar.name}</div>
          {[
            ["시간", `${formatTime(tip.bar.start)} – ${tip.bar.running ? "지금" : formatTime(tip.bar.end)}`],
            ["길이", formatDuration(tip.bar.end - tip.bar.start)],
            ["메시지", `${tip.bar.messages}개`],
            ["모델", tip.bar.model ?? "–"],
            ["컨텍스트", `${tip.bar.ctx}%`],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[56px_1fr] gap-1.5">
              <span className="text-muted-foreground">{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
