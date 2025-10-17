'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

/**
 * Nav - Carbly top navigation (legacy routes + dev tools)
 *
 * Note: Primary navigation is now BottomNav for app pages.
 * This Nav is shown for legacy routes (vault, upload, chat, etc.)
 * and development tools.
 */

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email || null)
    })()
    const { data: sub } = getSupabase().auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="container flex items-center justify-between py-3 px-4">
        <div className="font-bold text-xl">
          <a href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <span className="text-2xl">📊</span>
            Carbly
          </a>
        </div>
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          {email && (
            <>
              <a href="/dashboard" className="hover:text-blue-600 font-medium">Dashboard</a>
              <a href="/history" className="hover:text-blue-600 font-medium">History</a>
              <a href="/insights" className="hover:text-blue-600 font-medium">Insights</a>
              <span className="inline-block w-px h-4 bg-gray-300 mx-1" />
              <a href="/profile" className="hover:text-blue-600">Profile</a>
              {/* Dev tools (hidden in production) */}
              {process.env.NODE_ENV === 'development' && (
                <a href="/dev" className="text-gray-400 hover:text-gray-600">Dev</a>
              )}
            </>
          )}
          <span className="inline-block w-px h-4 bg-gray-300 mx-1" />
          {email ? (
            <>
              <span className="text-gray-600 text-xs max-w-[150px] truncate">{email}</span>
              <form action="/" onSubmit={async (e) => {
                e.preventDefault(); await getSupabase().auth.signOut(); window.location.href = '/auth/login'
              }}>
                <button type="submit" className="text-sm text-red-600 hover:text-red-700 font-medium">Logout</button>
              </form>
            </>
          ) : (
            <>
              <a href="/auth/login" className="hover:text-blue-600 font-medium">Login</a>
              <a href="/auth/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold">Sign up</a>
            </>
          )}
        </nav>
        {/* Mobile menu trigger */}
        <button
          className="md:hidden flex items-center justify-center w-12 h-12 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t bg-white shadow-lg">
          <div className="container py-2 px-4 flex flex-col gap-1">
            {email && (
              <>
                <a href="/dashboard" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Dashboard</a>
                <a href="/history" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">History</a>
                <a href="/insights" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Insights</a>
                <a href="/camera" onClick={() => setOpen(false)} className="py-3 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium text-center">📸 Log Meal</a>
                <div className="h-px bg-gray-200 my-2" />
                <a href="/profile" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Profile</a>
                {process.env.NODE_ENV === 'development' && (
                  <a href="/dev" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors text-gray-400">Dev</a>
                )}
              </>
            )}
            <div className="h-px bg-gray-200 my-2" />
            {email ? (
              <>
                <span className="py-2 px-4 text-gray-600 text-sm truncate">{email}</span>
                <form action="/" onSubmit={async (e) => { e.preventDefault(); await getSupabase().auth.signOut(); window.location.href = '/auth/login' }}>
                  <button type="submit" className="w-full text-left py-3 px-4 hover:bg-red-50 rounded-lg transition-colors font-medium text-red-600">Logout</button>
                </form>
              </>
            ) : (
              <>
                <a href="/auth/login" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Login</a>
                <a href="/auth/signup" onClick={() => setOpen(false)} className="py-3 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium text-center">Sign up</a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
