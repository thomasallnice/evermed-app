'use client'
// Force rebuild for Vercel Deployment Protection bypass fix
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api-client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

// Types
interface GlucoseReading {
  timestamp: string
  value: number
}

interface MealMarker {
  id: string
  timestamp: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl: string | null
  analysisStatus: 'pending' | 'completed' | 'failed'
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
}

interface DailySummary {
  avgGlucose: number
  timeInRange: number
  mealsLogged: number
  glucoseSpikes: number
  trend: 'up' | 'down' | 'stable'
}

interface MealImpact {
  id: string
  name: string
  timestamp: string
  peakGlucose: number
  avgRise: number
  rating: 'good' | 'moderate' | 'poor'
}

interface DailyInsight {
  id: string
  type: 'pattern' | 'warning' | 'tip'
  title: string
  description: string
}

export default function MetabolicDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [glucoseData, setGlucoseData] = useState<GlucoseReading[]>([])
  const [mealMarkers, setMealMarkers] = useState<MealMarker[]>([])
  const [bestMeals, setBestMeals] = useState<MealImpact[]>([])
  const [worstMeals, setWorstMeals] = useState<MealImpact[]>([])
  const [insights, setInsights] = useState<DailyInsight[]>([])
  const [error, setError] = useState<string | null>(null)
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [selectedDate])

  // Auto-refresh when there are meals being analyzed
  useEffect(() => {
    const hasProcessingMeals = mealMarkers.some(
      meal => meal.analysisStatus === 'pending'
    )

    if (hasProcessingMeals && !loading) {
      // Poll every 3 seconds
      const intervalId = setInterval(() => {
        console.log('[DASHBOARD] Polling for analysis updates...')
        loadDashboardData()
      }, 3000)

      return () => clearInterval(intervalId)
    }
  }, [mealMarkers, loading])

  async function loadDashboardData() {
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

      // Fetch daily timeline data
      const timelineRes = await apiFetch(`/api/analytics/timeline/daily?date=${selectedDate}`)
      if (!timelineRes.ok) {
        throw new Error('Failed to fetch timeline data')
      }
      const timelineData = await timelineRes.json()
      const fetchedGlucose = timelineData.glucose || []
      const fetchedMeals = timelineData.meals || []

      setGlucoseData(fetchedGlucose)
      setMealMarkers(fetchedMeals)

      // Fetch correlation data (best/worst meals)
      const correlationRes = await apiFetch(
        `/api/analytics/correlation?startDate=${selectedDate}&endDate=${selectedDate}`
      )
      if (!correlationRes.ok) {
        throw new Error('Failed to fetch correlation data')
      }
      const correlationData = await correlationRes.json()
      setBestMeals(correlationData.bestMeals || [])
      setWorstMeals(correlationData.worstMeals || [])

      // Fetch daily insights
      const insightsRes = await apiFetch(`/api/analytics/insights/daily?date=${selectedDate}`)
      if (!insightsRes.ok) {
        throw new Error('Failed to fetch insights')
      }
      const insightsData = await insightsRes.json()
      setInsights(insightsData.insights || [])

      // Calculate summary stats using fetched data (not state, which isn't updated yet)
      if (fetchedGlucose.length > 0) {
        const values = fetchedGlucose.map((r) => r.value)
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const inRange = values.filter((v) => v >= 70 && v <= 180).length
        const spikes = values.filter((v) => v > 180).length

        // Determine trend (simplified)
        const firstHalf = values.slice(0, Math.floor(values.length / 2))
        const secondHalf = values.slice(Math.floor(values.length / 2))
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
        const trend = secondAvg > firstAvg + 5 ? 'up' : secondAvg < firstAvg - 5 ? 'down' : 'stable'

        setSummary({
          avgGlucose: Math.round(avg),
          timeInRange: Math.round((inRange / values.length) * 100),
          mealsLogged: fetchedMeals.length,
          glucoseSpikes: spikes,
          trend,
        })
      } else if (fetchedMeals.length > 0) {
        // If we have meals but no glucose data, create a minimal summary
        setSummary({
          avgGlucose: 0,
          timeInRange: 0,
          mealsLogged: fetchedMeals.length,
          glucoseSpikes: 0,
          trend: 'stable',
        })
      } else {
        setSummary(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get meal type color classes
  function getMealTypeColorClasses(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') {
    const colorMap = {
      breakfast: 'bg-orange-100 text-orange-700 border-orange-200',
      lunch: 'bg-green-100 text-green-700 border-green-200',
      dinner: 'bg-purple-100 text-purple-700 border-purple-200',
      snack: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return colorMap[mealType];
  }

  // Delete meal function
  async function deleteMeal(mealId: string) {
    setDeletingMealId(mealId)
    try {
      const response = await apiFetch(`/api/metabolic/food/${mealId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete meal')
      }

      // Remove from local state
      setMealMarkers((prev) => prev.filter((m) => m.id !== mealId))
      setConfirmDeleteId(null)

      // Reload dashboard to update stats
      await loadDashboardData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete meal')
    } finally {
      setDeletingMealId(null)
    }
  }

  // Transform glucose data for Recharts
  const chartData = glucoseData.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    glucose: reading.value,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Metabolic Insights</h1>
          <div className="flex items-center gap-2">
            <label htmlFor="date-selector" className="text-sm font-medium text-gray-700">
              Date:
            </label>
            <input
              id="date-selector"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            <p className="font-semibold">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl shadow-md p-6 h-96 animate-pulse">
              <div className="h-full bg-gray-200 rounded"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && glucoseData.length === 0 && mealMarkers.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No data for this day</h2>
            <p className="text-gray-600 mb-6">
              Log your first meal and glucose readings to see insights here!
            </p>
            <a
              href="/metabolic/camera"
              className="inline-block rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-colors shadow-md"
            >
              Log Your First Meal
            </a>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && (glucoseData.length > 0 || mealMarkers.length > 0) && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Avg Glucose */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Avg Glucose
                  </span>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📊</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{summary.avgGlucose}</span>
                  <span className="text-sm text-gray-600">mg/dL</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {summary.trend === 'up' && (
                    <span className="text-red-600">↑ Trending up</span>
                  )}
                  {summary.trend === 'down' && (
                    <span className="text-green-600">↓ Trending down</span>
                  )}
                  {summary.trend === 'stable' && (
                    <span className="text-gray-600">→ Stable</span>
                  )}
                </div>
              </div>

              {/* Time in Range */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Time in Range
                  </span>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{summary.timeInRange}</span>
                  <span className="text-sm text-gray-600">%</span>
                </div>
                <div className="mt-2 text-xs text-gray-600">70-180 mg/dL</div>
              </div>

              {/* Meals Logged */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Meals Logged
                  </span>
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 text-xl">🍽️</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{summary.mealsLogged}</span>
                  <span className="text-sm text-gray-600">meals</span>
                </div>
              </div>

              {/* Glucose Spikes */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Glucose Spikes
                  </span>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{summary.glucoseSpikes}</span>
                  <span className="text-sm text-gray-600">spikes</span>
                </div>
                <div className="mt-2 text-xs text-gray-600">&gt;180 mg/dL</div>
              </div>
            </div>

            {/* Glucose Timeline Chart */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Glucose Timeline</h2>
              {glucoseData.length === 0 ? (
                <div className="w-full h-80 sm:h-96 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="text-6xl mb-4">📈</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Glucose Data Yet</h3>
                  <p className="text-sm text-gray-600 text-center max-w-md mb-6">
                    Import glucose readings from Apple Health or connect your CGM to see your glucose timeline and correlations with meals.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href="/metabolic/onboarding"
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-100 text-gray-700 font-semibold px-4 py-2 hover:bg-gray-200 transition-colors border border-gray-300"
                    >
                      <span>📱</span>
                      <span className="text-sm">Import HealthKit</span>
                    </a>
                    <a
                      href="/metabolic/onboarding"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white font-semibold px-4 py-2 hover:bg-blue-700 transition-colors shadow-md"
                    >
                      <span>🔗</span>
                      <span className="text-sm">Connect CGM</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full h-80 sm:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="time"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        label={{
                          value: 'Glucose (mg/dL)',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fontSize: '12px', fill: '#6b7280' },
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      {/* Target range shading (70-180 mg/dL) */}
                      <ReferenceArea
                        y1={70}
                        y2={180}
                        fill="#dcfce7"
                        fillOpacity={0.3}
                        label={{ value: 'Target Range', position: 'insideTopRight', fontSize: 10 }}
                      />
                      <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" />

                      {/* Meal markers as vertical lines */}
                      {mealMarkers.map((meal) => {
                        const mealTime = new Date(meal.timestamp).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        });
                        // Color coding: breakfast=orange, lunch=green, dinner=purple, snack=amber
                        const mealColors = {
                          breakfast: '#f97316', // orange-500
                          lunch: '#10b981',     // green-500
                          dinner: '#8b5cf6',    // purple-500
                          snack: '#f59e0b',     // amber-500
                        };
                        const color = mealColors[meal.type as keyof typeof mealColors];

                        return (
                          <ReferenceLine
                            key={meal.id}
                            x={mealTime}
                            stroke={color}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{
                              value: meal.type === 'breakfast' ? '🌅' : meal.type === 'lunch' ? '☀️' : meal.type === 'dinner' ? '🌙' : '🍎',
                              position: 'top',
                              fontSize: 16,
                            }}
                          />
                        );
                      })}

                      <Line
                        type="monotone"
                        dataKey="glucose"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ fill: '#2563eb', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Meal markers */}
              {mealMarkers.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-gray-600">Meals:</span>
                  {mealMarkers.map((meal, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getMealTypeColorClasses(meal.type)}`}
                    >
                      {meal.type === 'breakfast' && '🌅'}
                      {meal.type === 'lunch' && '☀️'}
                      {meal.type === 'dinner' && '🌙'}
                      {meal.type === 'snack' && '🍎'}
                      {meal.name} ({new Date(meal.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Meals List */}
            {mealMarkers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Meals Today</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...mealMarkers].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((meal) => (
                    <div
                      key={meal.id}
                      className="group border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all relative"
                    >
                      <a href={`/metabolic/entry/${meal.id}`} className="no-underline">
                        {/* Square Image */}
                        <div className="relative aspect-square w-full bg-gray-100">
                          {meal.photoUrl ? (
                            <img
                              src={meal.photoUrl}
                              alt={meal.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">
                              {meal.type === 'breakfast' && '🌅'}
                              {meal.type === 'lunch' && '☀️'}
                              {meal.type === 'dinner' && '🌙'}
                              {meal.type === 'snack' && '🍎'}
                            </div>
                          )}

                          {/* Analyzing Indicator */}
                          {meal.analysisStatus === 'pending' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                              <div className="text-center text-white">
                                <div className="animate-spin text-4xl mb-2">⏳</div>
                                <p className="text-sm font-medium">Analyzing...</p>
                              </div>
                            </div>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              setConfirmDeleteId(meal.id)
                            }}
                            disabled={deletingMealId === meal.id}
                            className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full p-2 shadow-lg transition-colors z-10"
                            aria-label="Delete meal"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Card Content */}
                        <div className="p-4">
                          {/* Meal Type Badge */}
                          <div className="mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide border ${getMealTypeColorClasses(meal.type)}`}>
                              {meal.type}
                            </span>
                          </div>

                          {/* Food Name */}
                          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                            {meal.name || 'Meal'}
                          </h3>

                          {/* Time */}
                          <p className="text-xs text-gray-500 mb-3">
                            {new Date(meal.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>

                          {/* Nutrition Stats */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                              <div className="text-gray-600 uppercase tracking-wide font-medium">Calories</div>
                              <div className="font-semibold text-gray-900">{meal.calories}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                              <div className="text-gray-600 uppercase tracking-wide font-medium">Carbs</div>
                              <div className="font-semibold text-gray-900">{meal.carbs}g</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                              <div className="text-gray-600 uppercase tracking-wide font-medium">Protein</div>
                              <div className="font-semibold text-gray-900">{meal.protein}g</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                              <div className="text-gray-600 uppercase tracking-wide font-medium">Fat</div>
                              <div className="font-semibold text-gray-900">{meal.fat}g</div>
                            </div>
                          </div>
                        </div>
                      </a>

                      {/* Delete Confirmation Dialog - MOBILE-FRIENDLY BUTTONS */}
                      {confirmDeleteId === meal.id && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-20 rounded-2xl">
                          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Meal?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                              Are you sure you want to delete this meal? This action cannot be undone.
                            </p>
                            <div className="flex flex-col gap-3">
                              <button
                                onClick={() => deleteMeal(meal.id)}
                                disabled={deletingMealId === meal.id}
                                className="w-full rounded-xl bg-red-600 text-white font-semibold px-6 py-4 min-h-[56px] hover:bg-red-700 transition-colors disabled:opacity-50 text-lg"
                              >
                                {deletingMealId === meal.id ? 'Deleting...' : 'Delete Meal'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="w-full rounded-xl bg-white text-gray-700 font-semibold px-6 py-4 min-h-[56px] hover:bg-gray-50 transition-colors border-2 border-gray-200 text-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best/Worst Meals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Best Meals */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Best Meals</h2>
                {bestMeals.length === 0 ? (
                  <p className="text-sm text-gray-600">Not enough data yet</p>
                ) : (
                  <div className="space-y-3">
                    {bestMeals.map((meal) => (
                      <div
                        key={meal.id}
                        className="border border-green-200 rounded-lg p-4 bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{meal.name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {new Date(meal.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            Good
                          </span>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-gray-600">
                          <span>Peak: {meal.peakGlucose} mg/dL</span>
                          <span>Avg Rise: +{meal.avgRise} mg/dL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Worst Meals */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Needs Improvement</h2>
                {worstMeals.length === 0 ? (
                  <p className="text-sm text-gray-600">Not enough data yet</p>
                ) : (
                  <div className="space-y-3">
                    {worstMeals.map((meal) => (
                      <div
                        key={meal.id}
                        className="border border-red-200 rounded-lg p-4 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{meal.name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {new Date(meal.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            High Impact
                          </span>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-gray-600">
                          <span>Peak: {meal.peakGlucose} mg/dL</span>
                          <span>Avg Rise: +{meal.avgRise} mg/dL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Insights */}
            {insights.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Insights</h2>
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`border rounded-lg p-4 ${
                        insight.type === 'pattern'
                          ? 'bg-blue-50 border-blue-200'
                          : insight.type === 'warning'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-xl">
                          {insight.type === 'pattern' && '🔍'}
                          {insight.type === 'warning' && '⚠️'}
                          {insight.type === 'tip' && '💡'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{insight.title}</div>
                          <div className="text-sm text-gray-700 mt-1">{insight.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Medical Disclaimer</h3>
          <p className="text-sm text-amber-800">
            This information is for educational purposes only and is not a substitute for
            professional medical advice, diagnosis, or treatment. The metabolic insights provided
            are informational only and should not be used for diagnosis, dosing, or triage
            decisions. Always seek the advice of your physician or other qualified health provider
            with any questions you may have regarding a medical condition.
          </p>
        </div>
      </div>

      {/* Floating Action Button - Log Meal - BIGGER FOR MOBILE */}
      <a
        href="/metabolic/camera"
        className="fixed bottom-6 right-6 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white font-semibold px-6 sm:px-8 py-5 min-h-[64px] min-w-[64px] hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl z-50"
        aria-label="Log Meal"
      >
        <span className="text-3xl">📸</span>
        <span className="hidden sm:inline text-lg">Log Meal</span>
      </a>
    </div>
  )
}
