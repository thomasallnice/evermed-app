'use client'
import { useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = getSupabase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    window.location.href = '/metabolic/dashboard'
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError(null)
    setEmail('1@1.com')
    setPassword('11111111')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: '1@1.com',
      password: '11111111'
    })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    window.location.href = '/metabolic/dashboard'
  }

  return (
    <div className="container max-w-md py-16 space-y-6">
      <h1 className="text-2xl font-semibold">Login</h1>
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
        <div className="text-right">
          <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 underline">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white rounded py-2">
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        🚀 Demo Login (1@1.com)
      </button>

      <p className="text-sm text-neutral-600">
        No account yet? <Link className="text-blue-600" href="/auth/signup">Sign up</Link>
      </p>
    </div>
  )
}
