'use client'

import { TimeRange } from './GlucoseTimeRangeSelector'

interface GlucoseSummaryCardProps {
  timeRange: TimeRange
  min: number
  max: number
  avg?: number
  dateRange?: string
}

export function GlucoseSummaryCard({ timeRange, min, max, avg, dateRange }: GlucoseSummaryCardProps) {
  // Determine label based on time range
  const getLabel = () => {
    switch (timeRange) {
      case 'day':
        return 'DURCHSCHNITT/TAG'
      case 'week':
        return 'WOCHENDURCHSCHNITT'
      case 'month':
        return 'DURCHSCHNITT/MONAT'
      case '6month':
        return 'BEREICH'
      case 'year':
        return 'BEREICH'
      default:
        return 'BEREICH'
    }
  }

  // Determine value display
  const getValue = () => {
    if (timeRange === 'day' && avg !== undefined) {
      return `${avg} mg/dl`
    }
    return `${min}-${max} mg/dl`
  }

  // Determine styling - day average gets red background
  const isDayAverage = timeRange === 'day' && avg !== undefined

  return (
    <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
      {/* Range Display Above Chart */}
      <div className="text-center">
        <div className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
          {getLabel()}
        </div>
        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          {getValue()}
        </div>
        {dateRange && (
          <div className="text-xs sm:text-sm text-gray-600 mt-1">
            {dateRange}
          </div>
        )}
      </div>

      {/* Summary Pill Below Chart */}
      <div
        className={`rounded-full px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between ${
          isDayAverage
            ? 'bg-red-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <span className="text-xs sm:text-sm font-medium">
          {getLabel()}
        </span>
        <span className="text-xs sm:text-sm font-semibold">
          {getValue()}
        </span>
      </div>
    </div>
  )
}
