'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Pencil, Trash2, Plus, X, Share2, Clipboard, Download, Mail, Image as ImageIcon, Check, RefreshCw } from 'lucide-react'
import { getSupabase } from '@/lib/supabase/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// Types matching API response
interface Ingredient {
  id?: string
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
  ingredients: Ingredient[]
  totalCalories: number
  totalCarbsG: number
  totalProteinG: number
  totalFatG: number
  totalFiberG: number
}

interface FoodEntryPageProps {
  params: {
    id: string
  }
}

// Meal type badge colors (CLAUDE.md color system)
const mealTypeBadgeColors = {
  breakfast: 'bg-orange-100 text-orange-700 border-orange-200',
  lunch: 'bg-green-100 text-green-700 border-green-200',
  dinner: 'bg-purple-100 text-purple-700 border-purple-200',
  snack: 'bg-blue-100 text-blue-700 border-blue-200',
}

// Analysis status badge colors
const analysisStatusColors = {
  pending: {
    bg: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: '⏱️',
    text: 'Analysis Pending',
  },
  completed: {
    bg: 'bg-green-100 text-green-700 border-green-200',
    icon: '✓',
    text: 'Analysis Complete',
  },
  failed: {
    bg: 'bg-red-100 text-red-700 border-red-200',
    icon: '✕',
    text: 'Analysis Failed',
  },
}

