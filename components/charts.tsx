"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Series = { key: string; name: string; color: string };
export type Datum = { label: string; title: string; values: Record<string, number | null> };

function niceMax(v: number): number {
  const s = (v || 1) / 4;
  const p = Math.pow(10, Math.floor(Math.log10(s)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= s) return m * p * 4;
  return 40 * p;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

type Tip = { x: number; y: number; title: string; rows: { name: string; value: string; color?: string }[] } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed z-50 min-w-[150px] rounded-md border bg-popover px-2.5 py-2 text-xs tracking-[0.02em] text-popover-foreground shadow-lg"
      style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 9999) - 180), top: Math.max(8, tip.y - 90) }}
    >
      <div className="mb-1 text-muted-foreground">{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[12px_1fr_auto] items-center gap-1.5 tabular-nums">
          <i className="h-0.5 rounded-sm" style={{ background: r.color ?? "transparent" }} />
          <span className="text-muted-foreground">{r.name}</span>
          <b>{r.value}</b>
        </div>
      ))}
    </div>
  );
}

const PAD = { L: 44, R: 8, T: 22, B: 26 };

function Frame({ w, h, max, fmt, children }: { w: number; h: number; max: number; fmt: (v: number) => string; children: ReactNode }) {
  const y = (v: number) => PAD.T + (h - PAD.T - PAD.B) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block size-full" role="presentation">
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <line x1={PAD.L} x2={w - PAD.R} y1={y((max * k) / 4)} y2={y((max * k) / 4)} stroke={k ? "var(--grid)" : "var(--axis)"} />
          <text x={PAD.L - 6} y={y((max * k) / 4) + 4} textAnchor="end" className="fill-muted-foreground text-[11px] tracking-normal">
            {fmt((max * k) / 4)}
          </text>
        </g>
      ))}
      {children}
    </svg>
  );
}

