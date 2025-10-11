'use client'
import { useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = getSupabase()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/reset-password`
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-all">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-sm text-gray-600 mb-6">
            Enter your email address and we'll send you a link to reset your password
          </p>

          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                Check your email for a password reset link
              </div>
              <Link
                href="/auth/login"
                className="block w-full text-center bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg px-4 py-2.5 font-semibold transition-colors"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </label>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-semibold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <Link
                href="/auth/login"
                className="block w-full text-center bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg px-4 py-2.5 font-semibold transition-colors"
              >
                Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
