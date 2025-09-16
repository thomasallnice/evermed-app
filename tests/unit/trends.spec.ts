import { describe, it, expect, vi } from 'vitest';
import { computeTrendSnippet } from '@/lib/trends';

describe('computeTrendSnippet', () => {
  it('calculates delta and out-of-range flag', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-10T00:00:00Z'));

    const snippet = computeTrendSnippet([
      { valueNum: 2.5, effectiveAt: new Date('2025-01-01T00:00:00Z'), refLow: 0.4, refHigh: 4 },
      { valueNum: 2.1, effectiveAt: new Date('2025-03-01T00:00:00Z'), refLow: 0.4, refHigh: 4 },
    ]);

    expect(snippet).not.toBeNull();
    expect(snippet?.delta).toBeCloseTo(-0.4, 2);
    expect(snippet?.windowDays).toBeGreaterThan(0);
    expect(snippet?.outOfRange).toBe(false);

    vi.useRealTimers();
  });
});
