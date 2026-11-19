import { METRICS, type MetricDef, type ParticipantStats } from "./metrics";

export type RankEntry = {
  rank: number;
  nickname: string;
  value: number;
  /** Share of other participants this one beats or ties, 0–100. */
  percentile: number;
};

/** Participants with no session in the period are left out of every ranking. */
export function activeOnly(stats: ParticipantStats[]): ParticipantStats[] {
  return stats.filter((s) => s.sessions > 0);
}

/** Competition ranking (1, 2, 2, 4) by one metric. */
export function rankBy(stats: ParticipantStats[], metric: MetricDef): RankEntry[] {
  const rows = activeOnly(stats).map((s) => ({ nickname: s.nickname, value: metric.value(s) }));
  const sign = metric.better === "high" ? -1 : 1;
  rows.sort((a, b) => sign * (a.value - b.value) || a.nickname.localeCompare(b.nickname));
  const n = rows.length;
  return rows.map((r) => {
    const rank = 1 + rows.filter((o) => sign * (o.value - r.value) < 0).length;
    const beaten = rows.filter((o) => sign * (o.value - r.value) >= 0).length - 1;
    return { rank, nickname: r.nickname, value: r.value, percentile: n > 1 ? Math.round((beaten / (n - 1)) * 100) : 100 };
  });
}

export type MetricComparison = {
  metric: MetricDef;
  average: number;
  participants: number;
  /** Requested nicknames that have data in the period, in request order. */
  values: ({ nickname: string } & Omit<RankEntry, "nickname">)[];
};

/** Every metric for the requested nicknames, with their rank and the group average. */
export function compare(stats: ParticipantStats[], nicknames: string[]): MetricComparison[] {
  const active = activeOnly(stats);
  return METRICS.map((metric) => {
    const ranking = rankBy(active, metric);
    const average = ranking.length ? ranking.reduce((sum, r) => sum + r.value, 0) / ranking.length : 0;
    const values = nicknames.flatMap((nickname) => {
      const entry = ranking.find((r) => r.nickname === nickname);
      return entry ? [entry] : [];
    });
    return { metric, average: Math.round(average * 10) / 10, participants: ranking.length, values };
  });
}
