const pad = (n: number) => String(n).padStart(2, "0");

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 로컬 날짜 키 YYYY-MM-DD */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatTime(t: number): string {
  const d = new Date(t);
  const h = d.getHours();
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())}`;
}

export function formatDate(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** "오늘 오후 2:05", "어제 오후 3:20", "11월 17일 오후 8:02" */
export function formatRelative(t: number, now: number): string {
  const diff = Math.round((startOfDay(now) - startOfDay(t)) / 86_400_000);
  const day = diff === 0 ? "오늘" : diff === 1 ? "어제" : formatDate(t);
  return `${day} ${formatTime(t)}`;
}

export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 ${min % 60}분`;
  return `${Math.floor(h / 24)}일 ${h % 24}시간`;
}
