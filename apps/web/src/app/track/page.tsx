'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

// Common lab codes and their display names
const LAB_CODES = [
  { code: 'all', display: 'All Labs', group: '' },
  { code: 'glucose', display: 'Glucose', group: 'Metabolic' },
  { code: 'hba1c', display: 'HbA1c', group: 'Metabolic' },
  { code: 'creatinine', display: 'Creatinine', group: 'Metabolic' },
  { code: 'egfr', display: 'eGFR', group: 'Metabolic' },
  { code: 'sodium', display: 'Sodium', group: 'Electrolytes' },
  { code: 'potassium', display: 'Potassium', group: 'Electrolytes' },
  { code: 'hemoglobin', display: 'Hemoglobin', group: 'Hematology' },
  { code: 'hematocrit', display: 'Hematocrit', group: 'Hematology' },
  { code: 'wbc', display: 'WBC', group: 'Hematology' },
  { code: 'platelets', display: 'Platelets', group: 'Hematology' },
  { code: 'total_cholesterol', display: 'Total Cholesterol', group: 'Lipids' },
  { code: 'ldl', display: 'LDL', group: 'Lipids' },
  { code: 'hdl', display: 'HDL', group: 'Lipids' },
  { code: 'triglycerides', display: 'Triglycerides', group: 'Lipids' },
  { code: 'tsh', display: 'TSH', group: 'Thyroid' },
  { code: 'alt', display: 'ALT', group: 'Liver' },
  { code: 'ast', display: 'AST', group: 'Liver' },
  { code: 'crp', display: 'CRP', group: 'Inflammation' },
  { code: 'inr', display: 'INR/PT', group: 'Coagulation' },
]

type Person = {
  id: string
  ownerId: string
  givenName: string | null
  familyName: string | null
  birthYear: number | null
  sexAtBirth: string | null
  locale: string | null
  createdAt: string
}

type Observation = {
  id: string
  personId: string
  code: string
  display: string
  valueNum: number | null
  unit: string | null
  refLow: number | null
  refHigh: number | null
  effectiveAt: string | null
  sourceDocId: string
  sourceAnchor: string | null
  sourceDoc: {
    id: string
    filename: string
    kind: string
    topic: string | null
    uploadedAt: string
  }
}

type ObservationStatus = 'normal' | 'low' | 'high' | 'unknown'

function getObservationStatus(obs: Observation): ObservationStatus {
  if (obs.valueNum === null || obs.refLow === null || obs.refHigh === null) {
    return 'unknown'
  }
  if (obs.valueNum < obs.refLow) return 'low'
  if (obs.valueNum > obs.refHigh) return 'high'
  return 'normal'
}

function getStatusColor(status: ObservationStatus): string {
  switch (status) {
    case 'normal':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'low':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'high':
      return 'text-red-700 bg-red-50 border-red-200'
    case 'unknown':
      return 'text-neutral-600 bg-neutral-50 border-neutral-200'
  }
}

function getStatusLabel(status: ObservationStatus): string {
  switch (status) {
    case 'normal':
      return 'Normal'
    case 'low':
      return 'Low'
    case 'high':
      return 'High'
    case 'unknown':
      return 'N/A'
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown date'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'Invalid date'
  }
}

function formatValue(valueNum: number | null, unit: string | null): string {
  if (valueNum === null) return 'N/A'
  const formatted = valueNum.toFixed(2).replace(/\.00$/, '')
  return unit ? `${formatted} ${unit}` : formatted
}

function formatRefRange(refLow: number | null, refHigh: number | null, unit: string | null): string {
  if (refLow === null || refHigh === null) return 'N/A'
  const low = refLow.toFixed(2).replace(/\.00$/, '')
  const high = refHigh.toFixed(2).replace(/\.00$/, '')
  return unit ? `${low} - ${high} ${unit}` : `${low} - ${high}`
}

