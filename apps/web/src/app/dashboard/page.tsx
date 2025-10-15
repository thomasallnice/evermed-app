'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api-client'
import GlucoseRing from '@/components/glucose/GlucoseRing'
import InsightCard from '@/components/glucose/InsightCard'
import MealCard from '@/components/glucose/MealCard'
import BottomNav from '@/components/BottomNav'
import { Camera, Plus, Check, X } from 'lucide-react'
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

  // Insights
  const [latestInsight, setLatestInsight] = useState<DailyInsight | null>(null)

  // Toast for meal completion
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [completedMealName, setCompletedMealName] = useState<string>('')

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  async function checkAuthAndLoadData() {
    setLoading(true)
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

      // Fetch latest insight
      const insightsRes = await apiFetch(`/api/analytics/insights/daily?date=${today}`)
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json()
        if (insightsData.insights && insightsData.insights.length > 0) {
          setLatestInsight(insightsData.insights[0])
        }
      }
    } catch (err: any) {
      console.error('Dashboard load error:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Transform glucose data for chart
  const chartData = glucoseData.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    glucose: reading.value,
  }))

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
          <h1 className="text-2xl font-bold text-gray-900">GlucoLens</h1>
          <p className="text-sm text-gray-600">Track, learn, optimize</p>
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

          <button
            onClick={() => alert('Manual glucose entry coming soon! For now, connect your CGM via Settings.')}
            className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg hover:border-green-300 border border-gray-200 transition-all min-h-[120px]"
          >
            <div className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center shadow-md">
              <Plus className="w-7 h-7" />
            </div>
            <span className="font-semibold text-gray-900 text-center">Add Glucose</span>
          </button>
        </div>

        {/* Today's Timeline */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Timeline</h2>
          {glucoseData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-gray-600 text-sm">No glucose readings today</p>
            </div>
          ) : (
            <div className="w-full h-64">
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
                      value: 'mg/dL',
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
                  <ReferenceArea
                    y1={70}
                    y2={180}
                    fill="#dcfce7"
                    fillOpacity={0.3}
                  />
                  <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" />

                  {/* Meal markers */}
                  {todayMeals.map((meal) => {
                    const mealTime = new Date(meal.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                    const mealColors = {
                      breakfast: '#f97316',
                      lunch: '#10b981',
                      dinner: '#8b5cf6',
                      snack: '#f59e0b',
                    }
                    return (
                      <ReferenceLine
                        key={meal.id}
                        x={mealTime}
                        stroke={mealColors[meal.type]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    )
                  })}

                  <Line
                    type="monotone"
                    dataKey="glucose"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
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

        {/* Latest Insight */}
        {latestInsight && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Insight</h2>
            <InsightCard
              type={latestInsight.type}
              title={latestInsight.title}
              description={latestInsight.description}
            />
            <a
              href="/insights"
              className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All Insights →
            </a>
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
