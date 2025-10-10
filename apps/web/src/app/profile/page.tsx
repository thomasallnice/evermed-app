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
  avatar_url?: string
  [key: string]: any
}

type SexOption = 'Male' | 'Female' | 'Other' | 'Custom'

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
  const [selectedSex, setSelectedSex] = useState<SexOption | null>(null)
  const [customSex, setCustomSex] = useState<string>('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

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

        // Initialize sex selection state from profile
        if (p.sex) {
          const sexValue = p.sex as string
          if (['Male', 'Female', 'Other'].includes(sexValue)) {
            setSelectedSex(sexValue as SexOption)
          } else {
            setSelectedSex('Custom')
            setCustomSex(sexValue)
          }
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError(null)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const avatarUrl = data.publicUrl

      // Update profile with avatar URL
      setProfile({ ...profile, avatar_url: avatarUrl })
      setOk('Avatar uploaded')
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function save() {
    setSaving(true); setError(null); setOk(null)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const normalized: Profile = { ...profile }

      // Update sex from selection state
      if (selectedSex === 'Custom') {
        normalized.sex = customSex || undefined
      } else if (selectedSex) {
        normalized.sex = selectedSex
      }

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

  if (loading) return <div className="max-w-2xl mx-auto p-6"><p className="text-gray-600">Loading…</p></div>

  const dietCsv = Array.isArray(profile.diet) ? profile.diet.join(', ') : ((profile as any)._dietCsv || '')
  const behaviorsCsv = Array.isArray(profile.behaviors) ? profile.behaviors.join(', ') : ((profile as any)._behaviorsCsv || '')
  const allergiesCsv = Array.isArray(profile.allergies) ? profile.allergies.join(', ') : ((profile as any)._allergiesCsv || '')

  const handleSexSelection = (option: SexOption) => {
    setSelectedSex(option)
    if (option !== 'Custom') {
      setCustomSex('')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Profile</h1>

      {/* Global feedback messages */}
      {ok && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {ok}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Profile Picture */}
      <section className="bg-white rounded-2xl shadow-md p-6 transition-all hover:shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Picture</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {uploadingAvatar ? 'Uploading…' : 'Upload Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-600 mt-2">JPG, PNG or GIF. Max 5MB.</p>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="bg-white rounded-2xl shadow-md p-6 transition-all hover:shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Email
            <input
              value={email}
              readOnly
              className="mt-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Change email
            <input
              placeholder="new@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={changeEmail}
              disabled={saving}
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Change email
            </button>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-white rounded-2xl shadow-md p-6 transition-all hover:shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>
        <form onSubmit={(e) => { e.preventDefault(); changePassword(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            New password
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Change password
            </button>
          </div>
        </form>
      </section>

      {/* Health profile */}
      <section className="bg-white rounded-2xl shadow-md p-6 transition-all hover:shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Profile</h2>
        <div className="space-y-6">
          {/* Sex field with choice chips */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
            <div className="flex flex-wrap gap-2">
              {(['Male', 'Female', 'Other', 'Custom'] as SexOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSexSelection(option)}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                    selectedSex === option
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {selectedSex === 'Custom' && (
              <input
                type="text"
                placeholder="Please specify"
                value={customSex}
                onChange={(e) => setCustomSex(e.target.value)}
                className="mt-3 w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
              />
            )}
          </div>

          {/* Age, Height, Weight grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Age
              <input
                type="number"
                value={profile.age ?? ''}
                onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="25"
                className="mt-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Height
              <div className="relative mt-1">
                <input
                  type="number"
                  value={profile.height_cm ?? ''}
                  onChange={(e) => setProfile({ ...profile, height_cm: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="170"
                  className="w-full px-4 py-2.5 pr-12 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">cm</span>
              </div>
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Weight
              <div className="relative mt-1">
                <input
                  type="number"
                  value={profile.weight_kg ?? ''}
                  onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="70"
                  className="w-full px-4 py-2.5 pr-12 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">kg</span>
              </div>
            </label>
          </div>

          {/* Diet, Behaviors, Allergies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Diet (comma-separated)
              <input
                value={dietCsv}
                onChange={(e) => setProfile({ ...profile, _dietCsv: e.target.value })}
                placeholder="vegetarian, gluten-free"
                className="mt-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Behaviors (comma-separated)
              <input
                value={behaviorsCsv}
                onChange={(e) => setProfile({ ...profile, _behaviorsCsv: e.target.value })}
                placeholder="exercise, meditation"
                className="mt-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700 md:col-span-2">
              Allergies (comma-separated)
              <input
                value={allergiesCsv}
                onChange={(e) => setProfile({ ...profile, _allergiesCsv: e.target.value })}
                placeholder="peanuts, shellfish"
                className="mt-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 transition-all"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          <p className="text-xs text-gray-600">Your profile helps the AI tailor responses. You can update it here at any time.</p>
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-2xl shadow-md p-6 transition-all hover:shadow-lg border-2 border-red-100">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          Once you delete your account, there is no going back. This will permanently delete your account and all associated data. Storage files are removed best-effort; shared links become invalid.
        </p>
        <div className="space-y-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Type <span className="font-bold">DELETE</span> to confirm account deletion
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="mt-1 px-4 py-2.5 bg-white border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:border-red-500 transition-all"
            />
          </label>
          <button
            onClick={deleteAccount}
            disabled={saving || deleteConfirm !== 'DELETE'}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Account Permanently
          </button>
        </div>
      </section>
    </div>
  )
}
