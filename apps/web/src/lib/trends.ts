const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type TrendSource = {
  valueNum: number | null;
  effectiveAt: Date | null;
  refLow?: number | null;
  refHigh?: number | null;
};

export type TrendSnippet = {
  delta: number;
  windowDays: number;
  outOfRange: boolean;
};

export function computeTrendSnippet(points: TrendSource[], windowDays = 180): TrendSnippet | null {
  const cutoff = new Date(Date.now() - windowDays * MS_PER_DAY);
  const filtered = points
    .filter((p) => typeof p.valueNum === 'number' && p.effectiveAt)
    .filter((p) => (p.effectiveAt as Date) >= cutoff)
    .sort((a, b) => (a.effectiveAt as Date).getTime() - (b.effectiveAt as Date).getTime());

  if (filtered.length === 0) {
    return null;
  }

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const delta = Number(((last.valueNum as number) - (first.valueNum as number)).toFixed(2));
  const spanMs = Math.max(0, (last.effectiveAt as Date).getTime() - (first.effectiveAt as Date).getTime());
  const spanDays = Math.max(1, Math.round(spanMs / MS_PER_DAY));
  const outOfRange =
    (typeof last.refLow === 'number' && (last.valueNum as number) < (last.refLow as number)) ||
    (typeof last.refHigh === 'number' && (last.valueNum as number) > (last.refHigh as number));

  return {
    delta,
    windowDays: spanDays,
    outOfRange,
  };
}

export function groupByCode<T extends { code: string }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    if (!acc[item.code]) acc[item.code] = [];
    acc[item.code].push(item);
    return acc;
  }, {});
}
