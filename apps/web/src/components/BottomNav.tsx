'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Camera, History, LineChart } from 'lucide-react'

/**
 * BottomNav - Carbly bottom navigation with center camera FAB
 *
 * Design principles:
 * - 4 tabs: Dashboard, Camera (FAB), History, Timeline
 * - 44x44px minimum touch targets (thumb-friendly)
 * - Camera button is prominent FAB (Floating Action Button)
 * - Active state with blue color
 * - Sticky to bottom of viewport
 */

export default function BottomNav() {
  const pathname = usePathname()

  // Don't show nav on auth, onboarding, or other non-app pages
  const hideNav = pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/vault') || pathname.startsWith('/upload') || pathname.startsWith('/chat') || pathname.startsWith('/profile') || pathname.startsWith('/dev')

  if (hideNav) {
    return null
  }

  const isActive = (path: string) => pathname.startsWith(path)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-inset">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-around h-20 relative">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-lg transition-all ${
              isActive('/dashboard')
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
            aria-label="Dashboard"
          >
            <Home className="w-6 h-6" strokeWidth={isActive('/dashboard') ? 2.5 : 2} />
            <span className="text-xs font-medium">Home</span>
          </Link>

          {/* History */}
          <Link
            href="/history"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-lg transition-all ${
              isActive('/history')
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
            aria-label="History"
          >
            <History className="w-6 h-6" strokeWidth={isActive('/history') ? 2.5 : 2} />
            <span className="text-xs font-medium">History</span>
          </Link>

          {/* Camera FAB (center, elevated) */}
          <Link
            href="/camera"
            className="absolute left-1/2 -translate-x-1/2 -top-6 flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95"
            aria-label="Take photo"
          >
            <Camera className="w-7 h-7" strokeWidth={2.5} />
          </Link>

          {/* Timeline */}
          <Link
            href="/metabolic/dashboard"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-lg transition-all ${
              isActive('/metabolic')
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
            aria-label="Timeline"
          >
            <LineChart className="w-6 h-6" strokeWidth={isActive('/metabolic') ? 2.5 : 2} />
            <span className="text-xs font-medium">Timeline</span>
          </Link>

          {/* Spacer for camera button */}
          <div className="w-16" aria-hidden="true"></div>
        </div>
      </div>

      {/* Safe area inset for iOS notch */}
      <style jsx>{`
        .safe-area-inset {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </nav>
  )
}