export default function TrackPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [person, setPerson] = useState<Person | null>(null)
  const [observations, setObservations] = useState<Observation[]>([])
  const [selectedCode, setSelectedCode] = useState<string>('all')
  const [view, setView] = useState<'table' | 'cards'>('table')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const supabase = getSupabase()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          window.location.href = '/auth/login'
          return
        }

        // Fetch or create person using API
        let personData: Person | null = null
        const personsRes = await fetch('/api/persons')

        if (!personsRes.ok) {
          throw new Error('Failed to fetch persons')
        }

        const personsData = await personsRes.json()
        const existingPersons = personsData.persons || []

        if (existingPersons.length > 0) {
          personData = existingPersons[0]
        } else {
          // Create default person via API
          const createRes = await fetch('/api/persons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              givenName: 'Default',
              familyName: 'User',
              locale: 'en-US',
            })
          })

          if (!createRes.ok) {
            throw new Error('Failed to create person')
          }

          const createData = await createRes.json()
          personData = createData.person
        }

        if (!personData) {
          throw new Error('Failed to load or create person')
        }

        setPerson(personData)

        // Fetch observations
        await fetchObservations(personData.id, selectedCode)
      } catch (e: any) {
        console.error('Error loading data:', e)
        setError(e?.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Fetch observations when selected code changes
  useEffect(() => {
    if (person) {
      fetchObservations(person.id, selectedCode)
    }
  }, [selectedCode, person])

  async function fetchObservations(personId: string, code: string) {
    try {
      const params = new URLSearchParams({ personId })
      if (code !== 'all') {
        params.append('code', code)
      }

      const response = await fetch(`/api/observations?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch observations')
      }

      const data = await response.json()
      setObservations(data || [])
    } catch (e: any) {
      console.error('Error fetching observations:', e)
      setError(e?.message || 'Failed to fetch observations')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
            role="status"
            aria-label="Loading"
          />
          <p className="mt-3 text-gray-600">Loading lab timeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lab Timeline</h1>
          <p className="text-gray-600 mt-2">Track your lab values over time</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredObservations = observations

  // Group observations by code for summary stats
  const observationsByCode = filteredObservations.reduce((acc, obs) => {
    if (!acc[obs.code]) {
      acc[obs.code] = []
    }
    acc[obs.code].push(obs)
    return acc
  }, {} as Record<string, Observation[]>)

  return (
    <div className="min-h-screen bg-gray-50 -m-8 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lab Timeline</h1>
          <p className="text-gray-600 mt-2">
            Track your lab values over time
            {person && person.givenName && ` for ${person.givenName} ${person.familyName || ''}`}
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Lab Code Selector */}
            <div className="flex-1 min-w-[240px] max-w-md">
              <label htmlFor="lab-code-select" className="block text-sm font-semibold text-gray-700 mb-2">
                Select Lab Test
              </label>
              <select
                id="lab-code-select"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
              >
                {LAB_CODES.map((lab) => (
                  <option key={lab.code} value={lab.code}>
                    {lab.group ? `${lab.group}: ${lab.display}` : lab.display}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                {filteredObservations.length} observation{filteredObservations.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex flex-col items-end gap-2">
              <label className="text-sm font-semibold text-gray-700">View Type</label>
              <div className="flex gap-0 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={() => setView('table')}
                  disabled={view === 'table'}
                  className={`px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset ${
                    view === 'table'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-pressed={view === 'table'}
                >
                  Table
                </button>
                <button
                  onClick={() => setView('cards')}
                  disabled={view === 'cards'}
                  className={`px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset border-l border-gray-300 ${
                    view === 'cards'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-pressed={view === 'cards'}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredObservations.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No lab data</h3>
            <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
              {selectedCode === 'all'
                ? 'Upload lab reports to see your timeline here.'
                : `No ${LAB_CODES.find((l) => l.code === selectedCode)?.display || selectedCode} observations found.`}
            </p>
            <div className="mt-6">
              <a
                href="/upload"
                className="inline-flex items-center px-6 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md"
              >
                Upload Lab Report
              </a>
            </div>
          </div>
        )}

        {/* Table View */}
        {filteredObservations.length > 0 && view === 'table' && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Test
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Value
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Reference Range
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredObservations.map((obs) => {
                    const status = getObservationStatus(obs)
                    return (
                      <tr key={obs.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(obs.effectiveAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-semibold text-gray-900">{obs.display}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{obs.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {formatValue(obs.valueNum, obs.unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatRefRange(obs.refLow, obs.refHigh, obs.unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg border ${getStatusColor(
                              status
                            )}`}
                          >
                            {getStatusLabel(status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <a
                            href={`/doc/${obs.sourceDoc.id}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 transition-colors"
                          >
                            <span className="truncate max-w-[200px]">{obs.sourceDoc.filename}</span>
                            <svg
                              className="h-3.5 w-3.5 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cards View */}
        {filteredObservations.length > 0 && view === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredObservations.map((obs) => {
              const status = getObservationStatus(obs)
              return (
                <div
                  key={obs.id}
                  className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg">{obs.display}</h3>
                      <p className="text-xs text-gray-600 mt-1">{obs.code}</p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg border ml-2 flex-shrink-0 ${getStatusColor(
                        status
                      )}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {formatValue(obs.valueNum, obs.unit)}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Reference:</span> {formatRefRange(obs.refLow, obs.refHigh, obs.unit)}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 space-y-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-700">Date:</span> {formatDate(obs.effectiveAt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-700">Source:</span>{' '}
                        <a
                          href={`/doc/${obs.sourceDoc.id}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        >
                          {obs.sourceDoc.filename}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary Stats (shown when viewing all labs) */}
        {selectedCode === 'all' && filteredObservations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Summary Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-3xl font-bold text-gray-900">{filteredObservations.length}</p>
                <p className="text-sm text-gray-600 mt-2 font-medium">Total Observations</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-3xl font-bold text-gray-900">
                  {Object.keys(observationsByCode).length}
                </p>
                <p className="text-sm text-gray-600 mt-2 font-medium">Unique Tests</p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                <p className="text-3xl font-bold text-green-700">
                  {filteredObservations.filter((o) => getObservationStatus(o) === 'normal').length}
                </p>
                <p className="text-sm text-green-700 mt-2 font-medium">Normal Results</p>
              </div>
              <div className="text-center p-6 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-3xl font-bold text-amber-700">
                  {
                    filteredObservations.filter(
                      (o) => getObservationStatus(o) === 'high' || getObservationStatus(o) === 'low'
                    ).length
                  }
                </p>
                <p className="text-sm text-amber-700 mt-2 font-medium">Abnormal Results</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
