'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api-client'
import BottomNav from '@/components/BottomNav'
import MealCard from '@/components/glucose/MealCard'
import { Calendar as CalendarIcon, List, Search } from 'lucide-react'

/**
 * GlucoLens History Page - Calendar and list view of meals
 *
 * Features:
 * - Calendar view with color-coded days (green/amber/red)
 * - List view with meal photos
 * - Search/filter by meal type, date range
 * - Mobile-first design
 */

interface MealEntry {
  id: string
  name: string
  photoUrl: string | null
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  timestamp: string
  calories: number
  carbs: number
  protein: number
  fat: number
  analysisStatus: 'pending' | 'completed' | 'failed'
}

export default function HistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all')

  useEffect(() => {
    checkAuthAndLoadData()
  }, [selectedDate])

  async function checkAuthAndLoadData() {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch meals for selected date
      const timelineRes = await apiFetch(`/api/analytics/timeline/daily?date=${selectedDate}`)
      if (timelineRes.ok) {
        const timelineData = await timelineRes.json()
        setMeals(timelineData.meals || [])
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter meals
  const filteredMeals = meals.filter((meal) => {
    const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || meal.type === filterType
    return matchesSearch && matchesType
  })

  // Sort by timestamp (most recent first)
  const sortedMeals = [...filteredMeals].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="container py-4">
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
          <p className="text-sm text-gray-600">Your meal journey</p>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <List className="w-5 h-5" />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            Calendar
          </button>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-md p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search meals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                  filterType === type
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-pulse">⏳</div>
            <p className="text-gray-600">Loading meals...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedMeals.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No meals found</h2>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Log your first meal to see it here'}
            </p>
            <a
              href="/camera"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-colors shadow-md"
            >
              📸 Log First Meal
            </a>
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && sortedMeals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedMeals.map((meal) => (
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
        )}

        {/* Calendar View (Simplified for now) */}
        {!loading && viewMode === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Calendar View</h2>
            <p className="text-gray-600 text-center py-12">
              Calendar view coming soon! For now, use the date picker above to navigate.
            </p>
          </div>
        )}

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs text-amber-800 leading-relaxed">
            Historical data is for tracking purposes only and should not be used for medical decisions.
            Always consult your healthcare provider.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
