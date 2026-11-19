import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "My Claude Inspector",
  description: "내 Claude가 지금 어떤 상태인지 한눈에 보고, 더 잘 쓰는 방법을 추천받는 로컬 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col gap-4 px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
