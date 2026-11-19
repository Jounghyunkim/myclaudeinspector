import { DownloadPage, fetchLatestRelease } from "@/features/download";

export const metadata = { title: "다운로드 — My Claude Inspector" };
export const revalidate = 3600;

export default async function Download() {
  return <DownloadPage release={await fetchLatestRelease()} />;
}
