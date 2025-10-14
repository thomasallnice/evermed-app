import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

const prisma = new PrismaClient();

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('[INSIGHTS API] Request received')
  try {
    const userId = await requireUserId(req);
    console.log(`[INSIGHTS API] User ID: ${userId}`)

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    console.log(`[INSIGHTS API] Date parameter: ${dateParam}`)

    if (!dateParam) {
      console.error('[INSIGHTS API] Missing date parameter')
      return NextResponse.json(
        { error: 'Missing date parameter' },
        { status: 400 }
      );
    }

    // Get person ID
    console.log('[INSIGHTS API] Fetching person record...')
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!person) {
      console.error('[INSIGHTS API] Person record not found')
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    console.log(`[INSIGHTS API] Person ID: ${person.id}`)

    // Parse date
    const selectedDate = new Date(dateParam);
    selectedDate.setHours(0, 0, 0, 0);

    console.log(`[INSIGHTS API] Selected date: ${selectedDate.toISOString()}`)

    // Fetch stored metabolic insights for the day
    console.log('[INSIGHTS API] Fetching metabolic insights...')
    const storedInsights = await prisma.metabolicInsight.findMany({
      where: {
        personId: person.id,
        date: selectedDate,
      },
      select: {
        id: true,
        insightType: true,
        insightData: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[INSIGHTS API] Found ${storedInsights.length} insights`)

    // Format insights for the dashboard
    console.log('[INSIGHTS API] Formatting insights...')
    const insights = storedInsights.map((insight: any) => {
      const data = insight.insightData as any;
      return {
        id: insight.id,
        type: data.type || 'tip',
        title: data.title || 'Daily Insight',
        description: data.description || '',
      };
    });

    console.log(`[INSIGHTS API] ✓ Success! Returning ${insights.length} insights`)

    // If no stored insights, return empty array (dashboard will show empty state)
    return NextResponse.json(
      {
        insights,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('[INSIGHTS API] ❌ Error:', e);
    console.error('[INSIGHTS API] Error message:', e?.message);
    console.error('[INSIGHTS API] Error stack:', e?.stack);
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
