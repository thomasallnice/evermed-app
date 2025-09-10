'use client'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else window.location.href = '/vault'
  }

  return (
    <div className="max-w-sm">
      <h1 className="text-xl font-semibold mb-4">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit">Continue</button>
      </form>
    </div>
  )
}
