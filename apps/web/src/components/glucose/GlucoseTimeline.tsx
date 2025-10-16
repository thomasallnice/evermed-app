'use client'

import { useState, useMemo } from 'react'
import { GlucoseTimeRangeSelector, TimeRange } from './GlucoseTimeRangeSelector'
import { GlucoseDayChart } from './GlucoseDayChart'
import { GlucoseWeekChart } from './GlucoseWeekChart'
import { GlucoseMonthChart } from './GlucoseMonthChart'
import { Glucose6MonthChart } from './Glucose6MonthChart'
import { GlucoseYearChart } from './GlucoseYearChart'
import { GlucoseSummaryCard } from './GlucoseSummaryCard'

interface GlucoseReading {
  timestamp: string
  value: number
}

interface GlucoseTimelineProps {
  data: GlucoseReading[]
  selectedDate?: string
}

export function GlucoseTimeline({ data, selectedDate }: GlucoseTimelineProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('day')

  // Calculate statistics based on current data
  const stats = useMemo(() => {
    if (data.length === 0) {
      return { min: 0, max: 0, avg: 0 }
    }

    const values = data.map((r) => r.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)

    return { min, max, avg }
  }, [data])

  // Get date range label based on selected time range
  const getDateRangeLabel = () => {
    if (!selectedDate) return ''

    const date = new Date(selectedDate)
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

    switch (timeRange) {
      case 'day':
        return `${date.getDate()}. ${monthNames[date.getMonth()]}, ${date.getHours().toString().padStart(2, '0')}-${(date.getHours() + 1).toString().padStart(2, '0')}`
      case 'week':
        return `Woche ${Math.ceil(date.getDate() / 7)}, ${monthNames[date.getMonth()]}`
      case 'month':
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      case '6month':
        return `${monthNames[date.getMonth() - 5] || monthNames[0]} - ${monthNames[date.getMonth()]}`
      case 'year':
        return `${date.getFullYear()}`
      default:
        return ''
    }
  }

  // Render appropriate chart based on selected time range
  const renderChart = () => {
    if (data.length === 0) {
      return (
        <div className="w-full h-64 sm:h-80 lg:h-96 flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-200">
          <div className="text-center">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">📈</div>
            <p className="text-sm sm:text-base text-gray-600">No glucose data available</p>
          </div>
        </div>
      )
    }

    switch (timeRange) {
      case 'day':
        return <GlucoseDayChart data={data} />
      case 'week':
        return <GlucoseWeekChart data={data} />
      case 'month':
        return <GlucoseMonthChart data={data} />
      case '6month':
        return <Glucose6MonthChart data={data} />
      case 'year':
        return <GlucoseYearChart data={data} />
      default:
        return <GlucoseDayChart data={data} />
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Glucose Timeline</h2>
        <GlucoseTimeRangeSelector selected={timeRange} onChange={setTimeRange} />
      </div>

      {/* Summary Card Above Chart */}
      {data.length > 0 && (
        <GlucoseSummaryCard
          timeRange={timeRange}
          min={stats.min}
          max={stats.max}
          avg={stats.avg}
          dateRange={getDateRangeLabel()}
        />
      )}

      {/* Chart */}
      <div className="mt-4 sm:mt-6">
        {renderChart()}
      </div>
    </div>
  )
}
