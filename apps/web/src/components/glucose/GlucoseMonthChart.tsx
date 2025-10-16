'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface GlucoseReading {
  timestamp: string
  value: number
}

interface GlucoseMonthChartProps {
  data: GlucoseReading[]
}

export function GlucoseMonthChart({ data }: GlucoseMonthChartProps) {
  // Group by day and calculate average
  const dailyAverages = new Map<string, { sum: number; count: number }>()

  data.forEach((reading) => {
    const date = new Date(reading.timestamp)
    const day = date.getDate()
    const key = day.toString()

    if (!dailyAverages.has(key)) {
      dailyAverages.set(key, { sum: 0, count: 0 })
    }

    const current = dailyAverages.get(key)!
    current.sum += reading.value
    current.count += 1
  })

  // Transform to chart data
  const chartData = Array.from(dailyAverages.entries()).map(([day, stats]) => ({
    day: parseInt(day),
    glucose: Math.round(stats.sum / stats.count),
  }))

  // Sort by day
  chartData.sort((a, b) => a.day - b.day)

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-[#f5f5f7] rounded-2xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#d1d1d6"
            strokeOpacity={0.6}
            vertical={true}
            horizontal={true}
          />
          <XAxis
            dataKey="day"
            stroke="#8e8e93"
            className="text-xs sm:text-sm"
            tick={{ fill: '#8e8e93', fontSize: 12 }}
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
            formatter={(value: number) => [`${value} mg/dL`, 'Avg Glucose']}
          />
          <Line
            type="monotone"
            dataKey="glucose"
            stroke="#2563eb"
            strokeWidth={1.5}
            dot={{ fill: '#2563eb', r: 2.5 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
