'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface GlucoseReading {
  timestamp: string
  value: number
}

interface GlucoseYearChartProps {
  data: GlucoseReading[]
}

export function GlucoseYearChart({ data }: GlucoseYearChartProps) {
  // Group by month and calculate min-max range
  const monthlyRanges = new Map<string, { min: number; max: number; month: string; monthIndex: number }>()

  data.forEach((reading) => {
    const date = new Date(reading.timestamp)
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const month = monthNames[date.getMonth()]
    const monthIndex = date.getMonth()

    if (!monthlyRanges.has(month)) {
      monthlyRanges.set(month, {
        min: reading.value,
        max: reading.value,
        month,
        monthIndex
      })
    }

    const current = monthlyRanges.get(month)!
    current.min = Math.min(current.min, reading.value)
    current.max = Math.max(current.max, reading.value)
  })

  // Transform to chart data with range (max - min)
  const chartData = Array.from(monthlyRanges.values())
    .map((range) => ({
      month: range.month,
      monthIndex: range.monthIndex,
      min: range.min,
      max: range.max,
      range: range.max - range.min,
    }))
    .sort((a, b) => a.monthIndex - b.monthIndex)

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-[#f5f5f7] rounded-2xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="15%" margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={1} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#d1d1d6"
            strokeOpacity={0.6}
            vertical={false}
            horizontal={true}
          />
          <XAxis
            dataKey="month"
            stroke="#8e8e93"
            className="text-xs sm:text-sm"
            tick={{ fill: '#8e8e93', fontSize: 11 }}
          />
          <YAxis
            stroke="#8e8e93"
            className="text-xs sm:text-sm"
            domain={[0, 300]}
            ticks={[0, 100, 200, 300]}
            orientation="right"
            tick={{ fill: '#8e8e93', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5ea',
              borderRadius: '8px',
              fontSize: '11px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'max') return [`${value} mg/dL`, 'Max']
              if (name === 'min') return [`${value} mg/dL`, 'Min']
              return [value, name]
            }}
          />
          <Bar dataKey="max" fill="url(#barGradient)" radius={[8, 8, 8, 8]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="url(#barGradient)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
