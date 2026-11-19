/** One day of aggregated usage for one participant. Only numbers, never content or paths. */
export type DailyUsage = {
  day: string; // YYYY-MM-DD (local date of the submitter)
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  sessions: number;
  messages: number;
  activeMinutes: number;
  toolCalls: number;
  skillCalls: number;
  mcpCalls: number;
  subagentCalls: number;
  compactions: number;
  clears: number;
  maxConcurrent: number;
  peakContextPct: number;
  avgContextPct: number;
  over70Sessions: number;
};

/** Totals for one participant over a period, as returned by `ranking_period_stats`. */
export type ParticipantStats = {
  nickname: string;
  lastSubmittedAt: string;
  activeDays: number;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  sessions: number;
  messages: number;
  activeMinutes: number;
  toolCalls: number;
  skillCalls: number;
  mcpCalls: number;
  subagentCalls: number;
  compactions: number;
  clears: number;
  maxConcurrent: number;
  peakContextPct: number;
  avgContextPct: number;
  over70Sessions: number;
};

export type MetricUnit = "tokens" | "count" | "minutes" | "percent";

export type MetricDef = {
  key: string;
  label: string;
  group: "토큰" | "세션" | "시간" | "도구" | "컨텍스트";
  unit: MetricUnit;
  /** "low" means a smaller value ranks higher. */
  better: "high" | "low";
  description: string;
  value: (s: ParticipantStats) => number;
};

const ratio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export const METRICS: MetricDef[] = [
  {
    key: "totalTokens",
    label: "토큰 수",
    group: "토큰",
    unit: "tokens",
    better: "high",
    description: "입력, 출력, 캐시 쓰기 토큰의 합입니다. Claude에게 일을 얼마나 시켰는지 보여 줍니다.",
    value: (s) => s.inputTokens + s.outputTokens + s.cacheWriteTokens,
  },
  {
    key: "outputTokens",
    label: "출력 토큰",
    group: "토큰",
    unit: "tokens",
    better: "high",
    description: "Claude가 직접 써 낸 토큰입니다. 코드와 답변의 양에 가깝습니다.",
    value: (s) => s.outputTokens,
  },
  {
    key: "cacheHitRate",
    label: "캐시 적중률",
    group: "토큰",
    unit: "percent",
    better: "high",
    description: "입력 중 캐시에서 다시 읽은 비율입니다. 높을수록 같은 맥락을 싸고 빠르게 재사용했다는 뜻입니다.",
    value: (s) => ratio(s.cacheReadTokens, s.cacheReadTokens + s.cacheWriteTokens + s.inputTokens),
  },
  {
    key: "sessions",
    label: "세션(스레드) 수",
    group: "세션",
    unit: "count",
    better: "high",
    description: "새로 시작한 대화 수입니다. 작업을 잘게 나눠 새 세션으로 시작하면 늘어납니다.",
    value: (s) => s.sessions,
  },
  {
    key: "messages",
    label: "메시지 수",
    group: "세션",
    unit: "count",
    better: "high",
    description: "내가 보낸 메시지와 Claude 응답을 합한 수입니다.",
    value: (s) => s.messages,
  },
  {
    key: "maxConcurrent",
    label: "최대 동시 세션",
    group: "세션",
    unit: "count",
    better: "high",
    description: "하루 중 동시에 돌린 세션의 최대 개수입니다. 멀티 세션을 얼마나 활용하는지 보여 줍니다.",
    value: (s) => s.maxConcurrent,
  },
  {
    key: "activeMinutes",
    label: "사용 시간",
    group: "시간",
    unit: "minutes",
    better: "high",
    description: "대화 기록 사이 간격이 5분 이하인 구간을 더한 시간입니다.",
    value: (s) => s.activeMinutes,
  },
  {
    key: "activeDays",
    label: "사용한 날",
    group: "시간",
    unit: "count",
    better: "high",
    description: "기간 중 세션을 하나 이상 시작한 날의 수입니다.",
    value: (s) => s.activeDays,
  },
  {
    key: "toolCalls",
    label: "도구 호출",
    group: "도구",
    unit: "count",
    better: "high",
    description: "Claude가 파일 읽기, 명령 실행 같은 도구를 부른 횟수입니다. Agent처럼 쓸수록 늘어납니다.",
    value: (s) => s.toolCalls,
  },
  {
    key: "skillCalls",
    label: "Skill 사용",
    group: "도구",
    unit: "count",
    better: "high",
    description: "Skill을 불러 쓴 횟수입니다.",
    value: (s) => s.skillCalls,
  },
  {
    key: "mcpCalls",
    label: "MCP 호출",
    group: "도구",
    unit: "count",
    better: "high",
    description: "MCP 서버의 도구를 부른 횟수입니다.",
    value: (s) => s.mcpCalls,
  },
  {
    key: "subagentCalls",
    label: "Subagent 사용",
    group: "도구",
    unit: "count",
    better: "high",
    description: "Subagent에게 일을 맡긴 횟수입니다.",
    value: (s) => s.subagentCalls,
  },
  {
    key: "peakContextPct",
    label: "최대 컨텍스트",
    group: "컨텍스트",
    unit: "percent",
    better: "low",
    description: "한 세션에서 컨텍스트 윈도를 가장 많이 채운 비율입니다. 낮을수록 여유 있게 썼다는 뜻입니다.",
    value: (s) => s.peakContextPct,
  },
  {
    key: "over70Rate",
    label: "70% 넘은 세션 비율",
    group: "컨텍스트",
    unit: "percent",
    better: "low",
    description: "컨텍스트가 70%를 넘은 세션의 비율입니다. 낮을수록 컨텍스트를 잘 관리한 것입니다.",
    value: (s) => ratio(s.over70Sessions, s.sessions),
  },
  {
    key: "clears",
    label: "/clear 사용",
    group: "컨텍스트",
    unit: "count",
    better: "high",
    description: "`/clear`로 대화를 비우고 새로 시작한 횟수입니다.",
    value: (s) => s.clears,
  },
  {
    key: "compactions",
    label: "압축 횟수",
    group: "컨텍스트",
    unit: "count",
    better: "low",
    description: "컨텍스트가 차서 대화가 압축된 횟수입니다.",
    value: (s) => s.compactions,
  },
];

export const DEFAULT_METRIC = "totalTokens";
export const PERIODS = [
  { days: 1, label: "오늘" },
  { days: 7, label: "최근 7일" },
  { days: 30, label: "최근 30일" },
  { days: 0, label: "전체" },
] as const;
export const DEFAULT_PERIOD = 7;

export function findMetric(key: string | undefined | null): MetricDef | undefined {
  return METRICS.find((m) => m.key === key);
}

export function formatMetric(value: number, unit: MetricUnit): string {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "minutes") {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  }
  if (unit === "tokens") {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toLocaleString("ko-KR");
}
