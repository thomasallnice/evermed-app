/**
 * Admin Metabolic Insights Dashboard
 *
 * Monitoring dashboard for Metabolic Insights beta launch.
 * Shows adoption, engagement, performance, and error metrics.
 *
 * PRIVACY: All metrics are aggregated, non-PHI, no user identifiers.
 * PERFORMANCE: Server-side data fetching with 5-minute cache.
 */

import React from 'react';
import { Line, Bar } from 'recharts';
import MetricCard from '@/components/admin/MetricCard';
import ChartCard from '@/components/admin/ChartCard';
import FeatureFlagsSection from '@/components/admin/FeatureFlagsSection';

async function fetchMetrics(timeRange: string = '7d') {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/metabolic?timeRange=${timeRange}`,
      {
        headers: { 'x-admin': '1' },
        cache: 'no-store',
        next: { revalidate: 300 }, // 5-minute cache
      }
    );
    if (!res.ok) {
      console.error('Failed to fetch metabolic metrics:', res.statusText);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching metabolic metrics:', error);
    return null;
  }
}

export const dynamic = 'force-dynamic';

interface MetabolicDashboardProps {
  searchParams: { timeRange?: string };
}

export default async function MetabolicDashboard({
  searchParams,
}: MetabolicDashboardProps) {
  const timeRange = searchParams.timeRange || '7d';
  const data = await fetchMetrics(timeRange);

  if (!data) {
    return (
      <main className="p-6 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Metabolic Insights Admin Dashboard
        </h1>
        <p className="text-sm text-red-600 mb-6">
          Failed to load metrics. Check API connection.
        </p>
      </main>
    );
  }

  const { adoption, engagement, analysis, performance, errors, mlModels, charts } = data;

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Metabolic Insights Admin Dashboard
        </h1>
        <p className="text-sm text-gray-600">
          Non-PHI metrics for Sprint 6 beta launch. All data is aggregated and anonymized.
        </p>
      </div>

      {/* Time Range Filter */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
          <TimeRangeButton range="7d" currentRange={timeRange} label="Last 7 Days" />
          <TimeRangeButton range="30d" currentRange={timeRange} label="Last 30 Days" />
          <TimeRangeButton range="90d" currentRange={timeRange} label="Last 90 Days" />
        </div>
      </div>

      {/* Adoption Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Adoption Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Beta Users"
            value={adoption.totalBetaUsers}
            subtitle="Users with at least 1 meal"
            trend={null}
          />
          <MetricCard
            title="Active Users"
            value={adoption.activeUsers}
            subtitle={`Logged meal in ${timeRange}`}
            trend={null}
          />
          <MetricCard
            title="Meals Logged"
            value={adoption.mealsLogged}
            subtitle="Total food entries"
            trend={null}
          />
          <MetricCard
            title="Avg Meals/User"
            value={adoption.avgMealsPerUser}
            subtitle="Per active user"
            trend={null}
          />
        </div>
      </section>

      {/* Engagement Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Engagement Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Photos Uploaded"
            value={adoption.photosUploaded}
            subtitle="Total photo uploads"
            trend={null}
          />
          <MetricCard
            title="Analysis Completion Rate"
            value={`${analysis.completionRate}%`}
            subtitle={`${analysis.completed}/${analysis.pending + analysis.completed} photos`}
            trend={analysis.completionRate >= 95 ? 'up' : analysis.completionRate < 80 ? 'down' : null}
          />
          <MetricCard
            title="7-Day Retention"
            value={`${engagement.retention.sevenDay}%`}
            subtitle="Coming soon - cohort tracking"
            trend={null}
          />
        </div>
      </section>

      {/* Charts */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Trends</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Meals Trend */}
          <ChartCard title="Daily Meals Logged" subtitle="Last 30 days">
            <DailyMealsChart data={charts.dailyMealsTrend} />
          </ChartCard>

          {/* Feature Usage */}
          <ChartCard title="Top Features Used" subtitle="Most popular actions">
            <FeatureUsageChart data={engagement.featureUsage} />
          </ChartCard>
        </div>
      </section>

      {/* Performance & Errors */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Performance & Errors
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Errors"
            value={errors.totalErrors}
            subtitle={`Error rate: ${errors.errorRate}%`}
            trend={errors.totalErrors > 10 ? 'down' : 'up'}
            warningThreshold={10}
          />
          <MetricCard
            title="Performance Events"
            value={performance.totalEvents}
            subtitle="API latency tracking"
            trend={null}
          />
          <MetricCard
            title="ML Models Trained"
            value={mlModels.totalTrained}
            subtitle="Personal glucose prediction models"
            trend={null}
          />
          <MetricCard
            title="Avg Model MAE"
            value={mlModels.avgAccuracyMae || 'N/A'}
            subtitle="Mean Absolute Error (mg/dL)"
            trend={null}
          />
        </div>
      </section>

      {/* Feature Flags Management */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Flags</h2>
        <FeatureFlagsSection />
      </section>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-gray-500">
        <p>
          Dashboard refreshes every 5 minutes. All metrics are non-PHI and aggregated.
        </p>
      </footer>
    </main>
  );
}

// Time Range Button Component
function TimeRangeButton({
  range,
  currentRange,
  label,
}: {
  range: string;
  currentRange: string;
  label: string;
}) {
  const isActive = range === currentRange;
  return (
    <a
      href={`?timeRange=${range}`}
      className={`
        px-4 py-2 rounded-md text-sm font-semibold transition-all
        ${
          isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      {label}
    </a>
  );
}

// Simple chart components (using basic HTML for now, can upgrade to Recharts later)
function DailyMealsChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">No data available</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-2">
      {data.slice(-14).map((item) => (
        <div key={item.date} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20">{item.date}</span>
          <div className="flex-1 bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-8 text-right">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function FeatureUsageChart({ data }: { data: Array<{ feature: string; count: number }> }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">No data available</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((item) => (
        <div key={item.feature} className="flex items-center gap-2">
          <span className="text-xs text-gray-700 w-32 truncate">{item.feature}</span>
          <div className="flex-1 bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-600 h-4 rounded-full transition-all"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-12 text-right">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}
