'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import IngredientEditor, { FoodIngredient } from '@/components/metabolic/IngredientEditor'

interface FoodEntryPageProps {
  params: {
    id: string
  }
}

export default function FoodEntryPage({ params }: FoodEntryPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [foodEntry, setFoodEntry] = useState<any>(null)
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([])

  useEffect(() => {
    loadFoodEntry()
  }, [params.id])

  async function loadFoodEntry() {
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

      // TODO: Replace with actual API call to GET /api/metabolic/food/:id
      // For now, use mock data
      await new Promise((resolve) => setTimeout(resolve, 500))

      const mockFoodEntry = {
        id: params.id,
        photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
        mealType: 'lunch',
        timestamp: new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
      }

      const mockIngredients: FoodIngredient[] = [
        {
          id: '1',
          name: 'Grilled Chicken Breast',
          quantity: 200,
          unit: 'g',
          calories: 330,
          carbs: 0,
          protein: 62,
          fat: 7,
          aiConfidence: 'high',
        },
        {
          id: '2',
          name: 'Mixed Salad Greens',
          quantity: 100,
          unit: 'g',
          calories: 20,
          carbs: 4,
          protein: 2,
          fat: 0.3,
          aiConfidence: 'high',
        },
        {
          id: '3',
          name: 'Olive Oil Dressing',
          quantity: 15,
          unit: 'ml',
          calories: 120,
          carbs: 0.5,
          protein: 0,
          fat: 14,
          aiConfidence: 'medium',
        },
      ]

      setFoodEntry(mockFoodEntry)
      setIngredients(mockIngredients)
    } catch (err: any) {
      console.error('Error loading food entry:', err)
      setError(err.message || 'Failed to load food entry')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveIngredients(updatedIngredients: FoodIngredient[]) {
    // TODO: Replace with actual API call to PUT /api/metabolic/food/:id
    console.log('Saving ingredients:', updatedIngredients)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIngredients(updatedIngredients)
    alert('Ingredients updated successfully!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="bg-white rounded-2xl shadow-md p-6 h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <a
              href="/metabolic/dashboard"
              className="mt-4 inline-block text-red-600 hover:text-red-800 underline"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Food Entry</h1>
          <a
            href="/metabolic/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Photo Preview */}
        {foodEntry?.photoUrl && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <img
              src={foodEntry.photoUrl}
              alt="Meal photo"
              className="w-full h-64 object-cover"
            />
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {foodEntry.mealType.charAt(0).toUpperCase() + foodEntry.mealType.slice(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(foodEntry.timestamp).toLocaleString()}
                  </div>
                </div>
                {foodEntry.analyzedAt && (
                  <div className="text-xs text-green-600">
                    ✓ Analyzed by AI
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ingredient Editor */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingredients</h2>
          <IngredientEditor
            foodEntryId={params.id}
            initialIngredients={ingredients}
            onSave={handleSaveIngredients}
          />
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Medical Disclaimer</h3>
          <p className="text-sm text-amber-800">
            The nutritional information and analysis provided are for educational purposes only and
            are not a substitute for professional medical or dietary advice. Always consult with a
            qualified healthcare provider or registered dietitian before making significant changes
            to your diet.
          </p>
        </div>
      </div>
    </div>
  )
}
