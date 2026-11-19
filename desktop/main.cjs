// My Claude Inspector 데스크톱 앱: 함께 실은 Next.js 서버를 PC 안(127.0.0.1)에서 띄우고 창과 트레이로 보여 준다
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const { normalizeSettings, nextAt, pathsFromUrl, rememberableUrl } = require("./schedule.cjs");

const APP_NAME = "My Claude Inspector";
app.setName(APP_NAME);
app.setAppUserModelId("com.jounghyunkim.myclaudeinspector");

if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}

let win = null;
let tray = null;
let server = null;
let origin = process.env.MCI_DEV_URL || null;
let timer = null;
let quitting = false;
let settings;

const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
function loadSettings() {
  try {
    return normalizeSettings(JSON.parse(fs.readFileSync(settingsFile(), "utf8")));
  } catch {
    return normalizeSettings(null);
  }
}
function saveSettings() {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}

function status() {
  return { intervalMin: settings.intervalMin, lastAt: settings.lastAt, nextAt: nextAt(settings.lastAt, settings.intervalMin, Date.now()), openAtLogin: settings.openAtLogin };
}
function broadcast() {
  const s = status();
  if (win && !win.isDestroyed()) win.webContents.send("mci:status", s);
  buildTray();
  return s;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitFor(url, ms = 30_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      // 아직 뜨는 중
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("server did not start");
}

async function startServer() {
  if (origin) return;
  const dir = path.join(process.resourcesPath, "app-server");
  const port = await freePort();
  // Electron에 들어 있는 Node로 Next.js standalone 서버를 실행한다
  // NODE_USE_SYSTEM_CA: 회사망처럼 HTTPS를 검사하는 환경에서도 사용량 API에 붙도록 Windows 인증서 저장소를 믿게 한다
  server = spawn(process.execPath, [path.join(dir, "server.js")], {
    cwd: dir,
    env: { ...process.env, NODE_PATH: path.join(dir, "server_modules"), ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", NODE_USE_SYSTEM_CA: "1", PORT: String(port), HOSTNAME: "127.0.0.1", MCI_DESKTOP: "1" },
    stdio: "ignore",
    windowsHide: true,
  });
  server.on("exit", () => {
    server = null;
    if (!quitting) app.quit();
  });
  origin = `http://127.0.0.1:${port}`;
  await waitFor(`${origin}/app-settings`);
}

async function refresh() {
  clearTimeout(timer);
  const paths = settings.lastUrl ? pathsFromUrl(origin + settings.lastUrl) : null;
  if (paths) {
    try {
      await fetch(`${origin}/api/desktop/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(paths) });
    } catch {
      // 다음 주기에 다시 한다
    }
  }
  settings.lastAt = Date.now();
  saveSettings();
  schedule();
  return broadcast();
}

function schedule() {
  clearTimeout(timer);
  const wait = Math.max(1_000, nextAt(settings.lastAt, settings.intervalMin, Date.now()) - Date.now());
  // setTimeout은 약 24.8일을 넘기면 바로 실행되므로 길게 기다릴 때는 끊어서 기다린다
  timer = setTimeout(() => (Date.now() >= nextAt(settings.lastAt, settings.intervalMin, Date.now()) ? refresh() : schedule()), Math.min(wait, 3_600_000));
}

function trayIcon() {
  const img = nativeImage.createFromPath(path.join(__dirname, "icon.png"));
  return img.isEmpty() ? img : img.resize({ width: 16, height: 16 });
}

function fmtTime(t) {
  const d = new Date(t);
  const h = d.getHours();
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildTray() {
  if (!tray) {
    tray = new Tray(trayIcon());
    tray.setToolTip(APP_NAME);
    tray.on("click", showWindow);
  }
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `${APP_NAME} 열기`, click: showWindow },
      { label: "지금 업데이트", click: () => refresh() },
      { label: `다음 업데이트 ${fmtTime(status().nextAt)}`, enabled: false },
      { type: "separator" },
      { label: "종료", click: () => { quitting = true; app.quit(); } },
    ]),
  );
}

function showWindow() {
  if (!win || win.isDestroyed()) return createWindow(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow(show) {
  win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 390,
    show: false,
    backgroundColor: "#1a1a1a",
    title: APP_NAME,
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.setMenu(null);
  // 강의 자료처럼 앱 밖 주소는 기본 브라우저로 연다
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(origin)) {
      e.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
  const remember = (_e, url) => {
    const u = rememberableUrl(url, origin);
    if (u && u.startsWith("/?")) {
      settings.lastUrl = u;
      saveSettings();
    }
  };
  win.webContents.on("did-navigate", remember);
  win.webContents.on("did-navigate-in-page", remember);
  win.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.loadURL(origin + (settings.lastUrl || "/"));
  if (show) win.once("ready-to-show", () => win.show());
}

ipcMain.handle("mci:getStatus", () => status());
ipcMain.handle("mci:updateNow", () => refresh());
ipcMain.handle("mci:setSettings", (_e, s) => {
  settings = normalizeSettings({ ...settings, ...s });
  saveSettings();
  if (s && "openAtLogin" in s) app.setLoginItemSettings({ openAtLogin: settings.openAtLogin, args: ["--hidden"] });
  schedule();
  return broadcast();
});

app.on("second-instance", showWindow);
app.on("before-quit", () => {
  quitting = true;
  if (server) server.kill();
});
app.on("window-all-closed", () => {
  // 트레이에 남는다
});

app.whenReady().then(async () => {
  settings = loadSettings();
  try {
    await startServer();
  } catch (e) {
    require("electron").dialog.showErrorBox(APP_NAME, `앱을 시작하지 못했어요.\n${e.message}`);
    quitting = true;
    app.quit();
    return;
  }
  buildTray();
  createWindow(!process.argv.includes("--hidden"));
  schedule();
});
