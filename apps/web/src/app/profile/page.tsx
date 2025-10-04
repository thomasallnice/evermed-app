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
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)

  useEffect(() => {
    ;(async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setEmail(user.email || '')
      setName((user.user_metadata as any)?.name || '')

      // Load profile picture from user metadata
      const avatarUrl = (user.user_metadata as any)?.avatar_url
      if (avatarUrl) {
        setProfilePicture(avatarUrl)
      }

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, or WebP)')
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      setError('Image must be smaller than 5MB')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview using FileReader
    const reader = new FileReader()
    reader.onloadend = () => {
      setProfilePicture(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function uploadProfilePicture() {
    if (!selectedFile) return

    setUploadingPicture(true)
    setError(null)
    setOk(null)

    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      setProfilePicture(publicUrl)
      setSelectedFile(null)
      setOk('Profile picture updated')
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
      // Revert preview on error
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      const avatarUrl = (user?.user_metadata as any)?.avatar_url
      setProfilePicture(avatarUrl || null)
      setSelectedFile(null)
    } finally {
      setUploadingPicture(false)
    }
  }

  async function removeProfilePicture() {
    setUploadingPicture(true)
    setError(null)
    setOk(null)

    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Delete from storage
      const avatarUrl = (user.user_metadata as any)?.avatar_url
      if (avatarUrl) {
        const filePath = `${user.id}/avatar`
        // Try to delete, but don't fail if it doesn't exist
        await supabase.storage.from('avatars').remove([filePath])
      }

      // Update user metadata to remove avatar_url
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      })

      if (updateError) throw updateError

      setProfilePicture(null)
      setSelectedFile(null)
      setOk('Profile picture removed')
    } catch (e: any) {
      setError(e?.message || 'Remove failed')
    } finally {
      setUploadingPicture(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md animate-pulse">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Loading profile...</p>
        </div>
      </div>
    )
  }

  const dietCsv = Array.isArray(profile.diet) ? profile.diet.join(', ') : ((profile as any)._dietCsv || '')
  const behaviorsCsv = Array.isArray(profile.behaviors) ? profile.behaviors.join(', ') : ((profile as any)._behaviorsCsv || '')
  const allergiesCsv = Array.isArray(profile.allergies) ? profile.allergies.join(', ') : ((profile as any)._allergiesCsv || '')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage your account and health information</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {ok && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-green-800">{ok}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Profile Picture Section */}
        <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Profile Picture</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Display */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full shadow-md overflow-hidden bg-gray-100 ring-4 ring-gray-50 transition-all">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile picture"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <svg className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              {uploadingPicture && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-4 w-full sm:w-auto">
              <div className="space-y-3">
                <input
                  type="file"
                  id="profile-picture-input"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload profile picture"
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-gray-500">({Math.round(selectedFile.size / 1024)} KB)</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={uploadProfilePicture}
                        disabled={uploadingPicture}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-md"
                      >
                        {uploadingPicture ? 'Uploading...' : 'Save Picture'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFile(null)
                          const supabase = getSupabase()
                          supabase.auth.getUser().then(({ data: { user } }) => {
                            const avatarUrl = (user?.user_metadata as any)?.avatar_url
                            setProfilePicture(avatarUrl || null)
                          })
                        }}
                        disabled={uploadingPicture}
                        className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => document.getElementById('profile-picture-input')?.click()}
                      disabled={uploadingPicture}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                      {profilePicture ? 'Change Picture' : 'Upload Picture'}
                    </button>
                    {profilePicture && (
                      <button
                        onClick={removeProfilePicture}
                        disabled={uploadingPicture}
                        className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                      >
                        Remove Picture
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-600">
                Accepted formats: JPG, PNG, WebP. Max size: 5MB
              </p>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Account</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                aria-label="Your name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Current Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                aria-label="Current email (read-only)"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="new-email" className="block text-sm font-semibold text-gray-700">
                New Email
              </label>
              <input
                id="new-email"
                type="email"
                placeholder="new@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                aria-label="New email address"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={changeEmail}
                disabled={saving || !newEmail || newEmail === email}
                className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
              >
                Change Email
              </button>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                aria-label="New password"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={changePassword}
                disabled={saving || !newPassword || newPassword.length < 8}
                className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
              >
                Change Password
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            Password must be at least 8 characters long.
          </p>
        </section>

        {/* Health Profile Section */}
        <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Health Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="age" className="block text-sm font-semibold text-gray-700">
                Age
              </label>
              <input
                id="age"
                type="number"
                value={profile.age ?? ''}
                onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="Enter age"
                aria-label="Age"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="sex" className="block text-sm font-semibold text-gray-700">
                Sex
              </label>
              <input
                id="sex"
                type="text"
                value={profile.sex ?? ''}
                onChange={(e) => setProfile({ ...profile, sex: e.target.value || undefined })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="e.g., Male, Female"
                aria-label="Sex"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="height" className="block text-sm font-semibold text-gray-700">
                Height (cm)
              </label>
              <input
                id="height"
                type="number"
                value={profile.height_cm ?? ''}
                onChange={(e) => setProfile({ ...profile, height_cm: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="Enter height in cm"
                aria-label="Height in centimeters"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="weight" className="block text-sm font-semibold text-gray-700">
                Weight (kg)
              </label>
              <input
                id="weight"
                type="number"
                value={profile.weight_kg ?? ''}
                onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="Enter weight in kg"
                aria-label="Weight in kilograms"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="diet" className="block text-sm font-semibold text-gray-700">
                Diet
              </label>
              <input
                id="diet"
                type="text"
                value={dietCsv}
                onChange={(e) => setProfile({ ...profile, _dietCsv: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="e.g., vegetarian, gluten-free"
                aria-label="Dietary preferences (comma-separated)"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="behaviors" className="block text-sm font-semibold text-gray-700">
                Behaviors
              </label>
              <input
                id="behaviors"
                type="text"
                value={behaviorsCsv}
                onChange={(e) => setProfile({ ...profile, _behaviorsCsv: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="e.g., exercise, smoking"
                aria-label="Health behaviors (comma-separated)"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="allergies" className="block text-sm font-semibold text-gray-700">
                Allergies
              </label>
              <input
                id="allergies"
                type="text"
                value={allergiesCsv}
                onChange={(e) => setProfile({ ...profile, _allergiesCsv: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="e.g., peanuts, penicillin"
                aria-label="Allergies (comma-separated)"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <p className="text-xs text-gray-600">
            Your profile helps the AI tailor responses. You can update it here at any time.
          </p>
        </section>

        {/* Danger Zone Section */}
        <section className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-red-200">
            <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="delete-confirm" className="block text-sm font-semibold text-gray-700">
                Type <span className="font-mono font-bold">DELETE</span> to confirm account deletion
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                aria-label="Confirm deletion by typing DELETE"
              />
            </div>

            <button
              onClick={deleteAccount}
              disabled={saving || deleteConfirm !== 'DELETE'}
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-all"
            >
              Delete Account
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs text-red-900">
              <strong>Warning:</strong> This action permanently deletes your account and all associated data.
              Storage files are removed best-effort; shared links become invalid. This cannot be undone.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
