/**
 * MetricCard - Admin Dashboard Metric Display
 *
 * Displays a single metric with optional trend indicator and warning threshold.
 * Material Design inspired with elevation and hover states.
 */

import React from 'react';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | null;
  warningThreshold?: number;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  trend,
  warningThreshold,
}: MetricCardProps) {
  const numericValue = typeof value === 'number' ? value : null;
  const isWarning =
    warningThreshold !== undefined &&
    numericValue !== null &&
    numericValue >= warningThreshold;

  return (
    <div
      className={`
        bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-200
        ${isWarning ? 'border-2 border-red-500' : 'border border-gray-200'}
      `}
    >
      {/* Title */}
      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
        {title}
      </h3>

      {/* Value with Trend */}
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && <TrendIndicator trend={trend} />}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-gray-600 mt-2">{subtitle}</p>
      )}

      {/* Warning Badge */}
      {isWarning && (
        <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-full">
          <svg
            className="w-4 h-4 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs font-medium text-red-700">High</span>
        </div>
      )}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' }) {
  if (trend === 'up') {
    return (
      <svg
        className="w-5 h-5 text-green-600"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-5 h-5 text-red-600"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
