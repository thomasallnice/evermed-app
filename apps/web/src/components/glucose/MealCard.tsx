'use client'
import Link from 'next/link'

/**
 * MealCard - Meal entry card with photo, nutrition, and meal type
 *
 * Design:
 * - Square photo (1:1 aspect ratio)
 * - Meal type badge (breakfast, lunch, dinner, snack)
 * - Nutrition stats grid
 * - Clickable to detail view
 * - Delete button overlay
 */

interface MealCardProps {
  id: string
  name: string
  photoUrl?: string | null
  photoUrls?: string[]
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  timestamp: string
  calories: number
  carbs: number
  protein: number
  fat: number
  analysisStatus?: 'pending' | 'completed' | 'failed'
  onDelete?: () => void
}

export default function MealCard({
  id,
  name,
  photoUrl,
  photoUrls,
  mealType,
  timestamp,
  calories,
  carbs,
  protein,
  fat,
  analysisStatus = 'completed',
  onDelete,
}: MealCardProps) {
  const mealTypeConfig = {
    breakfast: { emoji: '🌅', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    lunch: { emoji: '☀️', color: 'bg-green-100 text-green-700 border-green-200' },
    dinner: { emoji: '🌙', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    snack: { emoji: '🍎', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  }

  const config = mealTypeConfig[mealType]

  // Normalize photo URLs - use photoUrls if provided, otherwise fall back to single photoUrl
  const allPhotos = photoUrls && photoUrls.length > 0
    ? photoUrls
    : (photoUrl ? [photoUrl] : [])

  return (
    <div className="group border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all relative bg-white">
      <Link href={`/entry/${id}`} className="block">
        {/* Square Image(s) */}
        <div className="relative aspect-square w-full bg-gray-100">
          {allPhotos.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {config.emoji}
            </div>
          ) : allPhotos.length === 1 ? (
            <img
              src={allPhotos[0]}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : allPhotos.length === 2 ? (
            // 2 photos: side by side
            <div className="flex h-full">
              <div className="w-1/2 h-full relative overflow-hidden">
                <img
                  src={allPhotos[0]}
                  alt={`${name} - Dish 1`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-1/2 h-full relative overflow-hidden border-l border-white">
                <img
                  src={allPhotos[1]}
                  alt={`${name} - Dish 2`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : allPhotos.length === 3 ? (
            // 3 photos: one big on left, two stacked on right
            <div className="flex h-full">
              <div className="w-1/2 h-full relative overflow-hidden">
                <img
                  src={allPhotos[0]}
                  alt={`${name} - Dish 1`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-1/2 h-full flex flex-col">
                <div className="h-1/2 relative overflow-hidden border-l border-b border-white">
                  <img
                    src={allPhotos[1]}
                    alt={`${name} - Dish 2`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="h-1/2 relative overflow-hidden border-l border-white">
                  <img
                    src={allPhotos[2]}
                    alt={`${name} - Dish 3`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          ) : (
            // 4+ photos: 2x2 grid (show first 4)
            <div className="grid grid-cols-2 grid-rows-2 h-full">
              {allPhotos.slice(0, 4).map((photo, index) => (
                <div
                  key={index}
                  className={`relative overflow-hidden ${
                    index === 1 ? 'border-l border-white' : ''
                  } ${index >= 2 ? 'border-t border-white' : ''} ${
                    index === 3 ? 'border-l border-white' : ''
                  }`}
                >
                  <img
                    src={photo}
                    alt={`${name} - Dish ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Show "+N" overlay on the 4th image if there are more */}
                  {index === 3 && allPhotos.length > 4 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        +{allPhotos.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Analyzing Overlay */}
          {analysisStatus === 'pending' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center text-white">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                <p className="text-sm font-medium">Analyzing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Meal Type Badge */}
          <div className="mb-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide border ${config.color}`}
            >
              {mealType}
            </span>
          </div>

          {/* Food Name */}
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-base">
            {name || 'Meal'}
          </h3>

          {/* Time */}
          <p className="text-xs text-gray-500 mb-3">
            {new Date(timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>

          {/* Nutrition Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <div className="text-gray-600 uppercase tracking-wide font-medium">Calories</div>
              <div className="font-semibold text-gray-900">{calories}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <div className="text-gray-600 uppercase tracking-wide font-medium">Carbs</div>
              <div className="font-semibold text-gray-900">{carbs}g</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <div className="text-gray-600 uppercase tracking-wide font-medium">Protein</div>
              <div className="font-semibold text-gray-900">{protein}g</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <div className="text-gray-600 uppercase tracking-wide font-medium">Fat</div>
              <div className="font-semibold text-gray-900">{fat}g</div>
            </div>
          </div>
        </div>
      </Link>

      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onDelete()
          }}
          className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full p-2 shadow-lg transition-colors z-10"
          aria-label="Delete meal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
