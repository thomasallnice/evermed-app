/**
 * Admin Metabolic Insights Metrics API
 *
 * GET /api/admin/metabolic?timeRange=7d|30d|90d
 *
 * Returns aggregated, non-PHI metrics for monitoring Metabolic Insights adoption and performance.
 *
 * PRIVACY COMPLIANCE:
 * - All metrics are aggregated counts/averages (no individual user data)
 * - No user identifiers exposed
 * - No PHI (glucose values, meal names, patient data)
 *
 * PERFORMANCE:
 * - Database-level aggregations (Prisma groupBy/aggregate)
 * - Target: p95 < 2s for dashboard loads
 * - Caching: 5-minute TTL via Next.js revalidate
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cache dashboard queries for 5 minutes
export const revalidate = 300;

interface TimeRange {
  start: Date;
  end: Date;
}

function getTimeRange(rangeStr: string = '7d'): TimeRange {
  const end = new Date();
  const start = new Date();

  switch (rangeStr) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    default:
      start.setDate(end.getDate() - 7);
  }

  return { start, end };
}

/**
 * GET /api/admin/metabolic
 * Returns Metabolic Insights metrics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '7d';
    const { start, end } = getTimeRange(timeRange);

    // Run all queries in parallel for performance
    const [
      totalBetaUsers,
      activeUsers,
      totalMeals,
      totalPhotos,
      pendingAnalysis,
      completedAnalysis,
      dailyMealsTrend,
      performanceMetrics,
      errorMetrics,
      featureUsage,
      mlModels,
    ] = await Promise.all([
      // Total beta users (users with at least one food entry)
      prisma.person.count({
        where: {
          foodEntries: {
            some: {},
          },
        },
      }),

      // Active users (logged meal in time range)
      prisma.person.count({
        where: {
          foodEntries: {
            some: {
              createdAt: {
                gte: start,
                lte: end,
              },
            },
          },
        },
      }),

      // Total meals logged
      prisma.foodEntry.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),

      // Total photos uploaded
      prisma.foodPhoto.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),

      // Pending analysis count
      prisma.foodPhoto.count({
        where: {
          analysisStatus: 'pending',
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),

      // Completed analysis count
      prisma.foodPhoto.count({
        where: {
          analysisStatus: 'completed',
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),

      // Daily meals trend (last 30 days for charts)
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT
          DATE("created_at") as date,
          COUNT(*) as count
        FROM "food_entries"
        WHERE "created_at" >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE("created_at")
        ORDER BY date ASC
      `,

      // Performance metrics from analytics events
      prisma.analyticsEvent.count({
        where: {
          eventType: 'performance',
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),

      // Error count from analytics events
      prisma.analyticsEvent.count({
        where: {
          eventType: 'error',
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),

      // Feature usage events
      prisma.analyticsEvent.groupBy({
        by: ['eventName'],
        where: {
          eventType: 'feature_usage',
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        _count: true,
        orderBy: {
          _count: {
            eventName: 'desc',
          },
        },
        take: 10,
      }),

      // ML models trained
      prisma.personalModel.aggregate({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        _count: true,
        _avg: {
          accuracyMae: true,
        },
      }),
    ]);

    // Calculate derived metrics
    const analysisCompletionRate =
      totalPhotos > 0
        ? Math.round((completedAnalysis / totalPhotos) * 100)
        : 0;

    const avgMealsPerUser =
      activeUsers > 0
        ? (totalMeals / activeUsers).toFixed(1)
        : '0.0';

    // Format daily trend for charts
    const dailyTrendFormatted = dailyMealsTrend.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count),
    }));

    // Calculate 7-day and 30-day retention (placeholder - needs historical tracking)
    // For MVP, show as 0 and implement proper cohort analysis later
    const retention = {
      sevenDay: 0,
      thirtyDay: 0,
    };

    const response = {
      timeRange,
      adoption: {
        totalBetaUsers,
        activeUsers,
        mealsLogged: totalMeals,
        photosUploaded: totalPhotos,
        avgMealsPerUser: Number(avgMealsPerUser),
      },
      engagement: {
        retention,
        featureUsage: featureUsage.map((f) => ({
          feature: f.eventName,
          count: f._count,
        })),
      },
      analysis: {
        pending: pendingAnalysis,
        completed: completedAnalysis,
        completionRate: analysisCompletionRate,
      },
      performance: {
        // Placeholder - need to parse JSON metadata for latency_ms
        apiLatencyP50: null,
        apiLatencyP95: null,
        apiLatencyP99: null,
        totalEvents: performanceMetrics,
      },
      errors: {
        totalErrors: errorMetrics,
        errorRate: totalMeals > 0 ? ((errorMetrics / totalMeals) * 100).toFixed(2) : '0.00',
      },
      mlModels: {
        totalTrained: mlModels._count,
        avgAccuracyMae: mlModels._avg.accuracyMae
          ? mlModels._avg.accuracyMae.toFixed(2)
          : null,
      },
      charts: {
        dailyMealsTrend: dailyTrendFormatted,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Admin Metabolic API] Error fetching metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
