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
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      case '6month':
        return 'Last 6 Months'
      case 'year':
        return 'This Year'
      default:
        return 'Range'
    }
  }

  // Determine value display
  const getMainValue = () => {
    if (timeRange === 'day' && avg !== undefined) {
      return avg
    }
    return Math.round((min + max) / 2)
  }

  const getSecondaryValue = () => {
    return `${min}–${max}`
  }

  // Color based on average
  const mainValue = getMainValue()
  const getStatusColor = () => {
    if (mainValue > 180) return 'text-red-600'
    if (mainValue < 70) return 'text-amber-600'
    return 'text-green-600'
  }

  const getStatusLabel = () => {
    if (mainValue > 180) return 'Above Target'
    if (mainValue < 70) return 'Below Target'
    return 'In Range'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {getLabel()}
          </h3>
          {dateRange && (
            <p className="text-xs text-gray-400 mt-0.5">{dateRange}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor()} bg-current bg-opacity-10`}>
          {getStatusLabel()}
        </span>
      </div>

      {/* Main Value - Apple Health Style */}
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold text-gray-900">
          {getMainValue()}
        </span>
        <span className="text-xl font-medium text-gray-500">
          mg/dL
        </span>
      </div>

      {/* Secondary Values */}
      <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Range</p>
          <p className="text-base font-semibold text-gray-700">
            {getSecondaryValue()} <span className="text-sm font-normal text-gray-500">mg/dL</span>
          </p>
        </div>
        {avg !== undefined && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Average</p>
            <p className="text-base font-semibold text-gray-700">
              {avg} <span className="text-sm font-normal text-gray-500">mg/dL</span>
            </p>
          </div>
        )}
      </div>

      {/* Visual Range Indicator */}
      <div className="pt-2">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          {/* Target range (70-180) */}
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 relative"
            style={{
              marginLeft: `${Math.max(0, Math.min(100, (70 / 300) * 100))}%`,
              width: `${Math.max(0, Math.min(100, ((180 - 70) / 300) * 100))}%`,
              opacity: 0.3,
            }}
          />
          {/* Current value indicator */}
          <div
            className={`absolute top-0 h-2 w-1 ${getStatusColor()} bg-current`}
            style={{
              left: `${Math.max(0, Math.min(100, (mainValue / 300) * 100))}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400">
          <span>0</span>
          <span>70</span>
          <span>180</span>
          <span>300</span>
        </div>
      </div>
    </div>
  )
}
