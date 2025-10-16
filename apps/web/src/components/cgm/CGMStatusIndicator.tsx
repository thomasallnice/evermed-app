'use client'

/**
 * CGMStatusIndicator Component
 *
 * Displays connection status with color-coded dot and label
 * - Connected: Green dot + "Connected"
 * - Disconnected: Gray dot + "Disconnected"
 * - Error: Red dot + "Connection Error"
 * - Syncing: Blue animated pulse + "Syncing..."
 */

interface CGMStatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
  className?: string
}

export default function CGMStatusIndicator({ status, className = '' }: CGMStatusIndicatorProps) {
  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      textColor: 'text-green-700',
      animate: false,
    },
    disconnected: {
      color: 'bg-gray-400',
      text: 'Disconnected',
      textColor: 'text-gray-700',
      animate: false,
    },
    error: {
      color: 'bg-red-500',
      text: 'Connection Error',
      textColor: 'text-red-700',
      animate: false,
    },
    syncing: {
      color: 'bg-blue-500',
      text: 'Syncing...',
      textColor: 'text-blue-700',
      animate: true,
    },
  }

  const config = statusConfig[status]

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div
          className={`w-3 h-3 rounded-full ${config.color} ${
            config.animate ? 'animate-pulse' : ''
          }`}
        />
        {config.animate && (
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-blue-400 animate-ping opacity-75" />
        )}
      </div>
      <span className={`text-sm font-medium ${config.textColor}`}>{config.text}</span>
    </div>
  )
}
