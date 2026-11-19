"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 화면을 열어 둔 동안 서버 값을 주기적으로 다시 읽는다 */
export function LiveRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}
