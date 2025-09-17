'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = getSupabase()
  const [name, setName] = useState('')
  const [locale, setLocale] = useState('en-US')
  const [role, setRole] = useState('Caregiver')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/auth/login')
      }
    })()
  }, [router, supabase])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, locale, role }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body?.error || 'Failed to complete onboarding')
      setLoading(false)
      return
    }
    router.replace('/vault')
  }

  return (
    <div className="container max-w-md py-16 space-y-6">
      <h1 className="text-2xl font-semibold">Welcome to EverMed.ai</h1>
      <p className="text-sm text-neutral-600">
        Tell us a bit about yourself. You can update this information later in Profile.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-600">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-600">Locale</span>
          <input
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-600">Role</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white rounded py-2">
          {loading ? 'Saving…' : 'Complete onboarding'}
        </button>
      </form>
    </div>
  )
}
