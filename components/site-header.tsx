import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { isDesktop } from "@/lib/desktop";
import { currentUser } from "@/lib/supabase/server";

import { DesktopNav } from "./desktop-nav";

/** Shared header. Server-rendered from the verified session; auth actions call router.refresh(). */
export async function SiteHeader() {
  // 데스크톱 앱에서는 로그인·랭킹 없이 PC 안에서만 쓴다(랭킹 연동은 다음 단계)
  if (isDesktop()) return <DesktopNav />;
  const user = await currentUser();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <nav aria-label="사이트" className="flex items-center gap-1">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            대시보드
          </Link>
          <Link href="/ranking" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            랭킹
          </Link>
          <Link href="/download" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            다운로드
          </Link>
        </nav>
        <nav aria-label="계정" className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                설정
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/auth/login" className={buttonVariants({ size: "sm" })}>
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
