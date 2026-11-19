// 데스크톱 앱의 설정과 다음 업데이트 시각 계산 (Electron 없이 테스트할 수 있는 부분)

const INTERVALS = [15, 30, 60, 180, 1440];
const DEFAULTS = { intervalMin: 60, openAtLogin: false, lastUrl: null, lastAt: null };

/** 저장된 설정을 읽어 알맞은 값만 남긴다 */
function normalizeSettings(raw) {
  const s = { ...DEFAULTS, ...(raw && typeof raw === "object" ? raw : {}) };
  if (!INTERVALS.includes(s.intervalMin)) s.intervalMin = DEFAULTS.intervalMin;
  s.openAtLogin = s.openAtLogin === true;
  s.lastUrl = typeof s.lastUrl === "string" ? s.lastUrl : null;
  s.lastAt = typeof s.lastAt === "number" ? s.lastAt : null;
  return s;
}

function nextAt(lastAt, intervalMin, now) {
  if (!lastAt) return now;
  return Math.max(now, lastAt + intervalMin * 60_000);
}

/** 대시보드 주소에서 경로 값을 꺼낸다. 프로젝트가 없으면 null */
function pathsFromUrl(url) {
  try {
    const u = new URL(url);
    const project = u.searchParams.get("project");
    if (!project) return null;
    return { claude: u.searchParams.get("claude") || undefined, project };
  } catch {
    return null;
  }
}

/** 마지막으로 연 화면 중 다시 열 만한 앱 안 주소만 남긴다 */
function rememberableUrl(url, origin) {
  try {
    const u = new URL(url);
    if (u.origin !== origin) return null;
    return u.searchParams.get("project") ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}

module.exports = { INTERVALS, DEFAULTS, normalizeSettings, nextAt, pathsFromUrl, rememberableUrl };
