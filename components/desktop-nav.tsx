"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "대시보드", match: (p: string) => p === "/" || p.startsWith("/learn") },
  { href: "/trends", label: "트렌드", match: (p: string) => p.startsWith("/trends") },
  { href: "/app-settings", label: "설정", match: (p: string) => p.startsWith("/app-settings") },
];

function Links() {
  const path = usePathname();
  const sp = useSearchParams();
  // 경로 값을 다른 화면에도 넘겨서 다시 입력하지 않게 한다
  const keep = ["claude", "project"].filter((k) => sp.get(k)).map((k) => `${k}=${encodeURIComponent(sp.get(k)!)}`).join("&");
  return (
    <>
      {ITEMS.map((it) => (
        <Link
          key={it.href}
          href={keep && it.href !== "/app-settings" ? `${it.href}?${keep}` : it.href}
          aria-current={it.match(path) ? "page" : undefined}
          className={cn("rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground", it.match(path) && "bg-muted font-semibold text-foreground")}
        >
          {it.label}
        </Link>
      ))}
    </>
  );
}

/** 데스크톱 앱의 위쪽 메뉴 */
export function DesktopNav() {
  return (
    <header className="border-b border-border">
      <nav aria-label="앱" className="mx-auto flex w-full max-w-[1760px] flex-wrap items-center gap-1 px-4 py-2.5 sm:px-6">
        <Suspense>
          <Links />
        </Suspense>
      </nav>
    </header>
  );
}
