'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { METABOLIC_INSIGHTS_DISCLAIMER } from '@/lib/copy'

// Types
interface FoodIngredient {
  name: string
  quantity: number | null
  unit: string | null
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  fiberG: number
}

interface FoodEntry {
  id: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  timestamp: string
  photoUrl: string | null
  analysisStatus: 'pending' | 'completed' | 'failed'
  ingredients: FoodIngredient[]
  totalCalories: number
  totalCarbsG: number
  totalProteinG: number
  totalFatG: number
  totalFiberG: number
}

interface DailyTotals {
  calories: number
  carbs: number
  protein: number
  fat: number
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export default function FoodTrackerPage() {
  // State
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load meal history on mount
  useEffect(() => {
    loadMealHistory()
  }, [])

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function loadMealHistory() {
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

      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

      const response = await fetch(
        `/api/metabolic/food?startDate=${startOfDay}&endDate=${endOfDay}&limit=20`
      )

      if (!response.ok) {
        throw new Error('Failed to load meal history')
      }

      const data = await response.json()
      setEntries(data.entries || [])
    } catch (err: any) {
      console.error('Load error:', err)
      setError(err.message || 'Failed to load meal history')
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(file: File) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError('Please select a photo first')
      return
    }

    setUploading(true)
    setAnalyzing(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      const formData = new FormData()
      formData.append('photo', selectedFile)
      formData.append('mealType', mealType)
      formData.append('eatenAt', new Date().toISOString())

      console.log('Uploading food photo for analysis...')
      const response = await fetch('/api/metabolic/food', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      console.log('Analysis complete:', result)

      // Add new entry to the list (optimistic update)
      const newEntry: FoodEntry = {
        id: result.foodEntryId,
        mealType: result.mealType,
        timestamp: result.timestamp,
        photoUrl: result.photoUrl,
        analysisStatus: result.analysisStatus,
        ingredients: result.ingredients,
        totalCalories: result.totalCalories,
        totalCarbsG: result.totalCarbsG,
        totalProteinG: result.totalProteinG,
        totalFatG: result.totalFatG,
        totalFiberG: result.totalFiberG,
      }

      setEntries([newEntry, ...entries])
      setSuccess('Food logged successfully! 🎉')

      // Reset form
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Auto-expand the new entry
      setExpandedEntry(result.foodEntryId)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  function clearSelection() {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null)
  }

  // Calculate daily totals
  const dailyTotals: DailyTotals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.totalCalories,
      carbs: acc.carbs + entry.totalCarbsG,
      protein: acc.protein + entry.totalProteinG,
      fat: acc.fat + entry.totalFatG,
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Food Tracker</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              <span>✨</span>
              <span>Powered by Gemini 2.5 Flash</span>
            </span>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700">
            <p className="font-semibold">{success}</p>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Log a Meal</h2>

          {/* Drag-and-drop upload area */}
          <div
            className={`border-2 border-dashed rounded-2xl p-8 transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!previewUrl ? (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <span className="text-3xl">📷</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Upload Food Photo
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop an image here, or click to browse
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-block rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Choose photo to upload"
                >
                  Choose Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="File input for food photo"
                />
                <p className="text-xs text-gray-500 mt-4">
                  JPEG, PNG, or WebP · Max 5MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Food preview"
                    className="w-full max-h-80 object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-md focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Remove selected photo"
                  >
                    ✕
                  </button>
                </div>

                {/* Meal Type Selector */}
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="meal-type"
                    className="text-sm font-medium text-gray-700"
                  >
                    Meal Type:
                  </label>
                  <select
                    id="meal-type"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    disabled={uploading}
                    aria-label="Select meal type"
                  >
                    {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {MEAL_TYPE_ICONS[value as MealType]} {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Analyze Button */}
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Analyze food photo"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {analyzing ? 'Analyzing with AI (10-15s)...' : 'Uploading...'}
                    </span>
                  ) : (
                    'Analyze Food'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Daily Nutrition Summary */}
        {entries.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Nutrition</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Calories */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Calories
                  </span>
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 text-xl">🔥</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {Math.round(dailyTotals.calories)}
                  </span>
                  <span className="text-sm text-gray-600">kcal</span>
                </div>
              </div>

              {/* Carbs */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Carbs
                  </span>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xl">🌾</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {Math.round(dailyTotals.carbs)}
                  </span>
                  <span className="text-sm text-gray-600">g</span>
                </div>
              </div>

              {/* Protein */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Protein
                  </span>
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                    <span className="text-pink-600 text-xl">💪</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {Math.round(dailyTotals.protein)}
                  </span>
                  <span className="text-sm text-gray-600">g</span>
                </div>
              </div>

              {/* Fat */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Fat
                  </span>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xl">🥑</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {Math.round(dailyTotals.fat)}
                  </span>
                  <span className="text-sm text-gray-600">g</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Meals */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Meals</h2>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md p-6 animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && entries.length === 0 && (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                No meals logged yet
              </h3>
              <p className="text-gray-600">
                Upload your first food photo to track your nutrition
              </p>
            </div>
          )}

          {/* Meal Grid */}
          {!loading && entries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Photo */}
                  {entry.photoUrl && (
                    <div className="w-full h-48 bg-gray-100">
                      <img
                        src={entry.photoUrl}
                        alt={`${MEAL_TYPE_LABELS[entry.mealType]} meal`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    {/* Meal Type & Time */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200">
                        {MEAL_TYPE_ICONS[entry.mealType]} {MEAL_TYPE_LABELS[entry.mealType]}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Nutrition Totals */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-gray-600">Calories</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {Math.round(entry.totalCalories)} kcal
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Carbs</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {Math.round(entry.totalCarbsG)} g
                        </div>
                      </div>
                    </div>

                    {/* Analysis Status */}
                    {entry.analysisStatus === 'failed' && (
                      <div className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                        Analysis failed. Try uploading another photo.
                      </div>
                    )}

                    {/* Expand/Collapse Ingredients */}
                    {entry.ingredients.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                        }
                        className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2"
                        aria-expanded={expandedEntry === entry.id}
                        aria-controls={`ingredients-${entry.id}`}
                      >
                        <span>
                          {expandedEntry === entry.id ? 'Hide' : 'Show'} Ingredients (
                          {entry.ingredients.length})
                        </span>
                        <span>{expandedEntry === entry.id ? '▲' : '▼'}</span>
                      </button>
                    )}

                    {/* Ingredients List */}
                    {expandedEntry === entry.id && (
                      <div
                        id={`ingredients-${entry.id}`}
                        className="mt-3 space-y-2 border-t border-gray-200 pt-3"
                      >
                        {entry.ingredients.map((ingredient, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-gray-50 rounded-lg p-2 border border-gray-200"
                          >
                            <div className="font-semibold text-gray-900 mb-1">
                              {ingredient.name}
                              {ingredient.quantity && ingredient.unit && (
                                <span className="font-normal text-gray-600 ml-1">
                                  ({ingredient.quantity} {ingredient.unit})
                                </span>
                              )}
                            </div>
                            <div className="flex gap-3 text-gray-600">
                              <span>{Math.round(ingredient.calories)} cal</span>
                              <span>{Math.round(ingredient.carbsG)}g carbs</span>
                              <span>{Math.round(ingredient.proteinG)}g protein</span>
                              <span>{Math.round(ingredient.fatG)}g fat</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Medical Disclaimer</h3>
          <p className="text-sm text-amber-800">
            {METABOLIC_INSIGHTS_DISCLAIMER} This information is for educational purposes
            only and is not a substitute for professional medical advice, diagnosis, or
            treatment. Nutrition estimates are AI-generated and may not be 100% accurate.
            Always seek the advice of your physician or other qualified health provider
            with any questions you may have regarding a medical condition.
          </p>
        </div>
      </div>
    </div>
  )
}
