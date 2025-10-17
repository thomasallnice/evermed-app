import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';
import { generateDailyInsights, detectGlucosePatterns } from '@/lib/analytics/daily-insights';
import { METABOLIC_INSIGHTS_DISCLAIMER } from '@/lib/copy';

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
    const generate = searchParams.get('generate') === 'true'; // Optional: force regeneration

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

    // Check if insights already exist
    const existing = await prisma.metabolicInsight.findFirst({
      where: {
        personId: person.id,
        date: selectedDate,
        insightType: 'daily_summary',
      },
    });

    // Generate insights if they don't exist or regeneration is requested
    if (!existing || generate) {
      console.log('[INSIGHTS API] Generating new insights...')
      try {
        await generateDailyInsights(person.id, selectedDate);
        console.log('[INSIGHTS API] ✓ Insights generated successfully')
      } catch (genError: any) {
        console.error('[INSIGHTS API] Failed to generate insights:', genError)
        // Continue to fetch any existing insights even if generation fails
      }
    }

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

    // Get pattern insights if we have enough historical data (7+ days)
    const sevenDaysAgo = new Date(selectedDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let patterns: Array<{ type: string; description: string; confidence: string }> = [];
    try {
      const patternData = await detectGlucosePatterns(person.id, sevenDaysAgo, selectedDate);
      patterns = patternData.patterns;
      console.log(`[INSIGHTS API] Detected ${patterns.length} patterns`)
    } catch (patternError) {
      console.warn('[INSIGHTS API] Pattern detection failed (likely insufficient data):', patternError)
    }

    // Format insights for the dashboard
    console.log('[INSIGHTS API] Formatting insights...')
    const insights: Array<{
      id: string;
      type: 'pattern' | 'warning' | 'tip';
      title: string;
      description: string;
    }> = [];

    // Add daily summary insights
    storedInsights.forEach((insight: any) => {
      const data = insight.insightData as any;

      // Generate insight cards from daily summary data
      if (insight.insightType === 'daily_summary') {
        // Time in range insight
        if (data.timeInRange !== undefined) {
          const tir = Math.round(data.timeInRange);
          if (tir >= 70) {
            insights.push({
              id: `${insight.id}-tir`,
              type: 'pattern',
              title: `${tir}% Time in Range`,
              description: 'Great job! You spent most of your day in the target glucose range (70-180 mg/dL).',
            });
          } else if (tir >= 50) {
            insights.push({
              id: `${insight.id}-tir`,
              type: 'tip',
              title: `${tir}% Time in Range`,
              description: 'You spent about half your day in target range. Aim for at least 70% to improve glucose control.',
            });
          } else {
            insights.push({
              id: `${insight.id}-tir`,
              type: 'warning',
              title: `${tir}% Time in Range`,
              description: 'Your time in target range was low. Review your meals and consult your healthcare provider.',
            });
          }
        }

        // Spike count insight
        if (data.spikeCount !== undefined && data.spikeCount > 0) {
          if (data.spikeCount >= 4) {
            insights.push({
              id: `${insight.id}-spikes`,
              type: 'warning',
              title: `${data.spikeCount} Glucose Spikes`,
              description: 'You had several glucose spikes today (>180 mg/dL). Consider smaller portions or lower-carb options.',
            });
          } else if (data.spikeCount >= 2) {
            insights.push({
              id: `${insight.id}-spikes`,
              type: 'tip',
              title: `${data.spikeCount} Glucose Spikes`,
              description: 'You had a few glucose spikes. Try pairing carbs with protein and fiber to reduce spikes.',
            });
          }
        }

        // Best meal insight
        if (data.bestMeal) {
          insights.push({
            id: `${insight.id}-best`,
            type: 'pattern',
            title: 'Best Meal Today',
            description: `${data.bestMeal.name} had minimal glucose impact (+${Math.round(data.bestMeal.glucoseChange)} mg/dL). Consider similar meals more often!`,
          });
        }

        // Worst meal insight
        if (data.worstMeal && data.worstMeal.glucoseChange > 50) {
          insights.push({
            id: `${insight.id}-worst`,
            type: 'warning',
            title: 'High-Impact Meal',
            description: `${data.worstMeal.name} caused a significant glucose rise (+${Math.round(data.worstMeal.glucoseChange)} mg/dL). Consider adjusting portion or timing.`,
          });
        }
      }
    });

    // Add pattern insights (from 7-day analysis)
    patterns.forEach((pattern, index) => {
      let insightType: 'pattern' | 'warning' | 'tip' = 'tip';
      if (pattern.type === 'improving_trend' || pattern.type === 'consistent_meals') {
        insightType = 'pattern';
      } else if (pattern.type === 'high_glucose_trend' || pattern.type === 'frequent_spikes') {
        insightType = 'warning';
      }

      insights.push({
        id: `pattern-${index}`,
        type: insightType,
        title: pattern.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: pattern.description,
      });
    });

    console.log(`[INSIGHTS API] ✓ Success! Returning ${insights.length} formatted insights`)

    return NextResponse.json(
      {
        insights,
        disclaimer: METABOLIC_INSIGHTS_DISCLAIMER,
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