/** 쌓은 막대 차트(계열 하나도 가능). 막대 너비 최대 24px, 위쪽 끝 4px 둥글게, 계열 사이 2px 틈 */
export function ColumnChart({
  data,
  series,
  fmt,
  height = 240,
  labelEvery = 1,
  className,
  ariaLabel,
}: {
  data: Datum[];
  series: Series[];
  fmt: (v: number) => string;
  height?: number | "fill";
  labelEvery?: number;
  className?: string;
  ariaLabel: string;
}) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const H = height === "fill" ? h : height;
  const totals = data.map((d) => series.reduce((s, se) => s + (d.values[se.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 1));
  const peak = totals.indexOf(Math.max(...totals));
  const band = w ? (w - PAD.L - PAD.R) / data.length : 0;
  const bw = Math.min(24, band * 0.62);
  const y = (v: number) => PAD.T + (H - PAD.T - PAD.B) * (1 - v / max);
  return (
    <div ref={ref} className={className} style={{ height: height === "fill" ? undefined : height }} aria-label={ariaLabel} role="img">
      {w > 0 && H > 0 ? (
        <Frame w={w} h={H} max={max} fmt={fmt}>
          {data.map((d, i) => {
            const cx = PAD.L + band * i + band / 2;
            let acc = 0;
            const segs = series
              .map((se) => ({ se, v: d.values[se.key] ?? 0 }))
              .filter((s) => s.v > 0);
            const show = (ev: { clientX: number; clientY: number }) =>
              setTip({ x: ev.clientX, y: ev.clientY, title: d.title, rows: [...series.map((se) => ({ name: se.name, value: fmt(d.values[se.key] ?? 0), color: se.color })), ...(series.length > 1 ? [{ name: "합계", value: fmt(totals[i]) }] : [])] });
            return (
              <g key={d.label + i}>
                {segs.map((s, k) => {
                  const y0 = y(acc), y1 = y(acc + s.v);
                  acc += s.v;
                  const top = k === segs.length - 1;
                  const x = cx - bw / 2;
                  const gap = k > 0 ? 2 : 0;
                  const hgt = Math.max(0, y0 - y1 - gap);
                  if (!top) return <rect key={s.se.key} x={x} y={y1} width={bw} height={hgt} fill={s.se.color} />;
                  const r = Math.min(4, hgt);
                  const yb = y1 + hgt;
                  return <path key={s.se.key} d={`M${x},${yb}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${yb}Z`} fill={s.se.color} />;
                })}
                {(i === data.length - 1 || i === peak) && totals[i] > 0 ? (
                  <text x={cx} y={y(totals[i]) - 6} textAnchor="middle" className="fill-foreground text-xs font-semibold tracking-normal">
                    {fmt(totals[i])}
                  </text>
                ) : null}
                {(data.length - 1 - i) % labelEvery === 0 ? (
                  <text x={cx} y={H - 8} textAnchor="middle" className={i === data.length - 1 ? "fill-foreground text-[11px] font-semibold tracking-normal" : "fill-muted-foreground text-[11px] tracking-normal"}>
                    {d.label}
                  </text>
                ) : null}
                <rect
                  x={PAD.L + band * i}
                  y={PAD.T}
                  width={band}
                  height={Math.max(0, H - PAD.T - PAD.B)}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.title} ${series.map((se) => `${se.name} ${fmt(d.values[se.key] ?? 0)}`).join(", ")}`}
                  className="cursor-pointer outline-none focus-visible:stroke-ring focus-visible:stroke-2"
                  onPointerMove={show}
                  onPointerLeave={() => setTip(null)}
                  onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); show({ clientX: r.left + r.width / 2, clientY: r.top }); }}
                  onBlur={() => setTip(null)}
                />
              </g>
            );
          })}
        </Frame>
      ) : null}
      <Tooltip tip={tip} />
    </div>
  );
}

/** 선 + 점 차트. line 값은 선으로, dots 값은 점으로 그린다. 값이 null이면 비운다. */
export function LineChart({
  data,
  lineKey,
  dotKey,
  color,
  fmt,
  height = 220,
  labelEvery = 1,
  max = 100,
  rows,
  ariaLabel,
}: {
  data: Datum[];
  lineKey: string;
  dotKey?: string;
  color: string;
  fmt: (v: number) => string;
  height?: number;
  labelEvery?: number;
  max?: number;
  rows: (d: Datum) => { name: string; value: string; color?: string }[];
  ariaLabel: string;
}) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  const band = w ? (w - PAD.L - PAD.R) / data.length : 0;
  const x = (i: number) => PAD.L + band * i + band / 2;
  const y = (v: number) => PAD.T + (H - PAD.T - PAD.B) * (1 - v / max);
  let d = "";
  data.forEach((p, i) => {
    const v = p.values[lineKey];
    if (v == null) return;
    d += (d ? "L" : "M") + x(i) + "," + y(v);
  });
  const lastIdx = [...data.keys()].reverse().find((i) => data[i].values[lineKey] != null);
  return (
    <div ref={ref} style={{ height }} role="img" aria-label={ariaLabel}>
      {w > 0 ? (
        <Frame w={w} h={H} max={max} fmt={fmt}>
          <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {dotKey
            ? data.map((p, i) => (p.values[dotKey] == null ? null : <circle key={i} cx={x(i)} cy={y(p.values[dotKey]!)} r={4} fill="var(--card)" stroke={color} strokeWidth={2} />))
            : null}
          {lastIdx != null ? (
            <text x={x(lastIdx) - 4} y={y(data[lastIdx].values[lineKey]!) - 9} textAnchor="end" className="fill-foreground text-xs font-semibold tracking-normal">
              {fmt(data[lastIdx].values[lineKey]!)}
            </text>
          ) : null}
          {hover != null ? <line x1={x(hover)} x2={x(hover)} y1={PAD.T} y2={H - PAD.B} stroke="var(--axis)" /> : null}
          {data.map((p, i) => (
            <g key={i}>
              {(data.length - 1 - i) % labelEvery === 0 ? (
                <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px] tracking-normal">
                  {p.label}
                </text>
              ) : null}
              <rect
                x={PAD.L + band * i}
                y={PAD.T}
                width={band}
                height={H - PAD.T - PAD.B}
                fill="transparent"
                tabIndex={0}
                aria-label={`${p.title} ${rows(p).map((r) => `${r.name} ${r.value}`).join(", ")}`}
                className="cursor-pointer outline-none focus-visible:stroke-ring focus-visible:stroke-2"
                onPointerMove={(ev) => { setHover(i); setTip({ x: ev.clientX, y: ev.clientY, title: p.title, rows: rows(p) }); }}
                onPointerLeave={() => { setHover(null); setTip(null); }}
                onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(i); setTip({ x: r.left + r.width / 2, y: r.top, title: p.title, rows: rows(p) }); }}
                onBlur={() => { setHover(null); setTip(null); }}
              />
            </g>
          ))}
        </Frame>
      ) : null}
      <Tooltip tip={tip} />
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string; shape?: "box" | "line" | "dot" | "tick" }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-1.5">
          {it.shape === "line" ? (
            <i className="inline-block h-0.5 w-3.5" style={{ background: it.color }} />
          ) : it.shape === "dot" ? (
            <i className="inline-block size-2 rounded-full border-2" style={{ borderColor: it.color }} />
          ) : it.shape === "tick" ? (
            <i className="inline-block h-3 w-0.5 rounded-sm bg-foreground/50" />
          ) : (
            <i className="inline-block size-2.5 rounded-[3px]" style={{ background: it.color }} />
          )}
          {it.name}
        </span>
      ))}
    </div>
  );
}
