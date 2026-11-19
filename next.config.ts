import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 데스크톱 설치 파일을 만들 때만 서버를 단독 실행 폴더로 뽑는다(웹 배포는 그대로)
  ...(process.env.MCI_BUILD_DESKTOP === "1" ? { output: "standalone" as const, distDir: ".next-desktop" } : {}),
};

export default nextConfig;
