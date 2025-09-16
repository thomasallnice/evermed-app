import { describe, it, expect, afterAll } from 'vitest';
import crypto from 'node:crypto';
import type { Observation } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { buildTrendForCode, buildTrendBuckets, normalizeWindowMonths } from '../../apps/web/src/lib/trends';

function makeObservation(overrides: Partial<Observation>): Observation {
  return {
    id: overrides.id || crypto.randomUUID(),
    personId: overrides.personId || 'person-test',
    code: overrides.code || '718-7',
    display: overrides.display || 'Test',
    valueNum: overrides.valueNum ?? 0,
    unit: overrides.unit || 'unit',
    refLow: overrides.refLow ?? null,
    refHigh: overrides.refHigh ?? null,
    effectiveAt: overrides.effectiveAt || new Date(),
    sourceDocId: overrides.sourceDocId || 'doc-1',
    sourceAnchor: overrides.sourceAnchor ?? null,
  };
}

describe('trend helpers', () => {
  it('builds trend bucket with delta and slope', () => {
    const now = new Date('2025-03-05T00:00:00Z');
    const observations: Observation[] = [
      makeObservation({
        code: '4548-4',
        valueNum: 2.5,
        unit: 'mIU/L',
        refLow: 0.4,
        refHigh: 4,
        effectiveAt: new Date('2025-01-05T00:00:00Z'),
        sourceDocId: 'doc-early',
      }),
      makeObservation({
        code: '4548-4',
        valueNum: 2.1,
        unit: 'mIU/L',
        refLow: 0.4,
        refHigh: 4,
        effectiveAt: new Date('2025-03-05T00:00:00Z'),
        sourceDocId: 'doc-late',
      }),
    ];
    const bucket = buildTrendForCode('4548-4', observations, 12, now);
    expect(bucket.series).toHaveLength(2);
    expect(bucket.delta).not.toBeNull();
    expect(bucket.delta?.value).toBeCloseTo(-0.4, 2);
    expect(bucket.latest?.date).toBe('2025-03-05');
    expect(bucket.trend?.windowDays).toBe(59);
    expect(bucket.outOfRange).toBe(false);
  });

  it('flags out-of-range using reference', () => {
    const now = new Date('2025-03-05T00:00:00Z');
    const bucket = buildTrendForCode(
      '2345-7',
      [
        makeObservation({
          code: '2345-7',
          valueNum: 140,
          unit: 'mg/dL',
          refLow: 70,
          refHigh: 99,
          effectiveAt: new Date('2025-02-01T00:00:00Z'),
        }),
      ],
      12,
      now,
    );
    expect(bucket.outOfRange).toBe(true);
    expect(bucket.delta).toBeNull();
    expect(bucket.trend).toBeNull();
  });

  it('normalizes windows to defaults', () => {
    expect(normalizeWindowMonths(undefined)).toBe(12);
    expect(normalizeWindowMonths(3)).toBe(3);
    expect(normalizeWindowMonths(10)).toBe(12);
  });

  it('computes slope for monotonic increase', () => {
    const series = buildTrendBuckets(
      ['718-7'],
      [
        makeObservation({ code: '718-7', valueNum: 10, effectiveAt: new Date('2025-01-01T00:00:00Z') }),
        makeObservation({ code: '718-7', valueNum: 12, effectiveAt: new Date('2025-02-01T00:00:00Z') }),
        makeObservation({ code: '718-7', valueNum: 14, effectiveAt: new Date('2025-03-01T00:00:00Z') }),
      ],
      12,
      new Date('2025-03-02T00:00:00Z'),
    );
    const slope = series[0].trend?.slope ?? 0;
    expect(slope).toBeGreaterThan(0);
  });
});

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

describe.runIf(hasDb)('trends APIs', () => {
  const prisma = new PrismaClient();

  it('returns trend buckets for requested codes', async () => {
    const ownerId = crypto.randomUUID();
    const person = await prisma.person.create({ data: { ownerId } });
    const doc = await prisma.document.create({
      data: {
        personId: person.id,
        kind: 'pdf',
        filename: 'labs.pdf',
        storagePath: 'documents/labs.pdf',
        sha256: 'hash',
      },
    });
    await prisma.observation.createMany({
      data: [
        {
          personId: person.id,
          code: '4548-4',
          display: 'TSH',
          valueNum: 2.1,
          unit: 'mIU/L',
          refLow: 0.4,
          refHigh: 4,
          effectiveAt: new Date('2025-01-10T00:00:00Z'),
          sourceDocId: doc.id,
          sourceAnchor: 'p1',
        },
        {
          personId: person.id,
          code: '4548-4',
          display: 'TSH',
          valueNum: 2.3,
          unit: 'mIU/L',
          refLow: 0.4,
          refHigh: 4,
          effectiveAt: new Date('2025-03-01T00:00:00Z'),
          sourceDocId: doc.id,
          sourceAnchor: 'p2',
        },
        {
          personId: person.id,
          code: '2345-7',
          display: 'Glucose',
          valueNum: 95,
          unit: 'mg/dL',
          refLow: 70,
          refHigh: 99,
          effectiveAt: new Date('2025-02-15T00:00:00Z'),
          sourceDocId: doc.id,
          sourceAnchor: 'p3',
        },
      ],
    });

    const { GET } = await import('../../apps/web/src/app/api/trends/route');
    const url = new URL('http://localhost/api/trends');
    url.searchParams.set('personId', person.id);
    url.searchParams.set('codes', '4548-4,2345-7');
    const req = new Request(url.toString(), { headers: { 'x-user-id': ownerId } });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.buckets)).toBe(true);
    expect(json.buckets.length).toBe(2);
    const tsh = json.buckets.find((bucket: any) => bucket.code === '4548-4');
    expect(tsh.series).toHaveLength(2);
  });

  it('returns observation timeline for code', async () => {
    const ownerId = crypto.randomUUID();
    const person = await prisma.person.create({ data: { ownerId } });
    const doc = await prisma.document.create({
      data: {
        personId: person.id,
        kind: 'pdf',
        filename: 'labs2.pdf',
        storagePath: 'documents/labs2.pdf',
        sha256: 'hash2',
      },
    });
    await prisma.observation.create({
      data: {
        personId: person.id,
        code: '33914-3',
        display: 'eGFR',
        valueNum: 88,
        unit: 'mL/min',
        refLow: 60,
        refHigh: 120,
        effectiveAt: new Date('2025-02-01T00:00:00Z'),
        sourceDocId: doc.id,
        sourceAnchor: 'p5',
      },
    });

    const { GET } = await import('../../apps/web/src/app/api/observations/route');
    const url = new URL('http://localhost/api/observations');
    url.searchParams.set('personId', person.id);
    url.searchParams.set('code', '33914-3');
    const req = new Request(url.toString(), { headers: { 'x-user-id': ownerId } });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.series).toHaveLength(1);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
