'use client'

/**
 * InsightCard - Daily insight or recommendation card
 *
 * Design:
 * - Icon + title + description
 * - Color-coded by type (pattern, warning, tip)
 * - Actionable, clear, concise
 */

interface InsightCardProps {
  type: 'pattern' | 'warning' | 'tip'
  title: string
  description: string
  icon?: string
}

export default function InsightCard({ type, title, description, icon }: InsightCardProps) {
  const typeStyles = {
    pattern: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: icon || '🔍',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: icon || '⚠️',
    },
    tip: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: icon || '💡',
    },
  }

  const style = typeStyles[type]

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow`}
      role="article"
      aria-label={`${type} insight`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-3xl flex-shrink-0" aria-hidden="true">
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={`font-semibold ${style.text} mb-1.5`}>{title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}
