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

// Cache dashboard queries for 5 minutes
export const revalidate = 300;

/**
 * GET /api/admin/metabolic
 * Returns Metabolic Insights metrics for admin dashboard
 *
 * NOTE: This endpoint is stubbed until metabolic insights migrations are run on staging.
 */
export async function GET(request: NextRequest) {
  // TODO: Enable this endpoint after running metabolic insights migrations
  // See: db/migrations/20251010090000_add_metabolic_insights/migration.sql

  return NextResponse.json(
    {
      error: 'Metabolic Insights not yet available',
      message: 'Database migrations pending. Run metabolic insights migrations to enable this endpoint.',
      timeRange: request.nextUrl.searchParams.get('timeRange') || '7d',
      adoption: {
        totalBetaUsers: 0,
        activeUsers: 0,
        mealsLogged: 0,
        photosUploaded: 0,
        avgMealsPerUser: 0,
      },
      engagement: {
        retention: { sevenDay: 0, thirtyDay: 0 },
        featureUsage: [],
      },
      analysis: {
        pending: 0,
        completed: 0,
        completionRate: 0,
      },
      performance: {
        apiLatencyP50: null,
        apiLatencyP95: null,
        apiLatencyP99: null,
        totalEvents: 0,
      },
      errors: {
        totalErrors: 0,
        errorRate: '0.00',
      },
      mlModels: {
        totalTrained: 0,
        avgAccuracyMae: null,
      },
      charts: {
        dailyMealsTrend: [],
      },
    },
    { status: 200 }
  );
}
