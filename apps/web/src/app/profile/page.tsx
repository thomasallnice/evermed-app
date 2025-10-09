'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

type Profile = {
  givenName?: string
  familyName?: string
  birthYear?: number
  sexAtBirth?: string
  heightCm?: number
  weightKg?: number
  diet?: string[]
  behaviors?: string[]
  allergies?: string[]
  age?: number // Calculated field (read-only)
  bmi?: number // Calculated field (read-only)
  [key: string]: any
}

type ToastMessage = {
  id: number
  message: string
  type: 'success' | 'error'
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
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Chip-based field states
  const [showDietInput, setShowDietInput] = useState(false)
  const [customDiet, setCustomDiet] = useState('')
  const [showBehaviorsInput, setShowBehaviorsInput] = useState(false)
  const [customBehavior, setCustomBehavior] = useState('')
  const [showAllergiesInput, setShowAllergiesInput] = useState(false)
  const [customAllergy, setCustomAllergy] = useState('')

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 4000)
  }

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

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

      // Fetch profile from new API endpoint
      try {
        const res = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
        })

        if (res.ok) {
          const data = await res.json()
          setProfile({
            givenName: data.givenName || undefined,
            familyName: data.familyName || undefined,
            birthYear: data.birthYear || undefined,
            sexAtBirth: data.sexAtBirth || undefined,
            heightCm: data.heightCm || undefined,
            weightKg: data.weightKg || undefined,
            diet: data.diet || [],
            behaviors: data.behaviors || [],
            allergies: data.allergies || [],
            age: data.age || undefined,
            bmi: data.bmi || undefined,
          })
        }
      } catch (e) {
        console.error('Failed to load profile:', e)
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

      // Prepare payload for PATCH /api/profile
      const payload: any = {
        name, // Update auth metadata
      }

      if (normalized.givenName !== undefined) payload.givenName = normalized.givenName
      if (normalized.familyName !== undefined) payload.familyName = normalized.familyName
      if (normalized.birthYear !== undefined) payload.birthYear = normalized.birthYear
      if (normalized.sexAtBirth !== undefined) payload.sexAtBirth = normalized.sexAtBirth
      if (normalized.heightCm !== undefined) payload.heightCm = normalized.heightCm
      if (normalized.weightKg !== undefined) payload.weightKg = normalized.weightKg
      if (normalized.diet !== undefined) payload.diet = normalized.diet
      if (normalized.behaviors !== undefined) payload.behaviors = normalized.behaviors
      if (normalized.allergies !== undefined) payload.allergies = normalized.allergies

      // Call new API endpoint
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Save failed')
      }

      // Update local state with server response (includes calculated BMI and age)
      setProfile({
        givenName: data.givenName || undefined,
        familyName: data.familyName || undefined,
        birthYear: data.birthYear || undefined,
        sexAtBirth: data.sexAtBirth || undefined,
        heightCm: data.heightCm || undefined,
        weightKg: data.weightKg || undefined,
        diet: data.diet || [],
        behaviors: data.behaviors || [],
        allergies: data.allergies || [],
        age: data.age || undefined,
        bmi: data.bmi || undefined,
      })

      showToast('Profile saved successfully', 'success')
      setOk('Saved')
    } catch (e: any) {
      const errorMsg = e?.message || 'Save failed'
      showToast(errorMsg, 'error')
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  async function changeEmail() {
    setSaving(true); setError(null); setOk(null)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      if (!newEmail || newEmail === email) {
        showToast('No changes to email', 'success')
        setOk('No changes')
        return
      }
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      showToast('Check your inbox to confirm the new email', 'success')
      setOk('Check your inbox to confirm the new email')
    } catch (e:any) {
      const errorMsg = e?.message || 'Change email failed'
      showToast(errorMsg, 'error')
      setError(errorMsg)
    } finally { setSaving(false) }
  }

  async function changePassword() {
    setSaving(true); setError(null); setOk(null)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      if (!newPassword || newPassword.length < 8) {
        showToast('Password too short (minimum 8 characters)', 'error')
        setError('Password too short')
        return
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      showToast('Password updated successfully', 'success')
      setOk('Password updated')
      setNewPassword('')
    } catch (e:any) {
      const errorMsg = e?.message || 'Change password failed'
      showToast(errorMsg, 'error')
      setError(errorMsg)
    } finally { setSaving(false) }
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
      showToast('Profile picture updated successfully', 'success')
      setOk('Profile picture updated')
    } catch (e: any) {
      const errorMsg = e?.message || 'Upload failed'
      showToast(errorMsg, 'error')
      setError(errorMsg)
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
      showToast('Profile picture removed successfully', 'success')
      setOk('Profile picture removed')
    } catch (e: any) {
      const errorMsg = e?.message || 'Remove failed'
      showToast(errorMsg, 'error')
      setError(errorMsg)
    } finally {
      setUploadingPicture(false)
    }
  }

  // Common options for chip-based fields
  const COMMON_DIET_OPTIONS = [
    'Vegetarian',
    'Vegan',
    'Pescatarian',
    'Ketogenic',
    'Gluten-free',
    'Lactose-free',
    'Halal',
    'Kosher',
    'Omnivore'
  ]

  const COMMON_BEHAVIOR_OPTIONS = [
    'Regular Exercise',
    'Non-smoker',
    'Smoking',
    'Social Drinking',
    'Meditation',
    'Yoga',
    'Running',
    'Cycling'
  ]

  const COMMON_ALLERGY_OPTIONS = [
    'Peanuts',
    'Tree nuts',
    'Shellfish',
    'Fish',
    'Eggs',
    'Milk/Dairy',
    'Soy',
    'Wheat/Gluten',
    'Penicillin',
    'Latex',
    'Bee stings',
    'Pollen'
  ]

  // Helper functions for chip management
  const addDietItem = (item: string) => {
    const trimmedItem = item.trim()
    if (!trimmedItem) return
    const currentDiet = Array.isArray(profile.diet) ? profile.diet : []
    if (!currentDiet.includes(trimmedItem)) {
      setProfile({ ...profile, diet: [...currentDiet, trimmedItem] })
    }
  }

  const removeDietItem = (item: string) => {
    const currentDiet = Array.isArray(profile.diet) ? profile.diet : []
    setProfile({ ...profile, diet: currentDiet.filter((d) => d !== item) })
  }

  const addBehaviorItem = (item: string) => {
    const trimmedItem = item.trim()
    if (!trimmedItem) return
    const currentBehaviors = Array.isArray(profile.behaviors) ? profile.behaviors : []
    if (!currentBehaviors.includes(trimmedItem)) {
      setProfile({ ...profile, behaviors: [...currentBehaviors, trimmedItem] })
    }
  }

  const removeBehaviorItem = (item: string) => {
    const currentBehaviors = Array.isArray(profile.behaviors) ? profile.behaviors : []
    setProfile({ ...profile, behaviors: currentBehaviors.filter((b) => b !== item) })
  }

  const addAllergyItem = (item: string) => {
    const trimmedItem = item.trim()
    if (!trimmedItem) return
    const currentAllergies = Array.isArray(profile.allergies) ? profile.allergies : []
    if (!currentAllergies.includes(trimmedItem)) {
      setProfile({ ...profile, allergies: [...currentAllergies, trimmedItem] })
    }
  }

  const removeAllergyItem = (item: string) => {
    const currentAllergies = Array.isArray(profile.allergies) ? profile.allergies : []
    setProfile({ ...profile, allergies: currentAllergies.filter((a) => a !== item) })
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
              <label htmlFor="given-name" className="block text-sm font-semibold text-gray-700">
                Given Name
              </label>
              <input
                id="given-name"
                type="text"
                value={profile.givenName ?? ''}
                onChange={(e) => setProfile({ ...profile, givenName: e.target.value || undefined })}
                autoComplete="given-name"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="Enter given name"
                aria-label="Given name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="family-name" className="block text-sm font-semibold text-gray-700">
                Family Name
              </label>
              <input
                id="family-name"
                type="text"
                value={profile.familyName ?? ''}
                onChange={(e) => setProfile({ ...profile, familyName: e.target.value || undefined })}
                autoComplete="family-name"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="Enter family name"
                aria-label="Family name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="date-of-birth" className="block text-sm font-semibold text-gray-700">
                Date of Birth
              </label>
              <input
                id="date-of-birth"
                type="date"
                value={
                  profile.birthYear
                    ? `${profile.birthYear}-01-01`
                    : ''
                }
                onChange={(e) => {
                  const selectedDate = e.target.value
                  if (selectedDate) {
                    const year = new Date(selectedDate).getFullYear()
                    setProfile({ ...profile, birthYear: year })
                  } else {
                    setProfile({ ...profile, birthYear: undefined })
                  }
                }}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                aria-label="Date of birth"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="age" className="block text-sm font-semibold text-gray-700">
                Age (Calculated)
              </label>
              <input
                id="age"
                type="text"
                value={profile.age ?? '—'}
                readOnly
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                aria-label="Age (calculated from birth year, read-only)"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="sex-at-birth" className="block text-sm font-semibold text-gray-700">
                Sex at Birth
              </label>
              <select
                id="sex-at-birth"
                value={profile.sexAtBirth ?? ''}
                onChange={(e) => setProfile({ ...profile, sexAtBirth: e.target.value || undefined })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                aria-label="Sex at birth"
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Intersex">Intersex</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="bmi" className="block text-sm font-semibold text-gray-700">
                BMI (Calculated)
              </label>
              <input
                id="bmi"
                type="text"
                value={profile.bmi ?? '—'}
                readOnly
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                aria-label="BMI (calculated from height and weight, read-only)"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="height" className="block text-sm font-semibold text-gray-700">
                Height (cm)
              </label>
              <input
                id="height"
                type="number"
                min="0"
                max="300"
                step="1"
                value={profile.heightCm ?? ''}
                onChange={(e) => setProfile({ ...profile, heightCm: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="Enter height in cm"
                aria-label="Height in centimeters"
              />
              <p className="text-xs text-gray-600">Typical range: 140-210 cm</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="weight" className="block text-sm font-semibold text-gray-700">
                Weight (kg)
              </label>
              <input
                id="weight"
                type="number"
                min="0"
                max="500"
                step="0.1"
                value={profile.weightKg ?? ''}
                onChange={(e) => setProfile({ ...profile, weightKg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                placeholder="Enter weight in kg"
                aria-label="Weight in kilograms"
              />
              <p className="text-xs text-gray-600">Typical range: 40-200 kg</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Diet
              </label>

              {/* Common diet options */}
              <div className="flex flex-wrap gap-2">
                {COMMON_DIET_OPTIONS.map((option) => {
                  const isSelected = Array.isArray(profile.diet) && profile.diet.includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => isSelected ? removeDietItem(option) : addDietItem(option)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                        isSelected
                          ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-label={`${isSelected ? 'Remove' : 'Add'} ${option}`}
                      aria-pressed={isSelected}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* Selected items as chips */}
              {Array.isArray(profile.diet) && profile.diet.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-xs font-medium text-green-700 uppercase tracking-wide self-center">Selected:</span>
                  {profile.diet.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-green-100 text-green-700 border border-green-200 rounded-full transition-all hover:bg-green-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeDietItem(item)}
                        className="ml-0.5 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1 rounded-full transition-all"
                        aria-label={`Remove ${item}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add custom input */}
              {showDietInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDiet}
                    onChange={(e) => setCustomDiet(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addDietItem(customDiet)
                        setCustomDiet('')
                        setShowDietInput(false)
                      } else if (e.key === 'Escape') {
                        setCustomDiet('')
                        setShowDietInput(false)
                      }
                    }}
                    placeholder="Enter custom diet..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white transition-all"
                    autoFocus
                    aria-label="Custom diet entry"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addDietItem(customDiet)
                      setCustomDiet('')
                      setShowDietInput(false)
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-all shadow-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDiet('')
                      setShowDietInput(false)
                    }}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDietInput(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add custom
                </button>
              )}

              <p className="text-xs text-gray-600">Select common options or add your own dietary preferences</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Behaviors
              </label>

              {/* Common behavior options */}
              <div className="flex flex-wrap gap-2">
                {COMMON_BEHAVIOR_OPTIONS.map((option) => {
                  const isSelected = Array.isArray(profile.behaviors) && profile.behaviors.includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => isSelected ? removeBehaviorItem(option) : addBehaviorItem(option)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-label={`${isSelected ? 'Remove' : 'Add'} ${option}`}
                      aria-pressed={isSelected}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* Selected items as chips */}
              {Array.isArray(profile.behaviors) && profile.behaviors.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wide self-center">Selected:</span>
                  {profile.behaviors.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-full transition-all hover:bg-blue-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeBehaviorItem(item)}
                        className="ml-0.5 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 rounded-full transition-all"
                        aria-label={`Remove ${item}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add custom input */}
              {showBehaviorsInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customBehavior}
                    onChange={(e) => setCustomBehavior(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addBehaviorItem(customBehavior)
                        setCustomBehavior('')
                        setShowBehaviorsInput(false)
                      } else if (e.key === 'Escape') {
                        setCustomBehavior('')
                        setShowBehaviorsInput(false)
                      }
                    }}
                    placeholder="Enter custom behavior..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition-all"
                    autoFocus
                    aria-label="Custom behavior entry"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addBehaviorItem(customBehavior)
                      setCustomBehavior('')
                      setShowBehaviorsInput(false)
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all shadow-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomBehavior('')
                      setShowBehaviorsInput(false)
                    }}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBehaviorsInput(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add custom
                </button>
              )}

              <p className="text-xs text-gray-600">Select common options or add your own health behaviors</p>
            </div>

            <div className="space-y-3 sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700">
                Allergies
              </label>

              {/* Common allergy options */}
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGY_OPTIONS.map((option) => {
                  const isSelected = Array.isArray(profile.allergies) && profile.allergies.includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => isSelected ? removeAllergyItem(option) : addAllergyItem(option)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
                        isSelected
                          ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-label={`${isSelected ? 'Remove' : 'Add'} ${option}`}
                      aria-pressed={isSelected}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* Selected items as chips */}
              {Array.isArray(profile.allergies) && profile.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs font-medium text-red-700 uppercase tracking-wide self-center">Selected:</span>
                  {profile.allergies.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-red-100 text-red-700 border border-red-200 rounded-full transition-all hover:bg-red-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeAllergyItem(item)}
                        className="ml-0.5 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 rounded-full transition-all"
                        aria-label={`Remove ${item}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add custom input */}
              {showAllergiesInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addAllergyItem(customAllergy)
                        setCustomAllergy('')
                        setShowAllergiesInput(false)
                      } else if (e.key === 'Escape') {
                        setCustomAllergy('')
                        setShowAllergiesInput(false)
                      }
                    }}
                    placeholder="Enter custom allergy..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 bg-white transition-all"
                    autoFocus
                    aria-label="Custom allergy entry"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addAllergyItem(customAllergy)
                      setCustomAllergy('')
                      setShowAllergiesInput(false)
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 transition-all shadow-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomAllergy('')
                      setShowAllergiesInput(false)
                    }}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAllergiesInput(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add custom
                </button>
              )}

              <p className="text-xs text-gray-600">
                <strong className="text-red-700">Important:</strong> Select common options or add your own allergies. This information helps personalize health recommendations.
              </p>
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

      {/* Toast Notification Container */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all duration-300 ease-out animate-slide-in ${
              toast.type === 'success'
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-red-100 text-red-700 border-red-200'
            }`}
            style={{
              animation: 'slideIn 0.3s ease-out forwards'
            }}
          >
            {/* Icon */}
            {toast.type === 'success' ? (
              <svg
                className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}

            {/* Message */}
            <p className="flex-1 text-sm font-medium">{toast.message}</p>

            {/* Close Button */}
            <button
              onClick={() => dismissToast(toast.id)}
              className={`flex-shrink-0 hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded transition-all ${
                toast.type === 'success'
                  ? 'focus:ring-green-600'
                  : 'focus:ring-red-600'
              }`}
              aria-label="Dismiss notification"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Keyframe animation styles */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
