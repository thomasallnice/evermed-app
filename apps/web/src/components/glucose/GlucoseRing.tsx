'use client'

/**
 * GlucoseRing - Circular glucose display with color-coded ring
 *
 * Design:
 * - Large number in center (current glucose value)
 * - Color-coded ring: red (<70 or >180), amber (140-180), green (70-140)
 * - Trend indicator (up/down/stable arrow)
 * - Accessible with proper ARIA labels
 */

interface GlucoseRingProps {
  value: number // mg/dL
  trend?: 'up' | 'down' | 'stable'
  timestamp?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function GlucoseRing({ value, trend = 'stable', timestamp, size = 'lg' }: GlucoseRingProps) {
  // Determine color based on value
  const getGlucoseColor = () => {
    if (value < 70) return 'glucose-low'
    if (value >= 70 && value <= 140) return 'glucose-normal'
    if (value > 140 && value <= 180) return 'glucose-elevated'
    return 'glucose-high'
  }

  const colorClass = getGlucoseColor()
  const colorMap = {
    'glucose-low': 'text-red-600 border-red-600',
    'glucose-normal': 'text-green-600 border-green-600',
    'glucose-elevated': 'text-amber-600 border-amber-600',
    'glucose-high': 'text-red-600 border-red-600',
  }

  const sizeMap = {
    sm: 'w-24 h-24 text-2xl',
    md: 'w-32 h-32 text-3xl',
    lg: 'w-40 h-40 text-4xl',
  }

  const trendIcon = {
    up: '↑',
    down: '↓',
    stable: '→',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Ring */}
      <div
        className={`${sizeMap[size]} rounded-full border-8 ${colorMap[colorClass]} flex flex-col items-center justify-center bg-white shadow-lg`}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={40}
        aria-valuemax={400}
        aria-label={`Blood glucose ${value} milligrams per deciliter`}
      >
        {/* Value */}
        <div className={`font-bold font-mono ${colorMap[colorClass]}`}>
          {value}
        </div>
        <div className="text-xs font-medium text-gray-600">mg/dL</div>
      </div>

      {/* Trend & Timestamp */}
      <div className="text-center">
        {trend && (
          <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
            <span className={`text-lg ${trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600'}`}>
              {trendIcon[trend]}
            </span>
            <span className="font-medium">
              {trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Stable'}
            </span>
          </div>
        )}
        {timestamp && (
          <div className="text-xs text-gray-500 mt-1">
            {new Date(timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  )
}
