'use client'
import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // Request camera access
  async function startCamera() {
    setError(null)
    setCameraPermissionDenied(false)

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
      console.error('Camera access error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermissionDenied(true)
        setError('Camera permission denied. Please use the file upload option below.')
      } else {
        setError('Unable to access camera. Please use the file upload option.')
      }
    }
  }

  // Stop camera
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setCameraActive(false)
  }

  // Capture photo
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

    // Haptic feedback (if available)
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }

  // Handle file upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
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

  // Upload photo and create FoodEntry
  async function uploadPhoto() {
    if (!capturedImage) return

    setUploading(true)
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

      // Convert base64 to blob
      const response = await fetch(capturedImage)
      const blob = await response.blob()

      // Create FormData
      const formData = new FormData()
      formData.append('photo', blob, `meal-${Date.now()}.jpg`)
      formData.append('mealType', selectedMealType)

      // Upload to API
      const uploadRes = await fetch('/api/metabolic/food', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json()
        throw new Error(errorData.error || 'Failed to upload photo')
      }

      const data = await uploadRes.json()

      // Redirect back to dashboard
      window.location.href = `/metabolic/dashboard`
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <a
            href="/metabolic/dashboard"
            className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back to Dashboard"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h1 className="text-lg font-semibold text-gray-900">Log Your Meal</h1>
          <div className="w-12"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="container py-4 px-4">

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Camera View or Preview */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {!capturedImage ? (
            <>
              {/* Camera View */}
              {cameraActive && (
                <div className="relative w-full aspect-[4/3] bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                  />
                  {/* Capture Button */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-6">
                    <div className="flex justify-center">
                      <button
                        onClick={capturePhoto}
                        className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center transition-all active:scale-95"
                        aria-label="Capture photo"
                      >
                        <span className="text-white text-4xl">📷</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Permission Denied or Not Started */}
              {!cameraActive && (
                <div className="w-full aspect-[4/3] bg-gray-100 flex flex-col items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">📸</div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Take a Photo</h2>
                    <p className="text-gray-600 mb-6">
                      Snap a photo of your meal to analyze its nutritional content.
                    </p>

                    {/* Camera Input (opens camera on mobile) */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Gallery Input (opens file picker) */}
                    <input
                      ref={(input) => {
                        if (input) {
                          (window as any).galleryInputRef = input
                        }
                      }}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Primary: Open Camera */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl bg-blue-600 text-white font-semibold px-8 py-4 min-h-[56px] hover:bg-blue-700 transition-colors shadow-md text-lg mb-3"
                    >
                      📸 Open Camera
                    </button>

                    {/* Secondary: Choose from Gallery */}
                    <button
                      onClick={() => (window as any).galleryInputRef?.click()}
                      className="w-full rounded-xl bg-gray-100 text-gray-700 font-semibold px-8 py-4 min-h-[56px] hover:bg-gray-200 transition-colors border border-gray-300 text-lg mb-3"
                    >
                      🖼️ Choose from Gallery
                    </button>

                    {/* Tertiary: WebRTC Camera (desktop only) */}
                    {!cameraPermissionDenied && (
                      <button
                        onClick={startCamera}
                        className="hidden md:block w-full rounded-xl bg-white text-gray-700 font-semibold px-8 py-4 min-h-[56px] hover:bg-gray-50 transition-colors border border-gray-300 text-lg"
                      >
                        Use Webcam (Desktop)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Photo Preview */}
              <div className="relative w-full aspect-[4/3]">
                <img
                  src={capturedImage}
                  alt="Captured meal"
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          )}

          {/* Canvas for capturing (hidden) */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Meal Type Selector */}
        {capturedImage && (
          <div className="mt-4 bg-white rounded-2xl shadow-md p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Meal Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`flex items-center justify-center gap-2 px-4 py-4 min-h-[56px] rounded-xl font-semibold text-base transition-all ${
                    selectedMealType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">
                    {type === 'breakfast' && '🌅'}
                    {type === 'lunch' && '☀️'}
                    {type === 'dinner' && '🌙'}
                    {type === 'snack' && '🍎'}
                  </span>
                  <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {capturedImage && (
          <div className="mt-4 flex flex-col gap-3 pb-6">
            <button
              onClick={uploadPhoto}
              disabled={uploading}
              className="w-full rounded-xl bg-blue-600 text-white font-semibold px-6 py-4 min-h-[56px] hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Uploading...
                </>
              ) : (
                'Upload Meal'
              )}
            </button>
            <button
              onClick={() => {
                setCapturedImage(null)
                setError(null)
              }}
              disabled={uploading}
              className="w-full rounded-xl bg-white text-gray-700 font-semibold px-6 py-4 min-h-[56px] hover:bg-gray-50 transition-colors border-2 border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              Retake Photo
            </button>
          </div>
        )}

        {/* Instructions */}
        {!capturedImage && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Tips for Best Results</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Ensure good lighting for clear photos</li>
              <li>Capture the entire meal in the frame</li>
              <li>Avoid shadows and reflections</li>
              <li>Hold the camera steady for sharp images</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
