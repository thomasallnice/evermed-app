import { Observation } from '@prisma/client';

export const TREND_WINDOW_OPTIONS = [3, 6, 12, 24] as const;
export const DEFAULT_TREND_WINDOW = 12;

type WindowOption = (typeof TREND_WINDOW_OPTIONS)[number];

export type TrendSeriesPoint = {
  date: string;
  value: number;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  sourceDocId: string;
};

export type TrendLatest = {
  value: number;
  unit: string | null;
  date: string;
};

export type TrendDelta = {
  value: number;
  since: string;
};

export type TrendSlope = {
  slope: number;
  windowDays: number;
};

export type TrendBucket = {
  code: string;
  series: TrendSeriesPoint[];
  latest: TrendLatest | null;
  delta: TrendDelta | null;
  trend: TrendSlope | null;
  outOfRange: boolean;
};

export function normalizeWindowMonths(input: number | null | undefined): WindowOption {
  const allowed = new Set<number>(TREND_WINDOW_OPTIONS);
  if (!input || !allowed.has(input)) return DEFAULT_TREND_WINDOW;
  return input as WindowOption;
}

export function subtractMonths(base: Date, months: number): Date {
  const dt = new Date(base);
  dt.setMonth(dt.getMonth() - months);
  return dt;
}

export function buildTrendForCode(
  code: string,
  observations: Observation[],
  windowMonths: number,
  now = new Date(),
): TrendBucket {
  const windowStart = subtractMonths(now, windowMonths);
  const filtered = observations
    .filter((obs) => obs.code === code)
    .filter((obs) => obs.valueNum !== null && obs.valueNum !== undefined)
    .filter((obs) => obs.effectiveAt)
    .filter((obs) => (obs.effectiveAt ? obs.effectiveAt >= windowStart : false))
    .sort((a, b) => {
      const at = a.effectiveAt ? a.effectiveAt.getTime() : 0;
      const bt = b.effectiveAt ? b.effectiveAt.getTime() : 0;
      return at - bt;
    });

  const series: TrendSeriesPoint[] = filtered.map((obs) => ({
    date: obs.effectiveAt!.toISOString().slice(0, 10),
    value: Number(obs.valueNum!),
    unit: obs.unit ?? null,
    refLow: obs.refLow ?? null,
    refHigh: obs.refHigh ?? null,
    sourceDocId: obs.sourceDocId,
  }));

  if (series.length === 0) {
    return {
      code,
      series: [],
      latest: null,
      delta: null,
      trend: null,
      outOfRange: false,
    };
  }

  const latestPoint = series[series.length - 1];
  const earliestPoint = series[0];

  const latest: TrendLatest = {
    value: Number(latestPoint.value),
    unit: latestPoint.unit,
    date: latestPoint.date,
  };

  const delta: TrendDelta | null = series.length > 1
    ? {
        value: Number((latestPoint.value - earliestPoint.value).toFixed(2)),
        since: earliestPoint.date,
      }
    : null;

  const windowDaysRaw = Math.max(
    1,
    Math.round(
      (new Date(latestPoint.date).getTime() - new Date(earliestPoint.date).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  const slope = calculateSlope(series);
  const trend: TrendSlope | null = series.length > 1
    ? { slope: Number(slope.toFixed(4)), windowDays: windowDaysRaw }
    : null;

  const outOfRange = isOutOfRange(latestPoint);

  return {
    code,
    series,
    latest,
    delta,
    trend,
    outOfRange,
  };
}

export function buildTrendBuckets(
  codes: string[],
  observations: Observation[],
  windowMonths: number,
  now = new Date(),
): TrendBucket[] {
  const uniqueCodes = Array.from(new Set(codes));
  return uniqueCodes.map((code) => buildTrendForCode(code, observations, windowMonths, now));
}

export function calculateSlope(series: TrendSeriesPoint[]): number {
  if (series.length < 2) return 0;
  const baseTime = new Date(series[0].date).getTime();
  const xs = series.map((point) => (new Date(point.date).getTime() - baseTime) / (1000 * 60 * 60 * 24));
  const ys = series.map((point) => point.value);
  const xMean = xs.reduce((acc, val) => acc + val, 0) / xs.length;
  const yMean = ys.reduce((acc, val) => acc + val, 0) / ys.length;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const xDiff = xs[i] - xMean;
    numerator += xDiff * (ys[i] - yMean);
    denominator += xDiff * xDiff;
  }
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function isOutOfRange(point: TrendSeriesPoint): boolean {
  const { value, refLow, refHigh } = point;
  if (typeof refLow === 'number' && value < refLow) return true;
  if (typeof refHigh === 'number' && value > refHigh) return true;
  return false;
}

export function parseCodesParam(codesParam: string | null): string[] {
  if (!codesParam) return [];
  return Array.from(
    new Set(
      codesParam
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  );
}

