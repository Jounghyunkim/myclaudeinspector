// 데스크톱용 Next.js 서버를 만든다: standalone 빌드 후 정적 파일을 붙인다
import { spawnSync } from "node:child_process";

const run = (cmd: string, args: string[], env: Record<string, string> = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("bunx", ["next", "build"], { MCI_BUILD_DESKTOP: "1" });
run("node", ["desktop/prepare.cjs"]);