export default function FoodEntryPage({ params }: FoodEntryPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [foodEntry, setFoodEntry] = useState<FoodEntry | null>(null)

  // Modal states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  // Share states
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  // Edit form state
  const [editedIngredients, setEditedIngredients] = useState<Ingredient[]>([])

  // Zoom modal state
  const [showZoomModal, setShowZoomModal] = useState(false)
  const [zoomPhotoLoading, setZoomPhotoLoading] = useState(true)

  // Polling state
  const [isPolling, setIsPolling] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [showErrorToast, setShowErrorToast] = useState(false)
  const [showMaxPollWarning, setShowMaxPollWarning] = useState(false)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)

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

      // Fetch from new individual endpoint
      const response = await fetch(`/api/metabolic/food/${params.id}`, {
        method: 'GET',
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Food entry not found')
        }
        throw new Error('Failed to fetch food entry')
      }

      const entry = await response.json()
      setFoodEntry(entry)
    } catch (err: any) {
      console.error('Error loading food entry:', err)
      setError(err.message || 'Failed to load food entry')
    } finally {
      setLoading(false)
    }
  }

  // Polling effect for pending analysis
  useEffect(() => {
    if (!foodEntry || foodEntry.analysisStatus !== 'pending') {
      setIsPolling(false)
      return
    }

    const MAX_POLLS = 60 // 5 minutes at 5-second intervals
    const POLL_INTERVAL = 5000 // 5 seconds
    const MAX_CONSECUTIVE_ERRORS = 3

    let pollInterval: NodeJS.Timeout
    let isActive = true
    let currentPollCount = 0
    let currentConsecutiveErrors = 0

    const pollForUpdates = async () => {
      // Check if page is visible (pause polling when tab is inactive)
      if (document.visibilityState !== 'visible') {
        return
      }

      // Check max polls
      if (currentPollCount >= MAX_POLLS) {
        clearInterval(pollInterval)
        setIsPolling(false)
        setShowMaxPollWarning(true)
        return
      }

      try {
        const response = await fetch(`/api/metabolic/food/${params.id}`, {
          method: 'GET',
        })

        if (!response.ok) {
          throw new Error('Polling request failed')
        }

        const data = await response.json()

        if (!isActive) return // Component unmounted

        // Update entry
        setFoodEntry(data)
        setLastPollTime(new Date())
        currentPollCount++
        setPollCount(currentPollCount)

        // Reset error count on success
        currentConsecutiveErrors = 0
        setConsecutiveErrors(0)

        // Check if analysis completed or failed
        if (data.analysisStatus === 'completed') {
          clearInterval(pollInterval)
          setIsPolling(false)
          setShowSuccessToast(true)
          setTimeout(() => setShowSuccessToast(false), 3000)
        } else if (data.analysisStatus === 'failed') {
          clearInterval(pollInterval)
          setIsPolling(false)
          setShowErrorToast(true)
        }
      } catch (err: any) {
        console.error('Polling error:', err)
        currentConsecutiveErrors++
        setConsecutiveErrors(currentConsecutiveErrors)

        // Stop polling after 3 consecutive errors
        if (currentConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          clearInterval(pollInterval)
          setIsPolling(false)
          setShowErrorToast(true)
        }
      }
    }

    // Start polling
    setIsPolling(true)
    pollInterval = setInterval(pollForUpdates, POLL_INTERVAL)

    // Initial poll immediately
    pollForUpdates()

    // Cleanup
    return () => {
      isActive = false
      clearInterval(pollInterval)
    }
  }, [foodEntry?.analysisStatus, params.id])

  // Manual refresh handler
  async function handleManualRefresh() {
    setIsManualRefreshing(true)

    try {
      const response = await fetch(`/api/metabolic/food/${params.id}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to refresh')
      }

      const data = await response.json()
      setFoodEntry(data)
      setLastPollTime(new Date())

      // Reset states
      setConsecutiveErrors(0)
      setShowMaxPollWarning(false)

      if (data.analysisStatus === 'completed') {
        setShowSuccessToast(true)
        setTimeout(() => setShowSuccessToast(false), 3000)
      }
    } catch (err: any) {
      console.error('Manual refresh error:', err)
      setShowErrorToast(true)
    } finally {
      setIsManualRefreshing(false)
    }
  }

  // Calculate time since last poll (for display)
  const [timeSinceLastPoll, setTimeSinceLastPoll] = useState<number>(0)

  useEffect(() => {
    if (!lastPollTime || !isPolling) return

    const interval = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - lastPollTime.getTime()) / 1000)
      setTimeSinceLastPoll(diff)
    }, 1000)

    return () => clearInterval(interval)
  }, [lastPollTime, isPolling])

  // Delete handlers
  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/metabolic/food/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete food entry')
      }

      // Redirect to camera page on success
      router.push('/metabolic/camera?deleted=true')
    } catch (err: any) {
      console.error('Error deleting food entry:', err)
      setDeleteError(err.message || 'Failed to delete food entry')
      setIsDeleting(false)
    }
  }

  // Edit handlers
  function openEditModal() {
    if (!foodEntry) return
    setEditedIngredients(JSON.parse(JSON.stringify(foodEntry.ingredients)))
    setShowEditModal(true)
    setEditError(null)
  }

  function addIngredient() {
    setEditedIngredients([
      ...editedIngredients,
      {
        name: '',
        quantity: 0,
        unit: 'g',
        calories: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        fiberG: 0,
      },
    ])
  }

  function removeIngredient(index: number) {
    setEditedIngredients(editedIngredients.filter((_, i) => i !== index))
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: any) {
    const updated = [...editedIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setEditedIngredients(updated)
  }

  async function handleSave() {
    // Validation
    if (editedIngredients.length === 0) {
      setEditError('At least one ingredient is required')
      return
    }

    // Validate all ingredients have names
    if (editedIngredients.some((ing) => !ing.name.trim())) {
      setEditError('All ingredients must have a name')
      return
    }

    // Validate no negative values
    const hasNegative = editedIngredients.some(
      (ing) =>
        (ing.quantity !== null && ing.quantity < 0) ||
        ing.calories < 0 ||
        ing.carbsG < 0 ||
        ing.proteinG < 0 ||
        ing.fatG < 0 ||
        ing.fiberG < 0
    )
    if (hasNegative) {
      setEditError('Nutritional values cannot be negative')
      return
    }

    setIsSaving(true)
    setEditError(null)

    try {
      const response = await fetch(`/api/metabolic/food/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: editedIngredients,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update food entry')
      }

      const data = await response.json()
      setFoodEntry(data.entry)
      setShowEditModal(false)
    } catch (err: any) {
      console.error('Error updating food entry:', err)
      setEditError(err.message || 'Failed to update food entry')
    } finally {
      setIsSaving(false)
    }
  }

  // Share handlers
  function formatMealSummary(): string {
    if (!foodEntry) return ''

    const date = new Date(foodEntry.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const photoStatus = foodEntry.photoUrl ? 'included' : 'not available'
    const analysisStatus = foodEntry.analysisStatus

    let summary = `Meal Summary - ${foodEntry.mealType.charAt(0).toUpperCase() + foodEntry.mealType.slice(1)} (${date})\n\n`
    summary += `Photo: ${photoStatus}\n`
    summary += `Analysis: ${analysisStatus}\n\n`

    if (foodEntry.analysisStatus === 'completed') {
      summary += `Nutritional Information:\n`
      summary += `- Total Calories: ${Math.round(foodEntry.totalCalories)} kcal\n`
      summary += `- Carbohydrates: ${Math.round(foodEntry.totalCarbsG)}g\n`
      summary += `- Protein: ${Math.round(foodEntry.totalProteinG)}g\n`
      summary += `- Fat: ${Math.round(foodEntry.totalFatG)}g\n`
      summary += `- Fiber: ${Math.round(foodEntry.totalFiberG)}g\n\n`

      if (foodEntry.ingredients.length > 0) {
        summary += `Ingredients:\n`
        foodEntry.ingredients.forEach((ing) => {
          const quantity = ing.quantity && ing.unit ? `${ing.quantity}${ing.unit}` : ''
          summary += `- ${ing.name}${quantity ? ` (${quantity})` : ''}: ${Math.round(ing.calories)} kcal, ${Math.round(ing.carbsG)}g carbs, ${Math.round(ing.proteinG)}g protein, ${Math.round(ing.fatG)}g fat\n`
        })
      }
    }

    summary += `\nGenerated by EverMed\n`
    summary += `This information is for educational purposes only.`

    return summary
  }

  async function handleCopyToClipboard() {
    try {
      const summary = formatMealSummary()

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summary)
        setShowCopiedFeedback(true)
        setTimeout(() => setShowCopiedFeedback(false), 2000)
      } else {
        // Fallback for browsers without clipboard API
        const textarea = document.createElement('textarea')
        textarea.value = summary
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setShowCopiedFeedback(true)
        setTimeout(() => setShowCopiedFeedback(false), 2000)
      }
      setShareError(null)
    } catch (err) {
      console.error('Error copying to clipboard:', err)
      setShareError('Failed to copy to clipboard')
    }
  }

  async function handleDownloadPDF() {
    if (!foodEntry) return

    setIsGeneratingPDF(true)
    setShareError(null)

    try {
      // Create a temporary container for PDF content
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.width = '800px'
      container.style.background = 'white'
      container.style.padding = '40px'
      document.body.appendChild(container)

      // Build PDF content
      const date = new Date(foodEntry.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      container.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">EverMed Meal Summary</h1>
          <h2 style="color: #4b5563; font-size: 18px; margin-bottom: 24px;">${foodEntry.mealType.charAt(0).toUpperCase() + foodEntry.mealType.slice(1)} - ${date}</h2>

          ${foodEntry.analysisStatus === 'completed' ? `
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 12px;">Nutritional Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Total Calories:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${Math.round(foodEntry.totalCalories)} kcal</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Carbohydrates:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${Math.round(foodEntry.totalCarbsG)}g</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Protein:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${Math.round(foodEntry.totalProteinG)}g</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Fat:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${Math.round(foodEntry.totalFatG)}g</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Fiber:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${Math.round(foodEntry.totalFiberG)}g</td>
                </tr>
              </table>
            </div>

            ${foodEntry.ingredients.length > 0 ? `
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 12px;">Ingredients</h3>
                ${foodEntry.ingredients.map(ing => `
                  <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px;">
                    <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">${ing.name}</div>
                    <div style="font-size: 14px; color: #6b7280;">
                      ${ing.quantity && ing.unit ? `${ing.quantity} ${ing.unit} • ` : ''}${Math.round(ing.calories)} kcal • ${Math.round(ing.carbsG)}g carbs • ${Math.round(ing.proteinG)}g protein • ${Math.round(ing.fatG)}g fat
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          ` : `
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #fbbf24; color: #92400e; margin-bottom: 20px;">
              Analysis ${foodEntry.analysisStatus === 'pending' ? 'pending' : 'failed'}
            </div>
          `}

          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p style="margin-bottom: 8px;"><strong>Medical Disclaimer:</strong></p>
            <p>This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.</p>
          </div>
        </div>
      `

      // Capture as image
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
      } as any)

      // Remove temporary container
      document.body.removeChild(container)

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

      // Generate filename
      const filename = `meal-${foodEntry.mealType}-${new Date(foodEntry.timestamp).toISOString().split('T')[0]}.pdf`
      pdf.save(filename)

      setShareError(null)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setShareError('Failed to generate PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  function handleShareEmail() {
    if (!foodEntry) return

    const summary = formatMealSummary()
    const date = new Date(foodEntry.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const subject = encodeURIComponent(`Meal Summary - ${foodEntry.mealType.charAt(0).toUpperCase() + foodEntry.mealType.slice(1)} ${date}`)
    const body = encodeURIComponent(summary)

    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  async function handleSaveAsImage() {
    if (!foodEntry) return

    setIsGeneratingImage(true)
    setShareError(null)

    try {
      // Find the meal summary card
      const summaryCard = document.querySelector('#meal-summary-card') as HTMLElement
      if (!summaryCard) {
        throw new Error('Could not find meal summary to capture')
      }

      const canvas = await html2canvas(summaryCard, {
        scale: 2,
        backgroundColor: '#f9fafb',
      } as any)

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image')
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const filename = `meal-${foodEntry.mealType}-${new Date(foodEntry.timestamp).toISOString().split('T')[0]}.png`
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
      })

      setShareError(null)
    } catch (err) {
      console.error('Error saving as image:', err)
      setShareError('Failed to save as image')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // Close modal on ESC
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showZoomModal) setShowZoomModal(false)
        if (showEditModal) setShowEditModal(false)
        if (showDeleteDialog) setShowDeleteDialog(false)
        if (showShareModal) setShowShareModal(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [showEditModal, showDeleteDialog, showShareModal, showZoomModal])

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <div className="animate-pulse space-y-6">
            {/* Back button skeleton */}
            <div className="h-6 bg-gray-200 rounded w-40"></div>
            {/* Photo skeleton */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="w-full h-96 bg-gray-200"></div>
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            {/* Nutrition skeleton */}
            <div className="bg-white rounded-2xl shadow-md p-6 h-48 bg-gray-200"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !foodEntry) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700 mb-4">
              {error || 'Food entry not found'}
            </p>
            <Link
              href="/metabolic/camera"
              className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              <span>←</span>
              <span>Back to Camera</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Format timestamp
  const formattedDate = new Date(foodEntry.timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = new Date(foodEntry.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const statusConfig = analysisStatusColors[foodEntry.analysisStatus]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header with Back Button and Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/metabolic/camera"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <span>←</span>
            <span>Back to Camera</span>
          </Link>

          {/* Action Buttons (Share, Edit & Delete) */}
          {foodEntry && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold shadow-md hover:shadow-lg transition-all"
                aria-label="Share meal"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold shadow-md hover:shadow-lg transition-all"
                aria-label="Edit ingredients"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-red-600 font-semibold shadow-md hover:shadow-lg transition-all"
                aria-label="Delete meal"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Card - Food Photo & Header */}
        <div id="meal-summary-card" className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Food Photo */}
          {foodEntry.photoUrl && (
            <div
              className="relative w-full h-96 cursor-pointer group"
              onClick={() => {
                setZoomPhotoLoading(true)
                setShowZoomModal(true)
              }}
            >
              <Image
                src={foodEntry.photoUrl}
                alt={`${foodEntry.mealType} meal photo`}
                fill
                className="object-cover transition-opacity hover:opacity-90"
                priority
                unoptimized
              />
              {/* Zoom icon overlay - appears on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="bg-white bg-opacity-90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Header Info */}
          <div className="p-6 space-y-4">
            {/* Meal Type & Status Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${
                  mealTypeBadgeColors[foodEntry.mealType]
                }`}
              >
                {foodEntry.mealType}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium flex items-center gap-1.5 ${statusConfig.bg} ${
                  foodEntry.analysisStatus === 'pending' ? 'animate-pulse' : ''
                }`}
              >
                <span>{statusConfig.icon}</span>
                <span>{statusConfig.text}</span>
              </span>
              {/* Manual Refresh Button */}
              {(foodEntry.analysisStatus === 'pending' || foodEntry.analysisStatus === 'failed') && (
                <button
                  onClick={handleManualRefresh}
                  disabled={isManualRefreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Refresh analysis status"
                >
                  <RefreshCw className={`w-3 h-3 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isManualRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              )}
            </div>

            {/* Polling Status Indicator */}
            {isPolling && foodEntry.analysisStatus === 'pending' && (
              <div className="flex items-center gap-2 text-xs text-gray-500" role="status" aria-live="polite">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Checking for updates... {lastPollTime && `(last checked ${timeSinceLastPoll}s ago)`}</span>
              </div>
            )}

            {/* Max Poll Warning */}
            {showMaxPollWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  Analysis is taking longer than expected. Please check back later or use the Refresh button.
                </p>
              </div>
            )}

            {/* Timestamp */}
            <div>
              <p className="text-sm text-gray-600">{formattedDate}</p>
              <p className="text-sm text-gray-600">{formattedTime}</p>
            </div>
          </div>
        </div>

        {/* Nutritional Summary Card */}
        {foodEntry.analysisStatus === 'completed' && (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900">
              Nutritional Summary
            </h2>

            {/* Total Calories - Large Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Calories</p>
              <p className="text-4xl font-bold text-gray-900">
                {Math.round(foodEntry.totalCalories)}
                <span className="text-lg font-normal text-gray-600 ml-2">kcal</span>
              </p>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Carbs
                </p>
                <p className="text-base font-medium text-gray-900">
                  {Math.round(foodEntry.totalCarbsG)}g
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Protein
                </p>
                <p className="text-base font-medium text-gray-900">
                  {Math.round(foodEntry.totalProteinG)}g
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Fat
                </p>
                <p className="text-base font-medium text-gray-900">
                  {Math.round(foodEntry.totalFatG)}g
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Fiber
                </p>
                <p className="text-base font-medium text-gray-900">
                  {Math.round(foodEntry.totalFiberG)}g
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ingredients List */}
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Ingredients</h2>

          {foodEntry.analysisStatus === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <span>⏱️</span>
                <span>
                  Analysis pending - check back soon! We're analyzing your meal photo.
                </span>
              </p>
            </div>
          )}

          {foodEntry.analysisStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <span>✕</span>
                <span>
                  Analysis failed. Please try uploading a clearer photo.
                </span>
              </p>
            </div>
          )}

          {foodEntry.analysisStatus === 'completed' &&
            foodEntry.ingredients.length > 0 && (
              <div className="space-y-3">
                {foodEntry.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all"
                  >
                    {/* Ingredient Name & Quantity */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {ingredient.name}
                        </h3>
                        {ingredient.quantity && ingredient.unit && (
                          <p className="text-sm text-gray-600">
                            {ingredient.quantity} {ingredient.unit}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {Math.round(ingredient.calories)} kcal
                        </p>
                      </div>
                    </div>

                    {/* Ingredient Nutrition Grid */}
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">Carbs</p>
                        <p className="font-medium text-gray-900">
                          {Math.round(ingredient.carbsG)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Protein</p>
                        <p className="font-medium text-gray-900">
                          {Math.round(ingredient.proteinG)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Fat</p>
                        <p className="font-medium text-gray-900">
                          {Math.round(ingredient.fatG)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Fiber</p>
                        <p className="font-medium text-gray-900">
                          {Math.round(ingredient.fiberG)}g
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          {foodEntry.analysisStatus === 'completed' &&
            foodEntry.ingredients.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  No ingredients detected. Try uploading a clearer photo.
                </p>
              </div>
            )}
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">
            Medical Disclaimer
          </h3>
          <p className="text-sm text-amber-800">
            This information is for educational purposes only and is not a
            substitute for professional medical advice, diagnosis, or treatment.
            Always seek the advice of your physician or other qualified health
            provider with any questions you may have regarding a medical
            condition or dietary changes.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Delete this meal?
            </h2>
            <p className="text-gray-700 mb-6">
              This will permanently delete the meal photo and all nutritional
              data. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{deleteError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ingredients Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Ingredients
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{editError}</p>
              </div>
            )}

            {/* Ingredients List */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {editedIngredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  {/* Ingredient Name & Delete Button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) =>
                        updateIngredient(index, 'name', e.target.value)
                      }
                      placeholder="Ingredient name"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                      onClick={() => removeIngredient(index)}
                      className="text-gray-600 hover:text-red-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                      aria-label="Remove ingredient"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quantity & Unit */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={ingredient.quantity ?? 0}
                        onChange={(e) =>
                          updateIngredient(
                            index,
                            'quantity',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={ingredient.unit ?? 'g'}
                        onChange={(e) =>
                          updateIngredient(index, 'unit', e.target.value)
                        }
                        placeholder="g, ml, piece"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Nutrition Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        value={ingredient.calories}
                        onChange={(e) =>
                          updateIngredient(
                            index,
                            'calories',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        value={ingredient.carbsG}
                        onChange={(e) =>
                          updateIngredient(
                            index,
                            'carbsG',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        value={ingredient.proteinG}
                        onChange={(e) =>
                          updateIngredient(
                            index,
                            'proteinG',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        value={ingredient.fatG}
                        onChange={(e) =>
                          updateIngredient(
                            index,
                            'fatG',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Fiber (g)
                      </label>
                      <input
                        type="number"
                        value={ingredient.fiberG}
                        onChange={(e) =>
                          updateIngredient(
                            index,
                            'fiberG',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Ingredient Button */}
            <button
              onClick={addIngredient}
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-5 h-5" />
              <span>Add Ingredient</span>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900">Share Meal Summary</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Export your meal information to share with your healthcare provider or save for your records.
            </p>

            {shareError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{shareError}</p>
              </div>
            )}

            {/* Export Options Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Copy to Clipboard */}
              <button
                onClick={handleCopyToClipboard}
                className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-700"
              >
                {showCopiedFeedback ? (
                  <>
                    <Check className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-6 h-6" />
                    <span className="text-sm font-medium">Copy to Clipboard</span>
                  </>
                )}
              </button>

              {/* Download as PDF */}
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="bg-blue-600 text-white rounded-lg p-4 hover:bg-blue-700 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPDF ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span className="text-sm font-medium">Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" />
                    <span className="text-sm font-medium">Download PDF</span>
                  </>
                )}
              </button>

              {/* Share via Email */}
              <button
                onClick={handleShareEmail}
                className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-700"
              >
                <Mail className="w-6 h-6" />
                <span className="text-sm font-medium">Share via Email</span>
              </button>

              {/* Save as Image */}
              <button
                onClick={handleSaveAsImage}
                disabled={isGeneratingImage}
                className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingImage ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span className="text-sm font-medium">Generating...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-sm font-medium">Save as Image</span>
                  </>
                )}
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {showZoomModal && foodEntry.photoUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowZoomModal(false)}
        >
          {/* Close & Download Buttons */}
          <div className="fixed top-4 right-4 flex items-center gap-3 z-10">
            {/* Download Photo Button */}
            <a
              href={foodEntry.photoUrl}
              download={`meal-${foodEntry.mealType}-${new Date(foodEntry.timestamp).toISOString().split('T')[0]}.jpg`}
              className="bg-gray-900 bg-opacity-75 text-white rounded-full p-2 hover:bg-opacity-100 transition-all shadow-lg"
              aria-label="Download photo"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-6 h-6" />
            </a>

            {/* Close Button */}
            <button
              onClick={() => setShowZoomModal(false)}
              className="bg-gray-900 bg-opacity-75 text-white rounded-full p-2 hover:bg-opacity-100 transition-all shadow-lg"
              aria-label="Close zoom view"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Zoomed Photo */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] w-auto h-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loading Spinner */}
            {zoomPhotoLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              </div>
            )}

            {/* Full Resolution Photo */}
            <Image
              src={foodEntry.photoUrl}
              alt={`${foodEntry.mealType} meal photo - zoomed`}
              width={1200}
              height={1200}
              className={`object-contain shadow-2xl max-w-[90vw] max-h-[90vh] w-auto h-auto transition-opacity duration-300 ${
                zoomPhotoLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setZoomPhotoLoading(false)}
              priority
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div
          className="fixed top-4 right-4 z-50 bg-green-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-3 animate-slide-in-right"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-white bg-opacity-20 rounded-full p-1">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">Analysis complete!</p>
            <p className="text-sm text-green-100">Your meal has been analyzed</p>
          </div>
          <button
            onClick={() => setShowSuccessToast(false)}
            className="ml-2 text-white hover:text-green-100 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Toast */}
      {showErrorToast && (
        <div
          className="fixed top-4 right-4 z-50 bg-red-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-3 animate-slide-in-right"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-white bg-opacity-20 rounded-full p-1">
            <X className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Analysis failed</p>
            <p className="text-sm text-red-100">
              {consecutiveErrors >= 3
                ? 'Multiple errors occurred. Please try again later.'
                : 'Unable to complete analysis'}
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            aria-label="Retry analysis"
          >
            <RefreshCw className={`w-3 h-3 ${isManualRefreshing ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
          <button
            onClick={() => setShowErrorToast(false)}
            className="ml-2 text-white hover:text-red-100 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
