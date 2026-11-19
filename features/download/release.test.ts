import { expect, test } from "vitest";

import { formatSize, parseRelease } from "./release";

test("최신 릴리스에서 Windows 설치 파일을 고른다 (AC1)", () => {
  const r = parseRelease({
    tag_name: "v0.1.0",
    html_url: "https://github.com/x/y/releases/tag/v0.1.0",
    published_at: "2026-11-19T06:00:00Z",
    assets: [
      { name: "latest.yml", browser_download_url: "https://e/latest.yml", size: 1 },
      { name: "MyClaudeInspector-Setup-0.1.0.exe", browser_download_url: "https://e/setup.exe", size: 168 * 1024 * 1024 },
    ],
  });
  expect(r).toMatchObject({ version: "0.1.0", installer: { name: "MyClaudeInspector-Setup-0.1.0.exe", url: "https://e/setup.exe" } });
  expect(formatSize(r!.installer.size)).toBe("168MB");
});

test("설치 파일이 없거나 응답이 이상하면 null (AC4)", () => {
  expect(parseRelease({ tag_name: "v0.1.0", assets: [] })).toBeNull();
  expect(parseRelease({ message: "Not Found" })).toBeNull();
  expect(parseRelease(null)).toBeNull();
  expect(parseRelease({ tag_name: "v1", draft: true, assets: [{ name: "a-setup.exe", browser_download_url: "u" }] })).toBeNull();
});
