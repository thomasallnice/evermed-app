'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, Camera as CameraIcon, RotateCcw } from 'lucide-react'

/**
 * GlucoLens Camera Page - Photo-first food logging
 *
 * Design principles:
 * - Full-screen camera view
 * - Large, thumb-friendly capture button
 * - Auto-capture or manual (mobile vs desktop)
 * - 2 taps total, <10 seconds to completion
 */

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export default function CameraPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    // Check auth
    const checkAuth = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      }
    }
    checkAuth()

    return () => stopCamera()
  }, [router])

  async function startCamera() {
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err: any) {
      console.error('Camera error:', err)
      setError('Unable to access camera. Please use the file upload option.')
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setCameraActive(false)
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(imageDataUrl)
    stopCamera()

    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Please choose an image under 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function uploadPhoto() {
    if (!capturedImage) return

    setUploading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(capturedImage)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append('photo', blob, `meal-${Date.now()}.jpg`)
      formData.append('mealType', selectedMealType)

      const uploadRes = await fetch('/api/metabolic/food', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json()
        throw new Error(errorData.error || 'Failed to upload photo')
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const mealTypeConfig = {
    breakfast: { emoji: '🌅', label: 'Breakfast' },
    lunch: { emoji: '☀️', label: 'Lunch' },
    dinner: { emoji: '🌙', label: 'Dinner' },
    snack: { emoji: '🍎', label: 'Snack' },
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-white">Log Meal</h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16">
        {/* Error Message */}
        {error && (
          <div className="absolute top-20 left-4 right-4 z-50 bg-red-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Camera or Preview */}
        {!capturedImage ? (
          <>
            {/* Camera View */}
            {cameraActive && (
              <div className="relative w-full h-[calc(100vh-80px)] bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
                {/* Capture Button */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full bg-white shadow-2xl flex items-center justify-center transition-all active:scale-95"
                    aria-label="Capture photo"
                  >
                    <div className="w-16 h-16 rounded-full border-4 border-blue-600"></div>
                  </button>
                </div>
              </div>
            )}

            {/* Camera Not Started */}
            {!cameraActive && (
              <div className="w-full h-[calc(100vh-80px)] bg-gray-900 flex flex-col items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <div className="text-8xl mb-6">📸</div>
                  <h2 className="text-3xl font-bold text-white mb-3">Take a Photo</h2>
                  <p className="text-gray-300 text-lg mb-8">
                    Point your camera at your meal for instant nutrition analysis
                  </p>

                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    ref={(input) => {
                      if (input) (window as any).galleryInputRef = input
                    }}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Primary: Open Camera (mobile) */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl bg-blue-600 text-white font-bold px-8 py-5 text-lg hover:bg-blue-700 transition-colors shadow-lg mb-4"
                  >
                    <CameraIcon className="w-6 h-6 inline-block mr-2" />
                    Open Camera
                  </button>

                  {/* Secondary: Choose from Gallery */}
                  <button
                    onClick={() => (window as any).galleryInputRef?.click()}
                    className="w-full rounded-xl bg-gray-700 text-white font-semibold px-8 py-5 text-lg hover:bg-gray-600 transition-colors mb-4"
                  >
                    🖼️ Choose from Gallery
                  </button>

                  {/* Tertiary: WebRTC (desktop) */}
                  <button
                    onClick={startCamera}
                    className="hidden md:block w-full rounded-xl bg-gray-800 text-gray-300 font-semibold px-8 py-5 text-lg hover:bg-gray-700 transition-colors border border-gray-600"
                  >
                    Use Webcam (Desktop)
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-screen bg-black">
            {/* Photo Preview */}
            <div className="relative w-full h-[60vh]">
              <img
                src={capturedImage}
                alt="Captured meal"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Meal Type Selector */}
            <div className="bg-gray-900 p-6 space-y-4">
              <h3 className="text-white font-semibold text-lg mb-3">Meal Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(mealTypeConfig) as MealType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedMealType(type)}
                    className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-semibold text-base transition-all ${
                      selectedMealType === type
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-2xl">{mealTypeConfig[type].emoji}</span>
                    <span>{mealTypeConfig[type].label}</span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setCapturedImage(null)
                    setError(null)
                  }}
                  disabled={uploading}
                  className="flex-1 rounded-xl bg-gray-800 text-white font-semibold px-6 py-4 text-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Retake
                </button>
                <button
                  onClick={uploadPhoto}
                  disabled={uploading}
                  className="flex-1 rounded-xl bg-blue-600 text-white font-bold px-6 py-4 text-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      ✓ Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas for capturing (hidden) */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <BottomNav />
    </div>
  )
}
