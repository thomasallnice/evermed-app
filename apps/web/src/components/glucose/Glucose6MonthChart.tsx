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

interface Glucose6MonthChartProps {
  data: GlucoseReading[]
}

export function Glucose6MonthChart({ data }: Glucose6MonthChartProps) {
  // Group by week and calculate min-max range
  const weeklyRanges = new Map<string, { min: number; max: number; week: string }>()

  data.forEach((reading) => {
    const date = new Date(reading.timestamp)
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const month = monthNames[date.getMonth()]
    const weekOfMonth = Math.ceil(date.getDate() / 7)
    const key = `${month} W${weekOfMonth}`

    if (!weeklyRanges.has(key)) {
      weeklyRanges.set(key, { min: reading.value, max: reading.value, week: key })
    }

    const current = weeklyRanges.get(key)!
    current.min = Math.min(current.min, reading.value)
    current.max = Math.max(current.max, reading.value)
  })

  // Transform to chart data with range (max - min)
  const chartData = Array.from(weeklyRanges.values()).map((range) => ({
    week: range.week,
    min: range.min,
    max: range.max,
    range: range.max - range.min,
  }))

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-[#f5f5f7] rounded-2xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="20%" margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#d1d1d6"
            strokeOpacity={0.6}
            vertical={false}
            horizontal={true}
          />
          <XAxis
            dataKey="week"
            stroke="#8e8e93"
            className="text-xs sm:text-sm"
            tick={{ fill: '#8e8e93', fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
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
              if (name === 'range') return [`${value} mg/dL`, 'Range']
              return [value, name]
            }}
          />
          <Bar dataKey="max" fill="#2563eb" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#2563eb" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
