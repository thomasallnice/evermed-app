/**
 * ChartCard - Admin Dashboard Chart Container
 *
 * Wraps charts in a consistent Material Design card with title and subtitle.
 */

import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Chart Content */}
      <div className="w-full">{children}</div>
    </div>
  );
}
