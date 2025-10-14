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
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="container flex items-center justify-between py-3 px-4">
        <div className="font-bold text-lg"><a href="/">EverMed.ai</a></div>
        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <a href="/vault">Vault</a>
          <a href="/upload">Upload</a>
          <a href="/chat">Chat</a>
          <a href="/metabolic/dashboard">Metabolic Insights</a>
          <a href="/profile">Profile</a>
          <a href="/dev">Dev</a>
          <span className="inline-block w-px h-4 bg-neutral-300 mx-1" />
          {email ? (
            <>
              <span className="text-neutral-600">{email}</span>
              <form action="/" onSubmit={async (e) => {
                e.preventDefault(); await getSupabase().auth.signOut(); window.location.href = '/auth/login'
              }}>
                <button type="submit">Logout</button>
              </form>
            </>
          ) : (
            <>
              <a href="/auth/login">Login</a>
              <a href="/auth/signup">Sign up</a>
            </>
          )}
        </nav>
        {/* Mobile menu trigger - BIGGER ICON */}
        <button
          className="sm:hidden flex items-center justify-center w-12 h-12 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      {/* Mobile dropdown - BIGGER TAP TARGETS */}
      {open && (
        <div className="sm:hidden border-t bg-white shadow-lg">
          <div className="container py-2 px-4 flex flex-col gap-1">
            <a href="/vault" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Vault</a>
            <a href="/upload" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Upload</a>
            <a href="/chat" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Chat</a>
            <a href="/metabolic/dashboard" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Metabolic Insights</a>
            <a href="/profile" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Profile</a>
            <a href="/dev" onClick={() => setOpen(false)} className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Dev</a>
            <div className="h-px bg-neutral-200 my-2" />
            {email ? (
              <>
                <span className="py-2 px-4 text-neutral-600 text-sm">{email}</span>
                <form action="/" onSubmit={async (e) => { e.preventDefault(); await getSupabase().auth.signOut(); window.location.href = '/login' }}>
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
