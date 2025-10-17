'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api-client'
import BottomNav from '@/components/BottomNav'
import InsightCard from '@/components/glucose/InsightCard'
import { TrendingUp, TrendingDown, Activity, Award } from 'lucide-react'

/**
 * Carbly Insights Page - Analytics and patterns
 *
 * Features:
 * - Daily summary stats
 * - Weekly patterns chart
 * - Best/worst food rankings
 * - Achievements and streaks
 */

interface DailySummary {
  avgGlucose: number
  timeInRange: number
  mealsLogged: number
  glucoseSpikes: number
}

interface DailyInsight {
  id: string
  type: 'pattern' | 'warning' | 'tip'
  title: string
  description: string
}

interface MealImpact {
  id: string
  name: string
  timestamp: string
  peakGlucose: number
  avgRise: number
  rating: 'good' | 'moderate' | 'poor'
}

export default function InsightsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [insights, setInsights] = useState<DailyInsight[]>([])
  const [bestMeals, setBestMeals] = useState<MealImpact[]>([])
  const [worstMeals, setWorstMeals] = useState<MealImpact[]>([])

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  async function checkAuthAndLoadData() {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const today = new Date().toISOString().split('T')[0]

      // Fetch timeline for summary stats
      const timelineRes = await apiFetch(`/api/analytics/timeline/daily?date=${today}`)
      if (timelineRes.ok) {
        const timelineData = await timelineRes.json()
        const glucose = timelineData.glucose || []
        const meals = timelineData.meals || []

        if (glucose.length > 0) {
          const values = glucose.map((r: any) => r.value)
          const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
          const inRange = values.filter((v: number) => v >= 70 && v <= 180).length
          const spikes = values.filter((v: number) => v > 180).length

          setSummary({
            avgGlucose: Math.round(avg),
            timeInRange: Math.round((inRange / values.length) * 100),
            mealsLogged: meals.length,
            glucoseSpikes: spikes,
          })
        }
      }

      // Fetch insights
      const insightsRes = await apiFetch(`/api/analytics/insights/daily?date=${today}`)
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json()
        setInsights(insightsData.insights || [])
      }

      // Fetch correlation data (best/worst meals)
      const correlationRes = await apiFetch(
        `/api/analytics/correlation?startDate=${today}&endDate=${today}`
      )
      if (correlationRes.ok) {
        const correlationData = await correlationRes.json()
        setBestMeals(correlationData.bestMeals || [])
        setWorstMeals(correlationData.worstMeals || [])
      }
    } catch (err) {
      console.error('Failed to load insights:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">💡</div>
          <p className="text-gray-600 font-medium">Loading insights...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
          <p className="text-sm text-gray-600">Patterns and progress</p>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Avg Glucose
                </span>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.avgGlucose}</div>
              <div className="text-xs text-gray-600 mt-1">mg/dL</div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Time in Range
                </span>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.timeInRange}%</div>
              <div className="text-xs text-gray-600 mt-1">70-180 mg/dL</div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Meals Logged
                </span>
                <span className="text-xl">🍽️</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.mealsLogged}</div>
              <div className="text-xs text-gray-600 mt-1">today</div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Spikes
                </span>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.glucoseSpikes}</div>
              <div className="text-xs text-gray-600 mt-1">&gt;180 mg/dL</div>
            </div>
          </div>
        )}

        {/* Daily Insights */}
        {insights.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Insights</h2>
            <div className="space-y-3">
              {insights.map((insight) => (
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

        {/* Best/Worst Meals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Meals */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Best Meals</h2>
            </div>
            {bestMeals.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">
                Not enough data yet. Keep logging meals!
              </p>
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
                          {new Date(meal.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        Good
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-600">
                      <span>Peak: {meal.peakGlucose} mg/dL</span>
                      <span>Rise: +{meal.avgRise} mg/dL</span>
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
              <p className="text-sm text-gray-600 text-center py-8">
                Not enough data yet. Keep logging meals!
              </p>
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
                          {new Date(meal.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        High Impact
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-600">
                      <span>Peak: {meal.peakGlucose} mg/dL</span>
                      <span>Rise: +{meal.avgRise} mg/dL</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {!summary && insights.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">💡</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No insights yet</h2>
            <p className="text-gray-600 mb-6">
              Log meals and glucose readings to start seeing personalized insights
            </p>
            <a
              href="/camera"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-colors shadow-md"
            >
              📸 Log First Meal
            </a>
          </div>
        )}

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs text-amber-800 leading-relaxed">
            Insights are educational only and should not be used for medical decisions. Patterns shown
            are correlations, not causations. Always consult your healthcare provider.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
