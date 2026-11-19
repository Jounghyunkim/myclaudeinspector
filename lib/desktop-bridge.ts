"use client";

import { useEffect, useState } from "react";

/** Electron preload가 window.mci로 넘기는 값. 웹에서는 없다. */
export type DesktopStatus = { intervalMin: number; lastAt: number | null; nextAt: number | null; openAtLogin: boolean };
export type DesktopBridge = {
  getStatus(): Promise<DesktopStatus>;
  setSettings(s: Partial<Pick<DesktopStatus, "intervalMin" | "openAtLogin">>): Promise<DesktopStatus>;
  updateNow(): Promise<DesktopStatus>;
  onStatus(cb: (s: DesktopStatus) => void): () => void;
};

export const INTERVALS = [
  { min: 15, label: "15분" },
  { min: 30, label: "30분" },
  { min: 60, label: "1시간" },
  { min: 180, label: "3시간" },
  { min: 1440, label: "하루" },
] as const;

export function intervalLabel(min: number): string {
  return INTERVALS.find((i) => i.min === min)?.label ?? `${min}분`;
}

function bridge(): DesktopBridge | null {
  return typeof window !== "undefined" ? ((window as unknown as { mci?: DesktopBridge }).mci ?? null) : null;
}

/** 데스크톱 앱 상태를 구독한다. 웹에서는 null */
export function useDesktopStatus(): [DesktopStatus | null, DesktopBridge | null] {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [b] = useState(bridge);
  useEffect(() => {
    if (!b) return;
    let alive = true;
    b.getStatus().then((s) => alive && setStatus(s));
    const off = b.onStatus((s) => setStatus(s));
    return () => {
      alive = false;
      off();
    };
  }, [b]);
  return [status, b];
}
