import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 숫자 하나와 설명 두 줄 */
export function Stat({ label, value, unit, note, className }: { label: ReactNode; value: ReactNode; unit?: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-heading text-[26px] leading-tight font-semibold tracking-normal">
        {value}
        {unit ? <small className="ml-0.5 text-[0.45em] font-semibold text-muted-foreground">{unit}</small> : null}
      </span>
      {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
    </div>
  );
}

/** 칸 사이를 얇은 선으로 나눈 숫자 줄 */
export function StatRow({ children, min = 150 }: { children: ReactNode; min?: number }) {
  return (
    <div
      className="grid gap-px overflow-hidden rounded-lg border bg-border [&>*]:bg-card [&>*]:px-3.5 [&>*]:py-2.5"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}
