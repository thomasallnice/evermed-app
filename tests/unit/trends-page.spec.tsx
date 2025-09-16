import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { TrendBucket, TrendSeriesPoint } from '@/lib/trends';
import { Sparkline, TrendCard, TrendDetails } from '../../apps/web/src/app/trends/page';

const sampleSeries: TrendSeriesPoint[] = [
  {
    date: '2025-01-01',
    value: 100,
    unit: 'mg/dL',
    refLow: 70,
    refHigh: 110,
    sourceDocId: 'doc-1',
  },
  {
    date: '2025-02-01',
    value: 90,
    unit: 'mg/dL',
    refLow: 70,
    refHigh: 110,
    sourceDocId: 'doc-2',
  },
  {
    date: '2025-03-01',
    value: 95,
    unit: 'mg/dL',
    refLow: 70,
    refHigh: 110,
    sourceDocId: 'doc-3',
  },
];

const bucket: TrendBucket = {
  code: '2345-7',
  series: sampleSeries,
  latest: { value: 95, unit: 'mg/dL', date: '2025-03-01' },
  delta: { value: -5, since: '2025-01-01' },
  trend: { slope: -0.05, windowDays: 60 },
  outOfRange: false,
};

describe('Trends UI components', () => {
  it('renders sparkline svg', () => {
    const { container } = render(<Sparkline series={sampleSeries} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders card with latest value and calls open handler', () => {
    const onOpen = vi.fn();
    render(<TrendCard bucket={bucket} isActive={false} onOpen={onOpen} />);
    expect(screen.getByText('Glucose')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders detail panel table', () => {
    const onClose = vi.fn();
    const onOpenDoc = vi.fn();
    render(
      <TrendDetails
        code="2345-7"
        bucket={bucket}
        timeline={sampleSeries}
        loading={false}
        error={null}
        onClose={onClose}
        onOpenDocument={onOpenDoc}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const buttons = screen.getAllByText('Open document');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(onOpenDoc).toHaveBeenCalledTimes(1);
  });
});
