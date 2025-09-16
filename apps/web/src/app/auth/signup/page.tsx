'use client'
import { useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = getSupabase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signUp({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    window.location.href = '/auth/onboarding'
  }

  return (
    <div className="container max-w-md py-16 space-y-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-600">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-600">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white rounded py-2">
          {loading ? 'Signing up…' : 'Sign up'}
        </button>
      </form>
      <p className="text-sm text-neutral-600">
        Already have an account? <Link className="text-blue-600" href="/auth/login">Log in</Link>
      </p>
    </div>
  )
}
