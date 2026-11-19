import { createRequire } from "node:module";

import { expect, test } from "vitest";

const require = createRequire(import.meta.url);
const { normalizeSettings, nextAt, pathsFromUrl, rememberableUrl } = require("./schedule.cjs");

test("설정 기본값은 1시간 주기, Windows 시작 시 실행 꺼짐 (가정)", () => {
  expect(normalizeSettings(null)).toEqual({ intervalMin: 60, openAtLogin: false, lastUrl: null, lastAt: null });
  expect(normalizeSettings({ intervalMin: 7, openAtLogin: "yes" })).toMatchObject({ intervalMin: 60, openAtLogin: false });
  expect(normalizeSettings({ intervalMin: 15, openAtLogin: true })).toMatchObject({ intervalMin: 15, openAtLogin: true });
});

test("다음 업데이트는 마지막 업데이트에서 주기만큼 뒤, 지났으면 지금 (AC11)", () => {
  const now = 1_000_000_000;
  expect(nextAt(null, 60, now)).toBe(now);
  expect(nextAt(now - 10 * 60_000, 60, now)).toBe(now + 50 * 60_000);
  expect(nextAt(now - 2 * 3_600_000, 60, now)).toBe(now);
});

test("대시보드 주소의 경로 값을 기억해 다음 실행과 주기 업데이트에 쓴다 (AC7)", () => {
  const o = "http://127.0.0.1:5123";
  expect(pathsFromUrl(`${o}/?claude=C%3A%5Cx&project=D%3A%5Cp`)).toEqual({ claude: "C:\\x", project: "D:\\p" });
  expect(pathsFromUrl(`${o}/`)).toBeNull();
  expect(rememberableUrl(`${o}/?project=D%3A%5Cp`, o)).toBe("/?project=D%3A%5Cp");
  expect(rememberableUrl("https://docs.claude-hunt.com/next/?project=x", o)).toBeNull();
  expect(rememberableUrl(`${o}/learn/cli`, o)).toBeNull();
});
