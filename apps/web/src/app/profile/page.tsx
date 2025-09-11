'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

type Profile = {
  age?: number
  sex?: string
  height_cm?: number
  weight_kg?: number
  bmi?: number
  diet?: string[]
  behaviors?: string[]
  allergies?: string[]
  [key: string]: any
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>({})
  const [email, setEmail] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [newEmail, setNewEmail] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [deleteConfirm, setDeleteConfirm] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setEmail(user.email || '')
      setName((user.user_metadata as any)?.name || '')
      try {
        const { data: row } = await (supabase as any).from('user_graph').select('profile').eq('user_id', user.id).maybeSingle()
        const p = (row as any)?.profile || {}
        setProfile(p)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function save() {
    setSaving(true); setError(null); setOk(null)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const normalized: Profile = { ...profile }
      // Normalize CSV inputs to arrays
      if (typeof (normalized as any)._dietCsv === 'string') {
        normalized.diet = (normalized as any)._dietCsv.split(',').map((s: string) => s.trim()).filter(Boolean)
        delete (normalized as any)._dietCsv
      }
      if (typeof (normalized as any)._behaviorsCsv === 'string') {
        normalized.behaviors = (normalized as any)._behaviorsCsv.split(',').map((s: string) => s.trim()).filter(Boolean)
        delete (normalized as any)._behaviorsCsv
      }
      if (typeof (normalized as any)._allergiesCsv === 'string') {
        normalized.allergies = (normalized as any)._allergiesCsv.split(',').map((s: string) => s.trim()).filter(Boolean)
        delete (normalized as any)._allergiesCsv
      }
      if (normalized.height_cm && normalized.weight_kg) {
        const bmi = Number(normalized.weight_kg) / Math.pow(Number(normalized.height_cm) / 100, 2)
        normalized.bmi = Math.round(bmi * 10) / 10
      }
      const uid = (await supabase.auth.getUser()).data.user?.id
      // Update auth metadata (name)
      try { await supabase.auth.updateUser({ data: { name } }) } catch {}
      const { error } = await (supabase as any).from('user_graph').upsert({ user_id: uid, profile: normalized }, { onConflict: 'user_id' })
      if (error) throw error
      // Insert metrics for time-series tracking if present
      try {
        if (normalized.weight_kg) {
          await (supabase as any).from('user_metrics').insert({ user_id: uid, kind: 'weight_kg', value_num: normalized.weight_kg, unit: 'kg', source: 'profile-page' })
        }
        if (normalized.height_cm) {
          await (supabase as any).from('user_metrics').insert({ user_id: uid, kind: 'height_cm', value_num: normalized.height_cm, unit: 'cm', source: 'profile-page' })
        }
        if (normalized.bmi) {
          await (supabase as any).from('user_metrics').insert({ user_id: uid, kind: 'bmi', value_num: normalized.bmi, unit: '', source: 'profile-page' })
        }
      } catch {}
      setOk('Saved')
      setProfile(normalized)
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  async function changeEmail() {
    setSaving(true); setError(null); setOk(null)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      if (!newEmail || newEmail === email) { setOk('No changes'); return }
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      setOk('Check your inbox to confirm the new email')
    } catch (e:any) { setError(e?.message || 'Change email failed') } finally { setSaving(false) }
  }

  async function changePassword() {
    setSaving(true); setError(null); setOk(null)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      if (!newPassword || newPassword.length < 8) { setError('Password too short'); return }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setOk('Password updated')
      setNewPassword('')
    } catch (e:any) { setError(e?.message || 'Change password failed') } finally { setSaving(false) }
  }

  async function deleteAccount() {
    setSaving(true); setError(null); setOk(null)
    try {
      if (deleteConfirm !== 'DELETE') { setError('Type DELETE to confirm'); return }
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const res = await fetch('/api/profile/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, email }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Delete failed')
      await supabase.auth.signOut()
      window.location.href = '/signup'
    } catch (e:any) { setError(e?.message || 'Delete failed') } finally { setSaving(false) }
  }

  if (loading) return <p>Loading…</p>

  const dietCsv = Array.isArray(profile.diet) ? profile.diet.join(', ') : ((profile as any)._dietCsv || '')
  const behaviorsCsv = Array.isArray(profile.behaviors) ? profile.behaviors.join(', ') : ((profile as any)._behaviorsCsv || '')
  const allergiesCsv = Array.isArray(profile.allergies) ? profile.allergies.join(', ') : ((profile as any)._allergiesCsv || '')

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {/* Account */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Account</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-sm">Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col text-sm">Email
            <input value={email} readOnly className="bg-neutral-50" />
          </label>
          <label className="flex flex-col text-sm">Change email
            <input placeholder="new@email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </label>
          <div className="flex items-end"><button onClick={changeEmail} disabled={saving}>Change email</button></div>
        </div>
      </section>

      {/* Security */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Security</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-sm">New password
            <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <div className="flex items-end"><button onClick={changePassword} disabled={saving}>Change password</button></div>
        </div>
      </section>

      {/* Health profile */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Health profile</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-sm">Age
          <input type="number" value={profile.age ?? ''} onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="flex flex-col text-sm">Sex
          <input value={profile.sex ?? ''} onChange={(e) => setProfile({ ...profile, sex: e.target.value || undefined })} />
        </label>
        <label className="flex flex-col text-sm">Height (cm)
          <input type="number" value={profile.height_cm ?? ''} onChange={(e) => setProfile({ ...profile, height_cm: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="flex flex-col text-sm">Weight (kg)
          <input type="number" value={profile.weight_kg ?? ''} onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="flex flex-col text-sm">Diet (comma‑separated)
          <input value={dietCsv} onChange={(e) => setProfile({ ...profile, _dietCsv: e.target.value })} />
        </label>
        <label className="flex flex-col text-sm">Behaviors (comma‑separated)
          <input value={behaviorsCsv} onChange={(e) => setProfile({ ...profile, _behaviorsCsv: e.target.value })} />
        </label>
        <label className="flex flex-col text-sm col-span-2">Allergies (comma‑separated)
          <input value={allergiesCsv} onChange={(e) => setProfile({ ...profile, _allergiesCsv: e.target.value })} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {ok && <span className="text-green-600 text-sm">{ok}</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
      <p className="text-xs text-neutral-600">Your profile helps the AI tailor responses. You can update it here at any time.</p>
      </section>

      {/* Danger zone */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
        <div className="grid grid-cols-2 gap-3 items-end">
          <label className="flex flex-col text-sm col-span-2">Type DELETE to confirm account deletion
            <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
          </label>
          <button className="border border-red-600 text-red-700" onClick={deleteAccount} disabled={saving || deleteConfirm !== 'DELETE'}>Delete account</button>
        </div>
        <p className="text-xs text-neutral-600">Deletes your account and data. Storage files are removed best‑effort; shared links become invalid.</p>
      </section>
    </div>
  )
}
