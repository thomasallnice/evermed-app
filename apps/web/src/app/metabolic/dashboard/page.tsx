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
  timestamp: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
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

  useEffect(() => {
    loadDashboardData()
  }, [selectedDate])

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
              {/* Meal markers */}
              {mealMarkers.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-gray-600">Meals:</span>
                  {mealMarkers.map((meal, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
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
    </div>
  )
}
