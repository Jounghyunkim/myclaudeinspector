// next build(standalone) 결과에 정적 파일을 붙여 데스크톱 앱이 실을 서버 폴더를 만든다
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const out = path.join(root, ".next-desktop", "standalone");
if (!fs.existsSync(path.join(out, "server.js"))) {
  console.error("standalone 출력이 없어요. MCI_BUILD_DESKTOP=1 next build를 먼저 실행하세요.");
  process.exit(1);
}
fs.cpSync(path.join(root, ".next-desktop", "static"), path.join(out, ".next-desktop", "static"), { recursive: true });
fs.cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
// electron-builder는 extraResources의 node_modules를 빼므로 이름을 바꿔 싣고, 실행할 때 NODE_PATH로 알려 준다
const mods = path.join(out, "node_modules");
const renamed = path.join(out, "server_modules");
if (fs.existsSync(mods)) {
  fs.rmSync(renamed, { recursive: true, force: true });
  fs.renameSync(mods, renamed);
}
console.log("ok", out);
