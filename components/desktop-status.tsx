"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { intervalLabel, useDesktopStatus } from "@/lib/desktop-bridge";
import { formatTime } from "@/lib/claude/time";

/** 대시보드 머리말: 다음 업데이트 시각과 주기. 업데이트가 끝나면 화면 값을 다시 읽는다. */
export function DesktopStatus() {
  const [s] = useDesktopStatus();
  const router = useRouter();
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!s?.lastAt) return;
    if (last.current !== null && last.current !== s.lastAt) router.refresh();
    last.current = s.lastAt;
  }, [s?.lastAt, router]);
  if (!s) return null;
  return (
    <span className="rounded-full border px-2 py-px text-xs">
      {s.lastAt ? `마지막 업데이트 ${formatTime(s.lastAt)} · ` : ""}
      {s.nextAt ? `다음 ${formatTime(s.nextAt)} · ` : ""}
      {intervalLabel(s.intervalMin)}마다
    </span>
  );
}
