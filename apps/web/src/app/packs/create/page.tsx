'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { MEDICAL_DISCLAIMER } from '@/lib/copy'

// Types
type Person = {
  id: string
  ownerId: string
  givenName: string | null
  familyName: string | null
}

type Document = {
  id: string
  personId: string
  filename: string
  kind: string
  uploadedAt: string
}

type Observation = {
  id: string
  personId: string
  code: string
  display: string
  valueNum: number | null
  unit: string | null
  effectiveAt: string | null
}

type PackItem = {
  documentId?: string
  observationId?: string
}

type Audience = 'cardiology' | 'school' | 'urgent'

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

const AUDIENCE_INFO: Record<Audience, { label: string; description: string; icon: string }> = {
  cardiology: {
    label: 'Cardiology',
    description: 'Share cardiovascular records with your cardiologist',
    icon: '❤️',
  },
  school: {
    label: 'School',
    description: 'Share immunization and health records with school staff',
    icon: '🏫',
  },
  urgent: {
    label: 'Urgent Care',
    description: 'Quick pack for emergency or urgent care visits',
    icon: '🚑',
  },
}

export default function CreatePackPage() {
  const router = useRouter()
  const supabase = getSupabase()

  // Authentication state
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)

  // Step 1: Pack Details
  const [title, setTitle] = useState('')
  const [audience, setAudience] = useState<Audience>('cardiology')
  const [expiryDays, setExpiryDays] = useState(7)

  // Step 2: Person Selection
  const [persons, setPersons] = useState<Person[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [loadingPersons, setLoadingPersons] = useState(false)

  // Step 3: Documents
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set())
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  // Step 4: Observations
  const [observations, setObservations] = useState<Observation[]>([])
  const [selectedObservationIds, setSelectedObservationIds] = useState<Set<string>>(new Set())
  const [loadingObservations, setLoadingObservations] = useState(false)

  // Step 5: Passcode
  const [passcode, setPasscode] = useState('')
  const [passcodeConfirm, setPasscodeConfirm] = useState('')

  // Step 6/7: Creation & Success
  const [creating, setCreating] = useState(false)
  const [createdPack, setCreatedPack] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      setUserId(user.id)
      setLoading(false)
    }
    checkAuth()
  }, [supabase, router])

  // Load persons when userId is available
  useEffect(() => {
    if (!userId) return
    loadPersons()
  }, [userId])

  async function loadPersons() {
    if (!userId) return
    setLoadingPersons(true)
    try {
      const { data, error } = await supabase
        .from('Person')
        .select('*')
        .eq('ownerId', userId)

      if (error) throw error

      const personsList = (data || []) as Person[]
      setPersons(personsList)

      // Auto-select if only one person
      if (personsList.length === 1) {
        setSelectedPersonId(personsList[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load persons')
    } finally {
      setLoadingPersons(false)
    }
  }

  async function loadDocuments(personId: string) {
    setLoadingDocuments(true)
    try {
      const { data, error } = await supabase
        .from('Document')
        .select('*')
        .eq('personId', personId)
        .order('uploadedAt', { ascending: false })

      if (error) throw error
      setDocuments((data || []) as Document[])
    } catch (err: any) {
      setError(err.message || 'Failed to load documents')
    } finally {
      setLoadingDocuments(false)
    }
  }

  async function loadObservations(personId: string) {
    setLoadingObservations(true)
    try {
      const { data, error } = await supabase
        .from('Observation')
        .select('*')
        .eq('personId', personId)
        .order('effectiveAt', { ascending: false })

      if (error) throw error
      setObservations((data || []) as Observation[])
    } catch (err: any) {
      setError(err.message || 'Failed to load observations')
    } finally {
      setLoadingObservations(false)
    }
  }

  function validateStep(step: WizardStep): boolean {
    setError(null)

    switch (step) {
      case 1:
        if (!title.trim()) {
          setError('Please enter a pack title')
          return false
        }
        return true

      case 2:
        if (!selectedPersonId) {
          setError('Please select a person')
          return false
        }
        return true

      case 3:
        // Documents are optional, but if none selected, show warning
        return true

      case 4:
        // Observations are optional
        return true

      case 5:
        if (passcode.length < 4) {
          setError('Passcode must be at least 4 characters')
          return false
        }
        if (passcode !== passcodeConfirm) {
          setError('Passcodes do not match')
          return false
        }
        return true

      default:
        return true
    }
  }

  async function handleNext() {
    if (!validateStep(currentStep)) return

    // Load data when entering specific steps
    if (currentStep === 2 && selectedPersonId) {
      await loadDocuments(selectedPersonId)
      await loadObservations(selectedPersonId)
    }

    setCurrentStep((prev) => Math.min(7, prev + 1) as WizardStep)
  }

  function handlePrevious() {
    setError(null)
    setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep)
  }

  async function createPack() {
    if (!validateStep(5)) return

    setCreating(true)
    setError(null)

    try {
      const items: PackItem[] = [
        ...Array.from(selectedDocumentIds).map((id) => ({ documentId: id })),
        ...Array.from(selectedObservationIds).map((id) => ({ observationId: id })),
      ]

      const response = await fetch('/api/share-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: selectedPersonId,
          title,
          audience,
          items,
          expiryDays,
          passcode,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create pack')
      }

      const pack = await response.json()
      setCreatedPack(pack)
      setCurrentStep(7)
    } catch (err: any) {
      setError(err.message || 'Failed to create appointment pack')
    } finally {
      setCreating(false)
    }
  }

  function getPasscodeStrength(pwd: string): { strength: string; color: string } {
    if (pwd.length < 4) return { strength: 'Too short', color: 'text-red-600' }
    if (pwd.length < 6) return { strength: 'Weak', color: 'text-yellow-600' }
    if (pwd.length < 8) return { strength: 'Good', color: 'text-blue-600' }
    return { strength: 'Strong', color: 'text-green-600' }
  }

  const toggleDocument = (id: string) => {
    setSelectedDocumentIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleObservation = (id: string) => {
    setSelectedObservationIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  function resetWizard() {
    setCurrentStep(1)
    setTitle('')
    setAudience('cardiology')
    setExpiryDays(7)
    setSelectedPersonId('')
    setSelectedDocumentIds(new Set())
    setSelectedObservationIds(new Set())
    setPasscode('')
    setPasscodeConfirm('')
    setCreatedPack(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-neutral-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-neutral-900">Create Appointment Pack</h1>
        <p className="text-sm text-neutral-600">
          Curate and share medical records securely with healthcare providers or schools
        </p>
      </div>

      {/* Medical Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">{MEDICAL_DISCLAIMER}</p>
      </div>

      {/* Progress Indicator */}
      {currentStep < 7 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>Step {currentStep} of 6</span>
            <span>{Math.round((currentStep / 6) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
              role="progressbar"
              aria-valuenow={(currentStep / 6) * 100}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-medium text-red-900">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 min-h-[400px]">
        {/* Step 1: Pack Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-neutral-900">Pack Details</h2>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-neutral-700 mb-1">
                  Pack Title <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Cardiology Appointment - Dr. Smith"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                />
              </label>

              <div className="space-y-2">
                <span className="block text-sm font-medium text-neutral-700">
                  Audience Type <span className="text-red-500">*</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(AUDIENCE_INFO) as Audience[]).map((aud) => {
                    const info = AUDIENCE_INFO[aud]
                    const isSelected = audience === aud
                    return (
                      <button
                        key={aud}
                        onClick={() => setAudience(aud)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-neutral-300 hover:border-blue-400'
                        }`}
                        type="button"
                        aria-pressed={isSelected}
                      >
                        <div className="text-2xl mb-2">{info.icon}</div>
                        <div className="font-semibold text-neutral-900 mb-1">{info.label}</div>
                        <div className="text-sm text-neutral-600">{info.description}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-neutral-700 mb-1">
                  Expiry Days
                </span>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="flex-1"
                    aria-label="Pack expiry days"
                  />
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Math.max(1, Math.min(30, Number(e.target.value))))}
                    className="w-20 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Pack expiry days input"
                  />
                  <span className="text-sm text-neutral-600">days</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Pack will expire in {expiryDays} {expiryDays === 1 ? 'day' : 'days'}
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Select Person */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-neutral-900">Select Person</h2>

            {loadingPersons ? (
              <p className="text-neutral-600">Loading persons...</p>
            ) : persons.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-neutral-600">No persons found in your account.</p>
                <p className="text-sm text-neutral-500">
                  You need to create a person profile before creating an appointment pack.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {persons.map((person) => {
                  const displayName = [person.givenName, person.familyName]
                    .filter(Boolean)
                    .join(' ') || 'Unnamed Person'
                  const isSelected = selectedPersonId === person.id

                  return (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPersonId(person.id)}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-neutral-300 hover:border-blue-400'
                      }`}
                      type="button"
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-neutral-900">{displayName}</div>
                          <div className="text-sm text-neutral-500">ID: {person.id.slice(0, 8)}...</div>
                        </div>
                        {isSelected && (
                          <div className="text-blue-600">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Documents */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900">Select Documents</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Choose documents to include in this appointment pack
              </p>
            </div>

            {loadingDocuments ? (
              <p className="text-neutral-600">Loading documents...</p>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 bg-neutral-50 rounded-lg">
                <p className="text-neutral-600 mb-2">No documents found for this person.</p>
                <p className="text-sm text-neutral-500">
                  You can skip this step and add observations only, or upload documents first.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-neutral-600 mb-4">
                  {selectedDocumentIds.size} of {documents.length} documents selected
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {documents.map((doc) => {
                    const isSelected = selectedDocumentIds.has(doc.id)
                    return (
                      <label
                        key={doc.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-neutral-300 hover:border-blue-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDocument(doc.id)}
                          className="mt-1 w-5 h-5 text-blue-600 border-neutral-300 rounded focus:ring-2 focus:ring-blue-500"
                          aria-label={`Select ${doc.filename}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900 truncate">{doc.filename}</div>
                          <div className="text-sm text-neutral-600 mt-1">
                            <span className="inline-block px-2 py-0.5 bg-neutral-200 rounded text-xs mr-2">
                              {doc.kind}
                            </span>
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Select Observations */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900">Select Observations</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Choose lab results and observations to include (optional)
              </p>
            </div>

            {loadingObservations ? (
              <p className="text-neutral-600">Loading observations...</p>
            ) : observations.length === 0 ? (
              <div className="text-center py-8 bg-neutral-50 rounded-lg">
                <p className="text-neutral-600 mb-2">No observations found for this person.</p>
                <p className="text-sm text-neutral-500">
                  You can skip this step and proceed with documents only.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-neutral-600 mb-4">
                  {selectedObservationIds.size} of {observations.length} observations selected
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {observations.map((obs) => {
                    const isSelected = selectedObservationIds.has(obs.id)
                    return (
                      <label
                        key={obs.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-neutral-300 hover:border-blue-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleObservation(obs.id)}
                          className="mt-1 w-5 h-5 text-blue-600 border-neutral-300 rounded focus:ring-2 focus:ring-blue-500"
                          aria-label={`Select ${obs.display}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900">{obs.display}</div>
                          <div className="text-sm text-neutral-600 mt-1 flex flex-wrap gap-x-4">
                            {obs.valueNum !== null && obs.unit && (
                              <span>
                                Value: {obs.valueNum} {obs.unit}
                              </span>
                            )}
                            <span className="text-neutral-500">Code: {obs.code}</span>
                            {obs.effectiveAt && (
                              <span>{new Date(obs.effectiveAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Set Passcode */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900">Set Passcode</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Create a secure passcode to protect this appointment pack
              </p>
            </div>

            <div className="space-y-4 max-w-md">
              <label className="block">
                <span className="block text-sm font-medium text-neutral-700 mb-1">
                  Passcode <span className="text-red-500">*</span>
                </span>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter at least 4 characters"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                  minLength={4}
                />
                {passcode && (
                  <p className={`text-sm mt-1 ${getPasscodeStrength(passcode).color}`}>
                    Strength: {getPasscodeStrength(passcode).strength}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-neutral-700 mb-1">
                  Confirm Passcode <span className="text-red-500">*</span>
                </span>
                <input
                  type="password"
                  value={passcodeConfirm}
                  onChange={(e) => setPasscodeConfirm(e.target.value)}
                  placeholder="Re-enter passcode"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                  minLength={4}
                />
                {passcodeConfirm && passcode === passcodeConfirm && (
                  <p className="text-sm text-green-600 mt-1">Passcodes match</p>
                )}
              </label>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900 font-medium mb-1">Important:</p>
                <p className="text-sm text-yellow-800">
                  Share this passcode separately with the recipient (e.g., via phone or in person).
                  Do not send it through the same channel as the pack link.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Create */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900">Review & Create</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Review your appointment pack details before creating
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-50 rounded-lg p-4">
                  <h3 className="font-semibold text-neutral-900 mb-2">Pack Details</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-neutral-600">Title:</dt>
                      <dd className="font-medium text-neutral-900">{title}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-600">Audience:</dt>
                      <dd className="font-medium text-neutral-900">
                        {AUDIENCE_INFO[audience].icon} {AUDIENCE_INFO[audience].label}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-600">Expires in:</dt>
                      <dd className="font-medium text-neutral-900">{expiryDays} days</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-neutral-50 rounded-lg p-4">
                  <h3 className="font-semibold text-neutral-900 mb-2">Content</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-neutral-600">Documents:</dt>
                      <dd className="font-medium text-neutral-900">
                        {selectedDocumentIds.size} selected
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-600">Observations:</dt>
                      <dd className="font-medium text-neutral-900">
                        {selectedObservationIds.size} selected
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-600">Passcode:</dt>
                      <dd className="font-medium text-neutral-900">{'•'.repeat(passcode.length)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {selectedDocumentIds.size === 0 && selectedObservationIds.size === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900 font-medium mb-1">Warning:</p>
                  <p className="text-sm text-yellow-800">
                    You haven't selected any documents or observations. The pack will be empty.
                  </p>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={createPack}
                  disabled={creating}
                  className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
                >
                  {creating ? 'Creating Pack...' : 'Create Appointment Pack'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Success */}
        {currentStep === 7 && createdPack && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900">Pack Created Successfully!</h2>
              <p className="text-sm text-neutral-600 mt-2">
                Your appointment pack is ready to share
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Share Link</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/share/${createdPack.shareId}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm text-neutral-900"
                    aria-label="Share link"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/share/${createdPack.shareId}`
                      )
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                    aria-label="Copy share link"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-3">Passcode</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={passcode}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded text-sm text-neutral-900 font-mono"
                    aria-label="Passcode"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(passcode)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors font-medium whitespace-nowrap"
                    aria-label="Copy passcode"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-yellow-800 mt-2">
                  Remember to share the passcode separately from the link
                </p>
              </div>

              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold text-neutral-900 mb-2">Pack Summary</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-neutral-600">Title:</dt>
                    <dd className="font-medium text-neutral-900">{createdPack.title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-600">Documents:</dt>
                    <dd className="font-medium text-neutral-900">
                      {createdPack.documents?.length || 0}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-600">Observations:</dt>
                    <dd className="font-medium text-neutral-900">
                      {createdPack.observations?.length || 0}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-600">Expires:</dt>
                    <dd className="font-medium text-neutral-900">
                      {new Date(createdPack.expiresAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <a
                  href={`/share/${createdPack.shareId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 bg-neutral-900 text-white text-center rounded-lg hover:bg-neutral-800 transition-colors font-medium"
                >
                  View Pack
                </a>
                <button
                  onClick={resetWizard}
                  className="flex-1 px-6 py-3 bg-white border-2 border-neutral-300 text-neutral-900 rounded-lg hover:border-neutral-400 transition-colors font-medium"
                >
                  Create Another Pack
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 7 && (
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Previous
          </button>

          {currentStep < 6 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Next
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
