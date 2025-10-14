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
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Log Your Meal</h1>
          <a
            href="/metabolic/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>

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
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      {cameraPermissionDenied ? 'Camera Access Denied' : 'Ready to Capture'}
                    </h2>
                    <p className="text-gray-600 mb-6">
                      {cameraPermissionDenied
                        ? 'Please use the file upload option below or enable camera permissions in your browser settings.'
                        : 'Take a photo of your meal to analyze its nutritional content.'}
                    </p>

                    {!cameraPermissionDenied && (
                      <button
                        onClick={startCamera}
                        className="rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-colors shadow-md"
                      >
                        Start Camera
                      </button>
                    )}

                    {/* File Upload Option */}
                    <div className="mt-6">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-gray-100 text-gray-700 font-semibold px-6 py-3 hover:bg-gray-200 transition-colors border border-gray-300"
                      >
                        Upload from Gallery
                      </button>
                    </div>
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
          <div className="mt-6 bg-white rounded-2xl shadow-md p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Meal Type</label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`flex-shrink-0 px-6 py-3 rounded-full font-semibold text-sm transition-all ${
                    selectedMealType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type === 'breakfast' && '🌅 '}
                  {type === 'lunch' && '☀️ '}
                  {type === 'dinner' && '🌙 '}
                  {type === 'snack' && '🍎 '}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {capturedImage && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setCapturedImage(null)
                setError(null)
              }}
              disabled={uploading}
              className="flex-1 rounded-lg bg-white text-gray-700 font-semibold px-6 py-3 hover:bg-gray-50 transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Retake
            </button>
            <button
              onClick={uploadPhoto}
              disabled={uploading}
              className="flex-1 rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Analyzing...
                </>
              ) : (
                'Upload & Analyze'
              )}
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
