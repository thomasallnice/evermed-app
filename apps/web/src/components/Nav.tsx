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
    <header className="border-b bg-white">
      <div className="container flex items-center justify-between py-3">
        <div className="font-semibold"><a href="/">EverMed.ai</a></div>
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
        {/* Mobile menu trigger */}
        <button className="sm:hidden button-quiet" aria-label="Menu" onClick={() => setOpen((v) => !v)}>☰</button>
      </div>
      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t bg-white">
          <div className="container py-2 flex flex-col gap-2 text-sm">
            <a href="/vault" onClick={() => setOpen(false)}>Vault</a>
            <a href="/upload" onClick={() => setOpen(false)}>Upload</a>
            <a href="/chat" onClick={() => setOpen(false)}>Chat</a>
            <a href="/metabolic/dashboard" onClick={() => setOpen(false)}>Metabolic Insights</a>
            <a href="/profile" onClick={() => setOpen(false)}>Profile</a>
            <a href="/dev" onClick={() => setOpen(false)}>Dev</a>
            <div className="h-px bg-neutral-200 my-1" />
            {email ? (
              <>
                <span className="text-neutral-600">{email}</span>
                <form action="/" onSubmit={async (e) => { e.preventDefault(); await getSupabase().auth.signOut(); window.location.href = '/login' }}>
                  <button type="submit">Logout</button>
                </form>
              </>
            ) : (
              <>
                <a href="/auth/login" onClick={() => setOpen(false)}>Login</a>
                <a href="/auth/signup" onClick={() => setOpen(false)}>Sign up</a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
