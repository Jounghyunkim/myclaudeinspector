/** 데스크톱 앱이 띄운 서버인지. Electron이 서버를 시작할 때 MCI_DESKTOP=1을 넘긴다. */
export function isDesktop(): boolean {
  return process.env.MCI_DESKTOP === "1";
}
