'use client'
import { useState, useEffect, useRef } from 'react'

// Types
export interface FoodIngredient {
  id: string
  name: string
  quantity: number
  unit: string
  calories: number
  carbs: number
  protein?: number
  fat?: number
  aiConfidence?: 'high' | 'medium' | 'low'
}

interface NutritionixSearchResult {
  food_name: string
  serving_qty: number
  serving_unit: string
  nf_calories: number
  nf_total_carbohydrate: number
  nf_protein: number
  nf_total_fat: number
}

interface IngredientEditorProps {
  foodEntryId: string
  initialIngredients: FoodIngredient[]
  onSave: (ingredients: FoodIngredient[]) => Promise<void>
}

export default function IngredientEditor({
  foodEntryId,
  initialIngredients,
  onSave,
}: IngredientEditorProps) {
  const [ingredients, setIngredients] = useState<FoodIngredient[]>(initialIngredients)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NutritionixSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [swipingId, setSwipingId] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounced Nutritionix search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      await searchNutritionix(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function searchNutritionix(query: string) {
    setSearchLoading(true)
    setError(null)

    try {
      // TODO: Replace with actual Nutritionix API call
      // For now, return mock data
      await new Promise((resolve) => setTimeout(resolve, 300))

      const mockResults: NutritionixSearchResult[] = [
        {
          food_name: query,
          serving_qty: 100,
          serving_unit: 'g',
          nf_calories: 150,
          nf_total_carbohydrate: 20,
          nf_protein: 5,
          nf_total_fat: 3,
        },
        {
          food_name: `${query} (organic)`,
          serving_qty: 100,
          serving_unit: 'g',
          nf_calories: 140,
          nf_total_carbohydrate: 18,
          nf_protein: 6,
          nf_total_fat: 2.5,
        },
      ]

      setSearchResults(mockResults)
    } catch (err: any) {
      console.error('Nutritionix search error:', err)
      setError('Failed to search foods. Please try again.')
    } finally {
      setSearchLoading(false)
    }
  }

  function addIngredientFromSearch(result: NutritionixSearchResult) {
    const newIngredient: FoodIngredient = {
      id: `new-${Date.now()}`,
      name: result.food_name,
      quantity: result.serving_qty,
      unit: result.serving_unit,
      calories: result.nf_calories,
      carbs: result.nf_total_carbohydrate,
      protein: result.nf_protein,
      fat: result.nf_total_fat,
      aiConfidence: undefined,
    }

    setIngredients([...ingredients, newIngredient])
    setSearchQuery('')
    setShowSearch(false)
  }

  function deleteIngredient(id: string) {
    setIngredients(ingredients.filter((ing) => ing.id !== id))
  }

  function updateIngredient(id: string, updates: Partial<FoodIngredient>) {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, ...updates } : ing))
    )
  }

  // Calculate nutrition totals
  const totals = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      carbs: acc.carbs + ing.carbs,
      protein: acc.protein + (ing.protein || 0),
      fat: acc.fat + (ing.fat || 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  )

  // Handle touch events for swipe-to-delete on mobile
  function handleTouchStart(e: React.TouchEvent, id: string) {
    setTouchStartX(e.touches[0].clientX)
    setSwipingId(id)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX === null) return

    const touchEndX = e.touches[0].clientX
    const diff = touchStartX - touchEndX

    // If swiped left more than 50px, show delete button
    if (diff > 50 && swipingId) {
      // Visual feedback could be added here
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null || !swipingId) return

    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX - touchEndX

    // If swiped left more than 100px, delete
    if (diff > 100) {
      deleteIngredient(swipingId)
    }

    setTouchStartX(null)
    setSwipingId(null)
  }

  async function handleSave() {
    // Validate
    const hasErrors = ingredients.some(
      (ing) => !ing.name || ing.quantity <= 0
    )

    if (hasErrors) {
      setError('All ingredients must have a name and quantity greater than 0')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(ingredients)
    } catch (err: any) {
      setError(err.message || 'Failed to save ingredients')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Ingredient List */}
      <div className="space-y-2">
        {ingredients.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-600">
            No ingredients yet. Add one below!
          </div>
        ) : (
          ingredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className={`bg-white border rounded-lg p-4 transition-all ${
                editingId === ingredient.id
                  ? 'border-blue-600 ring-2 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onTouchStart={(e) => handleTouchStart(e, ingredient.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {editingId === ingredient.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={ingredient.name}
                        onChange={(e) =>
                          updateIngredient(ingredient.id, { name: e.target.value })
                        }
                        className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={ingredient.quantity}
                          onChange={(e) =>
                            updateIngredient(ingredient.id, {
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0"
                          step="0.1"
                          className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={ingredient.unit}
                          onChange={(e) =>
                            updateIngredient(ingredient.id, { unit: e.target.value })
                          }
                          className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        value={ingredient.calories}
                        onChange={(e) =>
                          updateIngredient(ingredient.id, {
                            calories: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        value={ingredient.carbs}
                        onChange={(e) =>
                          updateIngredient(ingredient.id, {
                            carbs: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        step="0.1"
                        className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        value={ingredient.protein || 0}
                        onChange={(e) =>
                          updateIngredient(ingredient.id, {
                            protein: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        step="0.1"
                        className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        value={ingredient.fat || 0}
                        onChange={(e) =>
                          updateIngredient(ingredient.id, {
                            fat: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        step="0.1"
                        className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-lg bg-blue-600 text-white font-semibold px-4 py-2 hover:bg-blue-700 transition-colors text-sm"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => deleteIngredient(ingredient.id)}
                      className="rounded-lg bg-white text-red-600 font-semibold px-4 py-2 hover:bg-red-50 transition-colors border border-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div
                  onClick={() => setEditingId(ingredient.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{ingredient.name}</div>
                      <div className="text-xs text-gray-600">
                        {ingredient.quantity} {ingredient.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ingredient.aiConfidence && (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            ingredient.aiConfidence === 'high'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : ingredient.aiConfidence === 'medium'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {ingredient.aiConfidence === 'high' && '✓ '}
                          {ingredient.aiConfidence === 'medium' && '~ '}
                          {ingredient.aiConfidence === 'low' && '? '}
                          {ingredient.aiConfidence}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteIngredient(ingredient.id)
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        aria-label="Delete ingredient"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>{ingredient.calories} cal</span>
                    <span>{ingredient.carbs}g carbs</span>
                    {ingredient.protein !== undefined && <span>{ingredient.protein}g protein</span>}
                    {ingredient.fat !== undefined && <span>{ingredient.fat}g fat</span>}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Ingredient Section */}
      {!showSearch ? (
        <button
          onClick={() => {
            setShowSearch(true)
            setTimeout(() => searchInputRef.current?.focus(), 100)
          }}
          className="w-full rounded-lg bg-gray-100 text-gray-700 font-semibold px-4 py-3 hover:bg-gray-200 transition-colors border border-gray-300 flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span> Add Ingredient
        </button>
      ) : (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              onClick={() => {
                setShowSearch(false)
                setSearchQuery('')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Cancel search"
            >
              ✕
            </button>
          </div>

          {/* Search Results */}
          {searchLoading && (
            <div className="mt-2 text-sm text-gray-600 text-center py-4">Searching...</div>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => addIngredientFromSearch(result)}
                  className="w-full text-left bg-white hover:bg-blue-50 border border-gray-200 rounded-lg p-3 transition-colors"
                >
                  <div className="font-medium text-gray-900 text-sm">{result.food_name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {result.serving_qty} {result.serving_unit} • {result.nf_calories} cal •{' '}
                    {result.nf_total_carbohydrate}g carbs
                  </div>
                </button>
              ))}
            </div>
          )}
          {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="mt-2 text-sm text-gray-600 text-center py-4">
              No results found. Try a different search term.
            </div>
          )}
        </div>
      )}

      {/* Nutrition Summary */}
      <div className="bg-blue-50 border-t-2 border-blue-600 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Nutrition Totals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-900">{Math.round(totals.calories)}</div>
            <div className="text-xs text-blue-700">Calories</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{Math.round(totals.carbs)}g</div>
            <div className="text-xs text-blue-700">Carbs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{Math.round(totals.protein)}g</div>
            <div className="text-xs text-blue-700">Protein</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{Math.round(totals.fat)}g</div>
            <div className="text-xs text-blue-700">Fat</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || ingredients.length === 0}
        className="w-full rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <span className="animate-spin">⏳</span>
            Saving...
          </>
        ) : (
          'Update Meal'
        )}
      </button>
    </div>
  )
}
