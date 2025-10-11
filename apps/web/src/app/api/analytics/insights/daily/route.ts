import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Missing date parameter' },
        { status: 400 }
      );
    }

    // Get person ID
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    // Parse date
    const selectedDate = new Date(dateParam);
    selectedDate.setHours(0, 0, 0, 0);

    // Fetch stored metabolic insights for the day
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

    // Format insights for the dashboard
    const insights = storedInsights.map((insight: any) => {
      const data = insight.insightData as any;
      return {
        id: insight.id,
        type: data.type || 'tip',
        title: data.title || 'Daily Insight',
        description: data.description || '',
      };
    });

    // If no stored insights, return empty array (dashboard will show empty state)
    return NextResponse.json(
      {
        insights,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('Insights daily error:', e);
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
