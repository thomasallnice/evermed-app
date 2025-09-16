import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { buildTrendForCode, normalizeWindowMonths, parseCodesParam } from '@/lib/trends';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || '';
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const personId = url.searchParams.get('personId') || '';
    const codeParam = url.searchParams.get('code');
    const codes = parseCodesParam(codeParam);
    const windowMonthsParam = url.searchParams.get('windowMonths');

    if (!personId) {
      return NextResponse.json({ error: 'personId required' }, { status: 400 });
    }
    const code = codes[0];
    if (!code) {
      return NextResponse.json({ error: 'code required' }, { status: 400 });
    }

    const windowMonths = normalizeWindowMonths(windowMonthsParam ? Number(windowMonthsParam) : undefined);

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const observations = await prisma.observation.findMany({
      where: {
        personId,
        code,
        valueNum: { not: null },
        effectiveAt: { not: null },
      },
      orderBy: [{ effectiveAt: 'asc' }],
    });

    const bucket = buildTrendForCode(code, observations, windowMonths, new Date());

    return NextResponse.json({
      personId,
      code,
      windowMonths,
      series: bucket.series,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
