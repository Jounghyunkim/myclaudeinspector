import { cn } from "@/lib/utils";

/** 한도 대비 비율 막대. tick 위치에 기준선을 그린다. */
export function Meter({
  value,
  tick,
  high,
  size = "md",
  label,
}: {
  value: number;
  tick?: number;
  high?: boolean;
  size?: "sm" | "md";
  label: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn("relative rounded-full", size === "md" ? "h-3.5" : "h-2", high ? "bg-warn/20" : "bg-muted")}
    >
      <i
        className={cn(
          "absolute inset-y-0 left-0 rounded-full",
          high && size === "md" ? "bg-[linear-gradient(90deg,var(--primary),var(--warn)_70%,var(--crit))]" : high ? "bg-warn" : "bg-primary",
        )}
        style={{ width: `${v}%` }}
      />
      {tick != null ? (
        <b className="absolute -inset-y-1 w-0.5 -ml-px rounded-sm bg-foreground/55" style={{ left: `${tick}%` }} aria-hidden />
      ) : null}
    </div>
  );
}

export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn/20 px-2 py-px text-xs font-semibold text-foreground">
      <svg viewBox="0 0 16 16" className="size-3 fill-warn" aria-hidden>
        <path d="M8 1 15 14H1Z" />
      </svg>
      {children}
    </span>
  );
}
