import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_TREND_WINDOW,
  TREND_WINDOW_OPTIONS,
  buildTrendBuckets,
  normalizeWindowMonths,
  parseCodesParam,
} from '@/lib/trends';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || '';
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const personId = url.searchParams.get('personId') || '';
    const codes = parseCodesParam(url.searchParams.get('codes'));
    const windowMonthsParam = url.searchParams.get('windowMonths');

    if (!personId) {
      return NextResponse.json({ error: 'personId required' }, { status: 400 });
    }
    if (codes.length === 0) {
      return NextResponse.json({ error: 'codes required' }, { status: 400 });
    }

    const windowMonths = normalizeWindowMonths(windowMonthsParam ? Number(windowMonthsParam) : DEFAULT_TREND_WINDOW);

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const observations = await prisma.observation.findMany({
      where: {
        personId,
        code: { in: codes },
        valueNum: { not: null },
        effectiveAt: { not: null },
      },
      orderBy: [{ code: 'asc' }, { effectiveAt: 'asc' }],
    });

    const buckets = buildTrendBuckets(codes, observations, windowMonths, new Date());

    return NextResponse.json({
      personId,
      codes,
      windowMonths,
      windowOptions: TREND_WINDOW_OPTIONS,
      buckets,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
