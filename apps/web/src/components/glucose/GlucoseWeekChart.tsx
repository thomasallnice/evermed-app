'use client'

import {
  ScatterChart,
  Scatter,
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

interface GlucoseWeekChartProps {
  data: GlucoseReading[]
}

export function GlucoseWeekChart({ data }: GlucoseWeekChartProps) {
  // Transform data for Recharts - group by day of week
  const chartData = data.map((reading) => {
    const date = new Date(reading.timestamp)
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    return {
      day: dayNames[date.getDay()],
      dayIndex: date.getDay(),
      glucose: reading.value,
    }
  })

  // Sort by day index
  chartData.sort((a, b) => a.dayIndex - b.dayIndex)

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e5ea"
            strokeOpacity={0.5}
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
            dataKey="glucose"
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
            formatter={(value: number) => [`${value} mg/dL`, 'Glucose']}
          />
          <Scatter
            data={chartData}
            fill="#ef4444"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
