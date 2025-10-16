'use client'

export type TimeRange = 'day' | 'week' | 'month' | '6month' | 'year'

interface GlucoseTimeRangeSelectorProps {
  selected: TimeRange
  onChange: (range: TimeRange) => void
}

export function GlucoseTimeRangeSelector({ selected, onChange }: GlucoseTimeRangeSelectorProps) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: 'day', label: 'T' },
    { value: 'week', label: 'W' },
    { value: 'month', label: 'M' },
    { value: '6month', label: '6 M.' },
    { value: 'year', label: 'J' },
  ]

  return (
    <div className="inline-flex items-center bg-gray-200 rounded-full p-0.5 sm:p-1 gap-0.5 sm:gap-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 ${
            selected === range.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'bg-transparent text-gray-600 hover:text-gray-900'
          }`}
          aria-label={`Switch to ${range.value} view`}
          aria-pressed={selected === range.value}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
