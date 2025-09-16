'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { TrendBucket, TrendSeriesPoint } from '@/lib/trends';
import { TREND_WINDOW_OPTIONS } from '@/lib/trends';
import { TREND_CODE_DEFINITIONS, topTrendCodes } from '@/lib/trend-catalog';
import { TRENDS_DISCLAIMER } from '@/lib/copy';

interface TrendResponse {
  personId: string;
  codes: string[];
  windowMonths: number;
  buckets: TrendBucket[];
}

interface TimelineResponse {
  series: TrendSeriesPoint[];
}

interface PersonOption {
  id: string;
  label: string;
}

const DEFAULT_CODES = topTrendCodes(6);
const DEFAULT_WINDOW = 12;

export default function TrendsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [personId, setPersonId] = useState<string>('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>(DEFAULT_CODES);
  const [windowMonths, setWindowMonths] = useState<number>(DEFAULT_WINDOW);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<TrendBucket[]>([]);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TrendSeriesPoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setUserId(user.id);
      const res = await fetch('/api/persons', { headers: { 'x-user-id': user.id } });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Unable to load people');
        return;
      }
      const options: PersonOption[] = (json.persons || []).map((person: any) => ({
        id: person.id,
        label: [person.givenName, person.familyName].filter(Boolean).join(' ') || person.id,
      }));
      setPersons(options);
      if (options[0]) {
        setPersonId(options[0].id);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!userId || !personId || selectedCodes.length === 0) return;
    let cancelled = false;
    async function loadTrends() {
      try {
        setLoading(true);
        setError(null);
       const params = new URLSearchParams({
         personId,
         codes: selectedCodes.join(','),
         windowMonths: String(windowMonths),
       });
        const res = await fetch(`/api/trends?${params.toString()}`, {
          headers: { 'x-user-id': userId! },
        });
        const json: TrendResponse = await res.json();
        if (!res.ok) {
          throw new Error((json as any)?.error || 'Failed to load trends');
        }
        if (!cancelled) {
          setBuckets(json.buckets || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load trends');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTrends();
    return () => {
      cancelled = true;
    };
  }, [userId, personId, selectedCodes, windowMonths]);

  useEffect(() => {
    if (!activeCode) {
      setTimeline([]);
      setTimelineError(null);
      return;
    }
    if (!userId || !personId) return;
    let cancelled = false;
    async function loadTimeline() {
      try {
        setTimelineLoading(true);
        setTimelineError(null);
        const params = new URLSearchParams({ personId, code: activeCode!, windowMonths: String(windowMonths) });
        const res = await fetch(`/api/observations?${params.toString()}`, {
          headers: { 'x-user-id': userId! },
        });
        const json: TimelineResponse | { error?: string } = await res.json();
        if (!res.ok) throw new Error((json as any)?.error || 'Failed to load timeline');
        if (!cancelled) setTimeline((json as TimelineResponse).series || []);
      } catch (e: any) {
        if (!cancelled) setTimelineError(e?.message || 'Failed to load timeline');
      } finally {
        if (!cancelled) setTimelineLoading(false);
      }
    }
    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [activeCode, userId, personId, windowMonths]);

  const codeOptions = useMemo(() => TREND_CODE_DEFINITIONS, []);

  const activeBucket = buckets.find((bucket) => bucket.code === activeCode) || null;

  function toggleCode(code: string) {
    setSelectedCodes((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // must keep one code selected
        return prev.filter((item) => item !== code);
      }
      return [...prev, code];
    });
  }

  async function openDocument(docId: string) {
    if (!userId) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { headers: { 'x-user-id': userId } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Unable to fetch document');
      if (json?.signedUrl) {
        window.open(json.signedUrl, '_blank', 'noopener');
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to open document');
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Trend Views</h1>
        <p className="text-sm text-neutral-600 max-w-3xl">{TRENDS_DISCLAIMER}</p>
      </header>

      <section aria-label="Filters" className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm">
            Person
            <select
              className="ml-2 rounded border px-2 py-1"
              value={personId}
              onChange={(event) => setPersonId(event.target.value)}
              disabled={persons.length === 0}
            >
              {persons.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label || option.id}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-wrap gap-2" aria-label="Time window">
            {TREND_WINDOW_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`px-3 py-1 rounded-full border text-sm ${windowMonths === option ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-300'}`}
                onClick={() => setWindowMonths(option)}
              >
                {option} mo
              </button>
            ))}
          </fieldset>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lab codes">
          {codeOptions.map((option) => {
            const active = selectedCodes.includes(option.code);
            return (
              <button
                key={option.code}
                type="button"
                className={`px-3 py-1 rounded-full border text-sm transition ${
                  active ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-neutral-300 text-neutral-700'
                }`}
                onClick={() => toggleCode(option.code)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {error && <div className="text-sm text-red-600" role="alert">{error}</div>}
      {loading && <div>Loading trends…</div>}

      {!loading && buckets.length === 0 && (
        <p className="text-sm text-neutral-600">No observations found for the selected labs and window.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {buckets.map((bucket) => (
          <TrendCard
            key={bucket.code}
            bucket={bucket}
            isActive={activeCode === bucket.code}
            onOpen={() => setActiveCode(bucket.code)}
          />
        ))}
      </div>

      <TrendDetails
        code={activeCode}
        bucket={activeBucket}
        timeline={timeline}
        loading={timelineLoading}
        error={timelineError}
        onClose={() => setActiveCode(null)}
        onOpenDocument={openDocument}
      />
    </div>
  );
}

export function TrendCard({ bucket, isActive, onOpen }: { bucket: TrendBucket; isActive: boolean; onOpen: () => void }) {
  const { latest, delta, series, outOfRange } = bucket;
  const label = TREND_CODE_DEFINITIONS.find((item) => item.code === bucket.code)?.label || bucket.code;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`border rounded-lg p-4 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
        isActive ? 'ring-2 ring-sky-500' : 'ring-0'
      }`}
      aria-pressed={isActive}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{label}</h2>
          <p className="text-xs text-neutral-500">Code: {bucket.code}</p>
        </div>
        {outOfRange && <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Out of range</span>}
      </div>
      <div className="mt-4 space-y-2">
        {latest ? (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{latest.value}</span>
            {latest.unit && <span className="text-sm text-neutral-600">{latest.unit}</span>}
            <span className="text-xs text-neutral-500">{formatDate(latest.date)}</span>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">No recent results.</p>
        )}
        <Sparkline series={series} />
        {delta && (
          <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
            delta.value >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {delta.value >= 0 ? '+' : ''}{delta.value} since {formatDate(delta.since)}
          </span>
        )}
      </div>
    </article>
  );
}

export function Sparkline({ series }: { series: TrendSeriesPoint[] }) {
  if (series.length === 0) {
    return <div className="h-16 bg-neutral-100 rounded" aria-hidden="true" />;
  }
  const width = 200;
  const height = 70;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = range * 0.1;
  const domainMin = min - padding;
  const domainMax = max + padding;
  const band = computeReferenceBand(series, domainMin, domainMax, height);
  const points = series
    .map((point, index) => {
      const x = series.length === 1 ? width / 2 : (index / (series.length - 1)) * width;
      const y = scaleValue(point.value, domainMin, domainMax, height);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" role="img" aria-hidden="true">
      {band && <rect x={0} y={band.y} width={width} height={band.height} fill="rgba(125,211,252,0.25)" />}
      <polyline
        points={points}
        fill="none"
        stroke="#0284c7"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function computeReferenceBand(
  series: TrendSeriesPoint[],
  domainMin: number,
  domainMax: number,
  height: number,
): { y: number; height: number } | null {
  const latest = series[series.length - 1];
  if (typeof latest.refLow !== 'number' || typeof latest.refHigh !== 'number') return null;
  const low = scaleValue(latest.refHigh, domainMin, domainMax, height);
  const high = scaleValue(latest.refLow, domainMin, domainMax, height);
  const rectY = Math.min(low, high);
  const rectHeight = Math.abs(high - low) || 2;
  return { y: rectY, height: rectHeight };
}

function scaleValue(value: number, min: number, max: number, height: number): number {
  if (max - min === 0) return height / 2;
  const normalized = (value - min) / (max - min);
  const y = height - normalized * height;
  if (y < 0) return 0;
  if (y > height) return height;
  return y;
}

export function TrendDetails({
  code,
  bucket,
  timeline,
  loading,
  error,
  onClose,
  onOpenDocument,
}: {
  code: string | null;
  bucket: TrendBucket | null;
  timeline: TrendSeriesPoint[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onOpenDocument: (docId: string) => void;
}) {
  if (!code) return null;
  const label = TREND_CODE_DEFINITIONS.find((item) => item.code === code)?.label || code;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-40" role="dialog" aria-modal="true">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-xl shadow-lg max-h-full overflow-auto">
        <header className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{label} timeline</h2>
            {bucket?.latest && (
              <p className="text-sm text-neutral-600">
                Latest: {bucket.latest.value} {bucket.latest.unit || ''} on {formatDate(bucket.latest.date)}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-neutral-600 hover:text-neutral-900">
            Close
          </button>
        </header>
        <div className="p-4 space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {loading && <div className="text-sm">Loading…</div>}
          {!loading && timeline.length === 0 && <p className="text-sm text-neutral-600">No data in this window.</p>}
          {timeline.length > 0 && (
            <table className="w-full text-sm border">
              <thead className="bg-neutral-100 text-left">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((point) => (
                  <tr key={`${point.sourceDocId}-${point.date}`} className="odd:bg-white even:bg-neutral-50">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(point.date)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {point.value} {point.unit || ''}
                    </td>
                    <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">
                      {typeof point.refLow === 'number' && typeof point.refHigh === 'number'
                        ? `${point.refLow} – ${point.refHigh}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-sky-700 hover:underline"
                        onClick={() => onOpenDocument(point.sourceDocId)}
                      >
                        Open document
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
