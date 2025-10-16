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
  ReferenceDot,
} from 'recharts'

interface GlucoseReading {
  timestamp: string
  value: number
}

interface MealMarker {
  id: string
  timestamp: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl: string | null
  analysisStatus: 'pending' | 'completed' | 'failed'
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
}

interface GlucoseDayChartProps {
  data: GlucoseReading[]
  meals?: MealMarker[]
}

export function GlucoseDayChart({ data, meals = [] }: GlucoseDayChartProps) {
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

  // Transform meal markers for display
  const mealMarkers = meals.map((meal) => {
    const date = new Date(meal.timestamp)
    const hour = date.getHours()
    const timeLabel = `${hour.toString().padStart(2, '0')} Uhr`

    return {
      time: timeLabel,
      hour,
      name: meal.name,
      carbs: meal.carbs,
      photoUrl: meal.photoUrl,
      y: 280, // Position at top of chart
    }
  })

  // Custom tick formatter for X-axis (show only 00, 06, 12, 18)
  const xAxisTicks = ['00 Uhr', '06 Uhr', '12 Uhr', '18 Uhr']

  // Custom tooltip to show meal info
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const glucoseValue = payload.find((p: any) => p.dataKey === 'glucose')
      const mealAtTime = mealMarkers.find((m) => m.time === label)

      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
          <p className="font-medium text-gray-900">{label}</p>
          {glucoseValue && (
            <p className="text-blue-600 font-semibold">
              Glucose: {glucoseValue.value} mg/dL
            </p>
          )}
          {mealAtTime && (
            <div className="mt-2 border-t border-gray-200 pt-2">
              <p className="font-semibold text-gray-900">{mealAtTime.name}</p>
              <p className="text-orange-600 font-medium">Carbs: {mealAtTime.carbs}g</p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Custom meal marker component with image
  const renderMealMarker = (meal: typeof mealMarkers[0], index: number) => {
    return (
      <g key={index}>
        {/* Circular image with white border */}
        <defs>
          <clipPath id={`meal-clip-${index}`}>
            <circle cx="0" cy="0" r="12" />
          </clipPath>
        </defs>
        {meal.photoUrl ? (
          <>
            <circle cx="0" cy="0" r="14" fill="white" />
            <image
              href={meal.photoUrl}
              x="-12"
              y="-12"
              width="24"
              height="24"
              clipPath={`url(#meal-clip-${index})`}
            />
          </>
        ) : (
          <circle cx="0" cy="0" r="12" fill="#f97316" stroke="white" strokeWidth="2" />
        )}
        {/* Carbs label below */}
        <text
          x="0"
          y="25"
          textAnchor="middle"
          fill="#f97316"
          fontSize="10"
          fontWeight="600"
        >
          {meal.carbs}g
        </text>
      </g>
    )
  }

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-[#f5f5f7] rounded-2xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <defs>
            <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#d1d1d6"
            strokeOpacity={0.6}
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
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="glucose"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#glucoseGradient)"
            dot={{ fill: '#2563eb', r: 3 }}
            activeDot={{ r: 5 }}
          />
          {/* Meal markers with circular images */}
          {mealMarkers.map((meal, index) => (
            <ReferenceDot
              key={index}
              x={meal.time}
              y={meal.y}
              r={0}
              shape={(props: any) => {
                const { cx, cy } = props
                return (
                  <g transform={`translate(${cx},${cy})`}>
                    {renderMealMarker(meal, index)}
                  </g>
                )
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
