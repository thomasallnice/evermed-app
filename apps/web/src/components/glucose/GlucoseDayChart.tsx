'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface GlucoseReading {
  timestamp: string
  value: number
}

interface GlucoseDayChartProps {
  data: GlucoseReading[]
}

export function GlucoseDayChart({ data }: GlucoseDayChartProps) {
  // Transform data for Recharts
  const chartData = data.map((reading) => {
    const date = new Date(reading.timestamp)
    const hour = date.getHours()
    return {
      time: `${hour.toString().padStart(2, '0')} Uhr`,
      glucose: reading.value,
      hour,
    }
  })

  // Sort by hour
  chartData.sort((a, b) => a.hour - b.hour)

  // Custom tick formatter for X-axis (show only 00, 06, 12, 18)
  const xAxisTicks = ['00 Uhr', '06 Uhr', '12 Uhr', '18 Uhr']

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <defs>
            <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e5ea"
            strokeOpacity={0.5}
            vertical={true}
            horizontal={true}
          />
          <XAxis
            dataKey="time"
            stroke="#8e8e93"
            className="text-xs sm:text-sm"
            ticks={xAxisTicks}
            interval={0}
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
            formatter={(value: number) => [`${value} mg/dL`, 'Glucose']}
          />
          <Area
            type="monotone"
            dataKey="glucose"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#glucoseGradient)"
            dot={{ fill: '#ef4444', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
