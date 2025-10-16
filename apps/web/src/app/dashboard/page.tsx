'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api-client'
import GlucoseRing from '@/components/glucose/GlucoseRing'
import InsightCard from '@/components/glucose/InsightCard'
import MealCard from '@/components/glucose/MealCard'
import BottomNav from '@/components/BottomNav'
import { Camera, Plus, Check, X, Settings } from 'lucide-react'
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
  Scatter,
  ScatterChart,
  ComposedChart,
  Legend,
} from 'recharts'

/**
 * GlucoLens Dashboard - Main app screen
 *
 * Features:
 * - Current glucose display (large glucose ring)
 * - Quick actions (camera, manual entry)
 * - Today's timeline (glucose + meals)
 * - Latest insights
 * - Mobile-first, thumb-friendly design
 */

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
  photoUrls?: string[]
  analysisStatus: 'pending' | 'completed' | 'failed'
  calories: number
  carbs: number
  protein: number
  fat: number
}

interface DailyInsight {
  id: string
  type: 'pattern' | 'warning' | 'tip'
  title: string
  description: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Current glucose state
  const [currentGlucose, setCurrentGlucose] = useState<number | null>(null)
  const [glucoseTrend, setGlucoseTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [glucoseTimestamp, setGlucoseTimestamp] = useState<string | null>(null)

  // Timeline data
  const [glucoseData, setGlucoseData] = useState<GlucoseReading[]>([])
  const [todayMeals, setTodayMeals] = useState<MealMarker[]>([])

  // Timeline filters
  const [timeRange, setTimeRange] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all')

  // Insights
  const [dailyInsights, setDailyInsights] = useState<DailyInsight[]>([])

  // Toast for meal completion
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [completedMealName, setCompletedMealName] = useState<string>('')

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  // Separate effect for polling that doesn't recreate interval
  useEffect(() => {
    const hasPending = todayMeals.some(meal => meal.analysisStatus === 'pending')

    if (!hasPending) return // No polling needed

    const pollInterval = setInterval(async () => {
      await checkAuthAndLoadData(true) // Pass true to skip loading state
    }, 5000) // Check every 5 seconds

    return () => clearInterval(pollInterval)
  }, [todayMeals.some(meal => meal.analysisStatus === 'pending')])

  async function checkAuthAndLoadData(skipLoadingState = false) {
    if (!skipLoadingState) {
      setLoading(true)
    }
    setError(null)

    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch today's timeline data
      const today = new Date().toISOString().split('T')[0]
      const timelineRes = await apiFetch(`/api/analytics/timeline/daily?date=${today}`)

      if (!timelineRes.ok) {
        if (timelineRes.status === 404) {
          // Person record missing - redirect to onboarding
          router.push('/auth/onboarding')
          return
        }
        throw new Error('Failed to fetch timeline data')
      }

      const timelineData = await timelineRes.json()
      const fetchedGlucose = timelineData.glucose || []
      const fetchedMeals = timelineData.meals || []

      // Check if any meal just completed analysis
      if (todayMeals.length > 0 && fetchedMeals.length > 0) {
        const justCompleted = fetchedMeals.find((newMeal: MealMarker) => {
          const oldMeal = todayMeals.find(m => m.id === newMeal.id)
          return oldMeal?.analysisStatus === 'pending' && newMeal.analysisStatus === 'completed'
        })

        if (justCompleted) {
          setCompletedMealName(justCompleted.name)
          setShowSuccessToast(true)
          setTimeout(() => setShowSuccessToast(false), 5000)
        }
      }

      setGlucoseData(fetchedGlucose)
      setTodayMeals(fetchedMeals)

      // Set current glucose (most recent reading)
      if (fetchedGlucose.length > 0) {
        const latest = fetchedGlucose[fetchedGlucose.length - 1]
        setCurrentGlucose(latest.value)
        setGlucoseTimestamp(latest.timestamp)

        // Calculate trend (compare last two readings)
        if (fetchedGlucose.length >= 2) {
          const previous = fetchedGlucose[fetchedGlucose.length - 2]
          const diff = latest.value - previous.value
          if (diff > 5) setGlucoseTrend('up')
          else if (diff < -5) setGlucoseTrend('down')
          else setGlucoseTrend('stable')
        }
      }

      // Fetch daily insights
      const insightsRes = await apiFetch(`/api/analytics/insights/daily?date=${today}`)
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json()
        if (insightsData.insights && insightsData.insights.length > 0) {
          setDailyInsights(insightsData.insights)
        } else {
          setDailyInsights([])
        }
      }
    } catch (err: any) {
      console.error('Dashboard load error:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      if (!skipLoadingState) {
        setLoading(false)
      }
    }
  }

  // Filter data by time range
  const filterByTimeRange = (timestamp: string) => {
    const date = new Date(timestamp)
    const hour = date.getHours()

    switch (timeRange) {
      case 'morning': // 6 AM - 12 PM
        return hour >= 6 && hour < 12
      case 'afternoon': // 12 PM - 6 PM
        return hour >= 12 && hour < 18
      case 'evening': // 6 PM - 12 AM
        return hour >= 18 || hour < 6
      case 'all':
      default:
        return true
    }
  }

  // Filter glucose and meal data by selected time range
  const filteredGlucoseData = glucoseData.filter(r => filterByTimeRange(r.timestamp))
  const filteredMeals = todayMeals.filter(m => filterByTimeRange(m.timestamp))

  // Merge glucose data and meal data into a single timeline
  const allTimestamps = [
    ...filteredGlucoseData.map(r => ({ timestamp: r.timestamp, type: 'glucose' as const, data: r })),
    ...filteredMeals.map(m => ({ timestamp: m.timestamp, type: 'meal' as const, data: m }))
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Create unified chart data
  const chartData = allTimestamps.map(item => {
    const time = new Date(item.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

    if (item.type === 'glucose') {
      return {
        time,
        glucose: item.data.value,
      }
    } else {
      // For meals, we'll add them as scatter points
      // Place them at a visible height on the chart (e.g., 200 mg/dL)
      return {
        time,
        meal: 200, // Fixed height for visibility
        mealType: item.data.type,
        mealName: item.data.name,
        calories: item.data.calories,
        carbs: item.data.carbs,
      }
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📊</div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GlucoLens</h1>
              <p className="text-sm text-gray-600">Track, learn, optimize</p>
            </div>
            <a
              href="/settings/health-connections"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-6 h-6 text-gray-600" />
            </a>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            <p className="font-semibold">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Current Glucose Display */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-md p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Glucose</h2>
          {currentGlucose ? (
            <GlucoseRing
              value={currentGlucose}
              trend={glucoseTrend}
              timestamp={glucoseTimestamp || undefined}
              size="lg"
            />
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-3">📈</div>
              <p className="text-gray-600 mb-4">No glucose data yet</p>
              <a
                href="/auth/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-colors shadow-md text-sm"
              >
                Connect CGM or Import Health Data
              </a>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <a
            href="/camera"
            className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg hover:border-blue-300 border border-gray-200 transition-all min-h-[120px]"
          >
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Camera className="w-7 h-7" />
            </div>
            <span className="font-semibold text-gray-900 text-center">Log Meal</span>
          </a>

          <a
            href="/glucose/entry"
            className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg hover:border-green-300 border border-gray-200 transition-all min-h-[120px]"
          >
            <div className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center shadow-md">
              <Plus className="w-7 h-7" />
            </div>
            <span className="font-semibold text-gray-900 text-center">Add Glucose</span>
          </a>
        </div>

        {/* Today's Timeline */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Today's Timeline</h2>

            {/* Time Range Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  timeRange === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Day
              </button>
              <button
                onClick={() => setTimeRange('morning')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  timeRange === 'morning'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🌅 Morning
              </button>
              <button
                onClick={() => setTimeRange('afternoon')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  timeRange === 'afternoon'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ☀️ Afternoon
              </button>
              <button
                onClick={() => setTimeRange('evening')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  timeRange === 'evening'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🌙 Evening
              </button>
            </div>
          </div>

          {filteredGlucoseData.length === 0 && filteredMeals.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-gray-600 text-sm">
                {glucoseData.length === 0 && todayMeals.length === 0
                  ? 'No data for today yet'
                  : `No data for ${timeRange === 'all' ? 'today' : timeRange}`}
              </p>
            </div>
          ) : (
            <div className="w-full">
              <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="time"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    domain={[0, 250]}
                    label={{
                      value: 'mg/dL',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: '12px', fill: '#6b7280' },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null

                      const data = payload[0].payload

                      if (data.glucose !== undefined) {
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
                            <p className="text-xs font-semibold text-gray-700">Glucose</p>
                            <p className="text-sm font-bold text-blue-600">{data.glucose} mg/dL</p>
                            <p className="text-xs text-gray-500">{data.time}</p>
                          </div>
                        )
                      }

                      if (data.meal !== undefined) {
                        const mealEmojis = {
                          breakfast: '🌅',
                          lunch: '☀️',
                          dinner: '🌙',
                          snack: '🍎',
                        }
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
                            <p className="text-xs font-semibold text-gray-700">
                              {mealEmojis[data.mealType as keyof typeof mealEmojis]} {data.mealType}
                            </p>
                            <p className="text-sm font-bold">{data.mealName}</p>
                            <p className="text-xs text-gray-600">{data.calories} cal · {data.carbs}g carbs</p>
                            <p className="text-xs text-gray-500">{data.time}</p>
                          </div>
                        )
                      }

                      return null
                    }}
                  />
                  <ReferenceArea
                    y1={70}
                    y2={180}
                    fill="#dcfce7"
                    fillOpacity={0.3}
                  />
                  <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" />

                  {/* Glucose line */}
                  <Line
                    type="monotone"
                    dataKey="glucose"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />

                  {/* Meal scatter points */}
                  <Scatter
                    dataKey="meal"
                    fill="#8884d8"
                    shape={(props: any) => {
                      const { cx, cy, payload } = props
                      if (!payload.mealType) return null

                      const mealColors = {
                        breakfast: '#f97316',
                        lunch: '#10b981',
                        dinner: '#8b5cf6',
                        snack: '#f59e0b',
                      }
                      const mealEmojis = {
                        breakfast: '🌅',
                        lunch: '☀️',
                        dinner: '🌙',
                        snack: '🍎',
                      }

                      return (
                        <g>
                          {/* Vertical line from meal to bottom */}
                          <line
                            x1={cx}
                            y1={cy}
                            x2={cx}
                            y2="100%"
                            stroke={mealColors[payload.mealType as keyof typeof mealColors]}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            opacity={0.5}
                          />
                          {/* Meal marker circle */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={12}
                            fill={mealColors[payload.mealType as keyof typeof mealColors]}
                            opacity={0.9}
                          />
                          {/* Emoji icon */}
                          <text
                            x={cx}
                            y={cy + 5}
                            textAnchor="middle"
                            fontSize="14"
                          >
                            {mealEmojis[payload.mealType as keyof typeof mealEmojis]}
                          </text>
                        </g>
                      )
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Today's Meals */}
        {todayMeals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Today's Meals</h2>
              <a
                href="/history"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View All →
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayMeals.slice(0, 3).map((meal) => (
                <MealCard
                  key={meal.id}
                  id={meal.id}
                  name={meal.name}
                  photoUrl={meal.photoUrl}
                  photoUrls={meal.photoUrls}
                  mealType={meal.type}
                  timestamp={meal.timestamp}
                  calories={meal.calories}
                  carbs={meal.carbs}
                  protein={meal.protein}
                  fat={meal.fat}
                  analysisStatus={meal.analysisStatus}
                />
              ))}
            </div>
          </div>
        )}

        {/* Daily Insights */}
        {dailyInsights.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Today's Insights</h2>
              <a
                href="/insights"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View All →
              </a>
            </div>
            <div className="space-y-3">
              {dailyInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  type={insight.type}
                  title={insight.title}
                  description={insight.description}
                />
              ))}
            </div>
          </div>
        )}

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-900 mb-2 text-sm">Medical Disclaimer</h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            GlucoLens provides educational insights only and is not a substitute for professional
            medical advice, diagnosis, or treatment. Predictions are informational and should not
            be used for dosing, diagnosis, or triage decisions. Always consult your healthcare
            provider.
          </p>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div
          className="fixed top-4 right-4 z-50 bg-green-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-3 animate-slide-in-right max-w-md"
          role="alert"
        >
          <Check className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Analysis complete!</p>
            <p className="text-sm text-green-100">{completedMealName}</p>
          </div>
          <button
            onClick={() => setShowSuccessToast(false)}
            className="ml-2 text-white hover:text-green-100"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
