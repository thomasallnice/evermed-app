'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
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

// Meal type colors (matching existing design)
const mealTypeColors = {
  breakfast: '#f97316', // orange-600
  lunch: '#10b981', // green-600
  dinner: '#8b5cf6', // purple-600
  snack: '#f59e0b', // amber-600
}

// Generate meal impact curve points (bell curve effect)
function generateMealImpactCurve(mealHour: number, mealMinute: number, color: string) {
  const points = []
  const startTime = mealHour + mealMinute / 60

  // Impact curve: rises for 1.5 hours, peaks, then falls for 2.5 hours (total 4 hour window)
  for (let offset = 0; offset <= 4; offset += 0.25) {
    const time = startTime + offset
    let intensity = 0

    if (offset <= 1.5) {
      // Rising phase (0 to 1.5 hours)
      intensity = (offset / 1.5) * 0.4 // Max 40% opacity
    } else {
      // Falling phase (1.5 to 4 hours)
      const fallProgress = (offset - 1.5) / 2.5
      intensity = 0.4 * (1 - fallProgress)
    }

    points.push({
      time,
      intensity,
      color,
    })
  }

  return points
}

export function GlucoseDayChart({ data, meals = [] }: GlucoseDayChartProps) {
  // Transform glucose data for scatter plot
  const glucoseData = data.map((reading) => {
    const date = new Date(reading.timestamp)
    const hour = date.getHours() + date.getMinutes() / 60
    return {
      time: hour,
      glucose: reading.value,
      timestamp: reading.timestamp,
      displayTime: date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    }
  })

  // Transform meal data
  const mealData = meals.map((meal) => {
    const date = new Date(meal.timestamp)
    const hour = date.getHours()
    const minute = date.getMinutes()
    const time = hour + minute / 60

    return {
      time,
      hour,
      minute,
      displayTime: date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      name: meal.name,
      carbs: meal.carbs,
      calories: meal.calories,
      type: meal.type,
      color: mealTypeColors[meal.type],
      photoUrl: meal.photoUrl,
      // Position meal marker at top of chart
      y: 280,
    }
  })

  // Generate meal impact curves for all meals
  const mealImpactAreas = mealData.flatMap((meal) =>
    generateMealImpactCurve(meal.hour, meal.minute, meal.color)
  )

  // Group meal impacts by time for rendering
  const groupedImpacts = new Map<number, { time: number; impacts: Array<{ color: string; intensity: number }> }>()
  mealImpactAreas.forEach(({ time, intensity, color }) => {
    const roundedTime = Math.round(time * 4) / 4 // Round to nearest 15 min
    if (!groupedImpacts.has(roundedTime)) {
      groupedImpacts.set(roundedTime, { time: roundedTime, impacts: [] })
    }
    groupedImpacts.get(roundedTime)!.impacts.push({ color, intensity })
  })

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload

      // Check if this is a glucose reading
      if (data.glucose !== undefined) {
        return (
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg">
            <p className="text-xs text-gray-600 mb-1">{data.displayTime}</p>
            <p className="text-lg font-bold text-blue-600">{data.glucose} mg/dL</p>
          </div>
        )
      }
    }
    return null
  }

  // Custom meal marker shape
  const renderMealMarker = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload || !payload.carbs) return null

    const meal = payload
    const color = meal.color

    return (
      <g>
        {/* Vertical line from meal to bottom */}
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2="100%"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={0.3}
        />

        {/* Meal marker circle */}
        <circle
          cx={cx}
          cy={cy}
          r={20}
          fill={color}
          opacity={0.15}
        />
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill={color}
          stroke="white"
          strokeWidth={2}
        />

        {/* Carbs label inside circle */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill="white"
          fontSize="11"
          fontWeight="700"
        >
          {meal.carbs}
        </text>
        <text
          x={cx}
          y={cy + 9}
          textAnchor="middle"
          fill="white"
          fontSize="8"
          fontWeight="600"
        >
          g
        </text>

        {/* Time label below */}
        <text
          x={cx}
          y={cy + 32}
          textAnchor="middle"
          fill={color}
          fontSize="10"
          fontWeight="600"
        >
          {meal.displayTime}
        </text>
      </g>
    )
  }

  return (
    <div className="w-full h-80 sm:h-96 lg:h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 60, right: 20, bottom: 20, left: 0 }}>
          <defs>
            {/* Define gradients for meal impact areas */}
            {Object.entries(mealTypeColors).map(([type, color]) => (
              <linearGradient key={type} id={`impact-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>

          {/* Grid */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            strokeOpacity={0.5}
            vertical={false}
          />

          {/* X-Axis: Time (0-24 hours) */}
          <XAxis
            type="number"
            dataKey="time"
            domain={[0, 24]}
            ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
            tickFormatter={(value) => `${value.toString().padStart(2, '0')}:00`}
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
          />

          {/* Y-Axis: Glucose (0-300 mg/dL) */}
          <YAxis
            type="number"
            domain={[0, 300]}
            ticks={[0, 70, 100, 140, 180, 200, 250, 300]}
            orientation="right"
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            label={{
              value: 'mg/dL',
              angle: 0,
              position: 'insideTopRight',
              offset: 10,
              style: { fill: '#6b7280', fontSize: 11, fontWeight: 600 },
            }}
          />

          {/* Target range shading (70-180 mg/dL) */}
          <ReferenceArea
            y1={70}
            y2={180}
            fill="#10b981"
            fillOpacity={0.05}
            strokeOpacity={0}
          />

          {/* High threshold line */}
          <ReferenceArea
            y1={180}
            y2={181}
            fill="#ef4444"
            fillOpacity={0.3}
            strokeOpacity={0}
          />

          {/* Low threshold line */}
          <ReferenceArea
            y1={70}
            y2={69}
            fill="#f59e0b"
            fillOpacity={0.3}
            strokeOpacity={0}
          />

          {/* Meal impact curves (shaded areas showing glucose response) */}
          {Array.from(groupedImpacts.values()).map((group, idx) => {
            // For each time point, render overlapping meal impact areas
            return group.impacts.map((impact, impactIdx) => {
              const startTime = group.time
              const endTime = group.time + 0.25

              return (
                <ReferenceArea
                  key={`impact-${idx}-${impactIdx}`}
                  x1={startTime}
                  x2={endTime}
                  y1={70}
                  y2={250}
                  fill={impact.color}
                  fillOpacity={impact.intensity}
                  strokeOpacity={0}
                />
              )
            })
          })}

          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

          {/* Glucose readings (scatter dots - NOT connected) */}
          <Scatter
            data={glucoseData}
            fill="#2563eb"
            shape={(props: any) => {
              const { cx, cy, payload } = props
              // Color based on value
              const value = payload.glucose
              let color = '#2563eb' // blue-600 (normal)
              if (value > 180) color = '#ef4444' // red-600 (high)
              if (value < 70) color = '#f59e0b' // amber-600 (low)

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={color}
                  stroke="white"
                  strokeWidth={1.5}
                />
              )
            }}
          />

          {/* Meal markers (at top of chart) */}
          <Scatter
            data={mealData}
            fill="none"
            shape={renderMealMarker}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span className="text-gray-700">Glucose</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-600"></div>
          <span className="text-gray-700">Breakfast</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span className="text-gray-700">Lunch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-600"></div>
          <span className="text-gray-700">Dinner</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-600"></div>
          <span className="text-gray-700">Snack</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-2 bg-gradient-to-r from-orange-600/20 to-orange-600/5 rounded"></div>
          <span className="text-gray-700">Meal Impact</span>
        </div>
      </div>
    </div>
  )
}
