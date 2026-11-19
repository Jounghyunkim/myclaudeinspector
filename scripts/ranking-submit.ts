/**
 * Sends this PC's daily Claude usage numbers to the ranking server, under the signed-in account.
 *
 *   bun run ranking:submit -- --token mci_... [--server http://localhost:3000] [--claude-dir ~/.claude] [--days 30] [--dry-run]
 *
 * Get the token from /settings after signing in. It is saved to ~/.my-claude-inspector/ranking.json,
 * so later runs need no --token. The ranking nickname is the account's display name.
 * Only per-day counts are sent: no message text, file paths or project names leave the PC.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import { collectDailyUsage } from "../features/ranking/collect";

const { values } = parseArgs({
  options: {
    token: { type: "string" },
    server: { type: "string" },
    "claude-dir": { type: "string", default: path.join(os.homedir(), ".claude") },
    days: { type: "string", default: "30" },
    "dry-run": { type: "boolean", default: false },
  },
});

type Saved = { token?: string; server?: string };
const savedFile = path.join(os.homedir(), ".my-claude-inspector", "ranking.json");
const saved: Saved = await readFile(savedFile, "utf8")
  .then((t) => JSON.parse(t) as Saved)
  .catch(() => ({}));

const token = values.token ?? saved.token;
const server = values.server ?? saved.server ?? "http://localhost:3000";

const days = await collectDailyUsage(values["claude-dir"]!, Number(values.days));
console.log(`${days.length}일치 사용량을 모았습니다.`);

if (values["dry-run"]) {
  console.log(JSON.stringify(days, null, 2));
  process.exit(0);
}
if (!token) {
  console.error(`전송 토큰이 없습니다. ${server}/settings 에서 로그인해 토큰을 받은 뒤 --token으로 넣으세요.`);
  process.exit(1);
}

const res = await fetch(new URL("/api/ranking/submit", server), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token, days }),
});
const body = await res.json();
if (!res.ok) {
  console.error(`전송 실패 (${res.status}): ${body.error}`);
  process.exit(1);
}

await mkdir(path.dirname(savedFile), { recursive: true });
await writeFile(savedFile, JSON.stringify({ token, server }, null, 2));
console.log(`${body.nickname}(으)로 전송했습니다. 랭킹: ${new URL("/ranking", server)}`);
