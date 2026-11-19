export const RELEASE_REPO = "Jounghyunkim/myclaudeinspector";
export const RELEASES_URL = `https://github.com/${RELEASE_REPO}/releases`;

export type LatestRelease = {
  version: string;
  publishedAt: number;
  notesUrl: string;
  installer: { name: string; url: string; size: number };
};

type GhRelease = {
  tag_name?: string;
  html_url?: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name?: string; browser_download_url?: string; size?: number }[];
};

/** GitHub Releases 응답에서 Windows 설치 파일이 있는 릴리스만 고른다 */
export function parseRelease(raw: unknown): LatestRelease | null {
  const r = raw as GhRelease | null;
  if (!r || r.draft || !r.tag_name) return null;
  const exe = (r.assets ?? []).find((a) => /setup.*\.exe$/i.test(a.name ?? "") && a.browser_download_url);
  if (!exe) return null;
  return {
    version: r.tag_name.replace(/^v/, ""),
    publishedAt: r.published_at ? Date.parse(r.published_at) : 0,
    notesUrl: r.html_url ?? RELEASES_URL,
    installer: { name: exe.name!, url: exe.browser_download_url!, size: exe.size ?? 0 },
  };
}

/** 최신 릴리스. 1시간마다 다시 읽고, 받아 오지 못하면 null */
export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${RELEASE_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return parseRelease(await res.json());
  } catch {
    return null;
  }
}

export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}
