'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

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
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="container flex items-center justify-between py-3 md:py-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 md:gap-3 group min-h-[44px]">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-200">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-lg md:text-xl font-bold gradient-text-blue-purple">EverMed.ai</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <a href="/vault" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
            Vault
          </a>
          <a href="/upload" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
            Upload
          </a>
          <a href="/track" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
            Track
          </a>
          <a href="/chat" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
            Chat
          </a>
          <a href="/packs" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
            Packs
          </a>
          <a href="/profile" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
            Profile
          </a>

          <div className="h-6 w-px bg-slate-200 mx-2" />

          {email ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]" title={email}>{email}</span>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault(); await getSupabase().auth.signOut(); window.location.href = '/auth/login'
              }}>
                <button type="submit" className="button-secondary text-sm px-4 py-2">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              <a href="/auth/login" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 rounded-lg transition-colors duration-200">
                Login
              </a>
              <a href="/auth/signup" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md">
                Sign up
              </a>
            </>
          )}
        </nav>

        {/* Mobile menu trigger */}
        <button
          className="lg:hidden p-3 min-h-[44px] min-w-[44px] text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center justify-center"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white animate-fade-in">
          <nav className="container py-4 flex flex-col gap-2">
            <a href="/vault" onClick={() => setOpen(false)} className="px-4 py-3 min-h-[44px] text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center">
              Vault
            </a>
            <a href="/upload" onClick={() => setOpen(false)} className="px-4 py-3 min-h-[44px] text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center">
              Upload
            </a>
            <a href="/track" onClick={() => setOpen(false)} className="px-4 py-3 min-h-[44px] text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center">
              Track
            </a>
            <a href="/chat" onClick={() => setOpen(false)} className="px-4 py-3 min-h-[44px] text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center">
              Chat
            </a>
            <a href="/packs" onClick={() => setOpen(false)} className="px-4 py-3 min-h-[44px] text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center">
              Packs
            </a>
            <a href="/profile" onClick={() => setOpen(false)} className="px-4 py-3 min-h-[44px] text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center">
              Profile
            </a>

            <div className="h-px bg-slate-200 my-2" />

            {email ? (
              <>
                <div className="px-4 py-3 min-h-[44px] flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-base font-medium text-slate-700 truncate">{email}</span>
                </div>
                <form onSubmit={async (e) => { e.preventDefault(); await getSupabase().auth.signOut(); window.location.href = '/auth/login' }}>
                  <button type="submit" className="w-full min-h-[44px] button-secondary text-base px-4 py-3">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <a href="/auth/login" onClick={() => setOpen(false)} className="px-4 py-3 min-h-[44px] text-base font-medium text-center text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center justify-center">
                  Login
                </a>
                <a href="/auth/signup" onClick={() => setOpen(false)} className="px-4 py-3 min-h-[44px] text-base font-semibold text-center text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center">
                  Sign up
                </a>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
