'use client'
import { useState, useRef, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'

type TopicSuggestion = {
  topic: string
  confidence: number
  reason: string
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [kind, setKind] = useState<'document' | 'imaging' | 'photo' | 'other'>('document')
  const [ocr, setOcr] = useState(true)
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Camera capture state
  const [cameraMode, setCameraMode] = useState<'closed' | 'initializing' | 'active' | 'preview'>('closed')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup camera stream on unmount or when camera is closed
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // Auto-play video when stream is set
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err)
        setCameraError('Failed to start video preview')
      })
    }
  }, [stream])

  async function startCamera() {
    setCameraMode('initializing')
    setCameraError(null)

    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser')
      setCameraMode('closed')
      return
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })
      setStream(mediaStream)
      setCameraMode('active')
    } catch (err) {
      const error = err as Error
      console.error('Camera error:', error)

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError('Camera is already in use by another application.')
      } else {
        setCameraError(`Failed to access camera: ${error.message}`)
      }

      setCameraMode('closed')
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraMode('closed')
    setCameraError(null)
    setCapturedImage(null)
  }

  function capturePhoto() {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCameraError('Failed to create canvas context')
      return
    }

    // Draw current video frame to canvas
    ctx.drawImage(videoRef.current, 0, 0)

    // Convert to data URL for preview
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setCapturedImage(imageDataUrl)

    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }

    setCameraMode('preview')
  }

  function retakePhoto() {
    setCapturedImage(null)
    startCamera()
  }

  function usePhoto() {
    if (!capturedImage) return

    // Convert data URL to Blob then to File
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
        setFile(file)
        setKind('photo') // Auto-set kind to photo
        setOcr(true) // Enable OCR by default for captured photos
        setCameraMode('closed')
        setCapturedImage(null)
      })
      .catch(err => {
        console.error('Error converting image:', err)
        setCameraError('Failed to process captured image')
      })
  }

  async function selectTopic(topic: string) {
    if (!uploadedDocId) return

    try {
      const res = await fetch(`/api/documents/${uploadedDocId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      })

      if (!res.ok) {
        throw new Error('Failed to update topic')
      }

      // Redirect to document page
      window.location.href = `/doc/${uploadedDocId}`
    } catch (e) {
      console.error('Failed to set topic:', e)
      alert('Failed to set topic. Redirecting anyway...')
      window.location.href = `/doc/${uploadedDocId}`
    }
  }

  function skipTopicSelection() {
    if (uploadedDocId) {
      window.location.href = `/doc/${uploadedDocId}`
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
      if (droppedFile.type === 'application/pdf') setKind('document')
      else if (droppedFile.type.startsWith('image/')) setKind('document')
      else setKind('other')
      setOcr(Boolean(droppedFile.type?.startsWith('image/')))
    }
  }

  async function onUpload() {
    setStatus(null)
    if (!file) return
    const supabase = getSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    // Get user's Person record
    setStatus('Preparing upload…')
    const personsRes = await fetch('/api/persons')
    if (!personsRes.ok) {
      setStatus('Failed to load user profile')
      return
    }
    const personsData = await personsRes.json()
    const persons = personsData.persons || []
    if (persons.length === 0) {
      setStatus('No person profile found. Please complete onboarding.')
      return
    }
    const personId = persons[0].id

    // Upload via API endpoint
    setStatus('Uploading…')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('personId', personId)

    const uploadRes = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
    })

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}))
      setStatus(`Upload failed: ${errData.error || 'unknown error'}`)
      return
    }

    const uploadData = await uploadRes.json()
    const docId = uploadData.documentId
    if (!docId) {
      setStatus('Upload succeeded but no document ID returned')
      return
    }
    setUploadedDocId(docId)

    // Get document details and create preview URL
    try {
      const { data: docData } = await supabase.from('documents').select('storage_path, file_type').eq('id', docId).single()
      if (docData && (docData as any).storage_path) {
        const { data: urlData } = await supabase.storage.from('documents').createSignedUrl((docData as any).storage_path, 60 * 60)
        const url = (urlData as any)?.signedUrl || (urlData as any)?.signedURL || null
        setPreviewUrl(url)
        setUploadedFileType((docData as any).file_type || null)
      }
    } catch (e) {
      console.error('Failed to get preview URL:', e)
    }

    // Auto‑explain
    try {
      setStatus('Explaining…')
      await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId })
      })
    } catch {}

    // Get topic suggestions
    try {
      setStatus('Getting topic suggestions…')
      const suggestRes = await fetch(`/api/documents/${docId}/suggest-topic`, {
        method: 'POST'
      })
      if (suggestRes.ok) {
        const suggestData = await suggestRes.json()
        if (suggestData.suggestions && suggestData.suggestions.length > 0) {
          setSuggestions(suggestData.suggestions)
          setShowSuggestions(true)
          setStatus('Upload complete! Select a topic to continue.')
          return // Don't auto-redirect, wait for user to pick a topic
        }
      }
    } catch (e) {
      console.error('Failed to get suggestions:', e)
    }

    // Redirect to document page to review (only if suggestions failed)
    setStatus('Upload complete!')
    setTimeout(() => (window.location.href = `/doc/${docId}`), 800)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Document</h1>
          <p className="text-base text-gray-600">Add medical records, lab results, or imaging to your vault</p>
        </div>

        {/* Upload Area */}
        {!file && !uploadedDocId && (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`bg-white rounded-2xl shadow-md p-12 text-center transition-all ${
              isDragging ? 'shadow-lg border-2 border-blue-600 bg-blue-50' : 'border-2 border-transparent hover:shadow-lg'
            }`}
          >
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
              </div>

              <div>
                <p className="text-lg font-semibold text-gray-900 mb-1">Drop a file here</p>
                <p className="text-sm text-gray-600">or choose from your device</p>
                <p className="text-xs text-gray-500 mt-2">Supports PDF, images, and other medical documents</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  aria-label="Choose file from device"
                >
                  Choose File
                </button>

                <span className="text-sm text-gray-400">or</span>

                <button
                  onClick={startCamera}
                  disabled={cameraMode !== 'closed'}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  aria-label="Capture photo from camera"
                >
                  Take Photo
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setFile(f)
                  if (f) {
                    if (f.type === 'application/pdf') setKind('document')
                    else if (f.type.startsWith('image/')) setKind('document')
                    else setKind('other')
                    setOcr(Boolean(f.type?.startsWith('image/')))
                  }
                }}
                className="hidden"
                aria-label="Select file from device"
              />
            </div>
          </div>
        )}

        {/* Camera error message */}
        {cameraError && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-red-900">{cameraError}</p>
          </div>
        )}

        {/* Selected file preview and options */}
        {file && !uploadedDocId && (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{Math.round(file.size / 1024)} KB</p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:underline"
                aria-label="Remove file"
              >
                Remove
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Document Type</label>
                <select
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as any)}
                  aria-label="Document type"
                >
                  <option value="document">Document</option>
                  <option value="imaging">Imaging (X-ray/MRI)</option>
                  <option value="photo">Photo (self/body part)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {file?.type?.startsWith('image/') && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ocr}
                    onChange={(e) => setOcr(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600 focus:ring-2"
                    aria-label="Enable OCR text extraction"
                  />
                  <span className="text-sm text-gray-700">Extract text with OCR</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onUpload}
                disabled={!file}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                aria-label="Upload document"
              >
                Upload
              </button>
              {status && <p className="text-sm text-gray-600 font-medium">{status}</p>}
            </div>
          </div>
        )}

        {/* Document Preview */}
        {previewUrl && uploadedDocId && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            </div>
            <div className="p-6">
              {uploadedFileType && uploadedFileType.startsWith('image/') && (
                <div className="flex justify-center bg-gray-50 rounded-xl p-4">
                  <img
                    src={previewUrl}
                    alt="Uploaded document preview"
                    className="max-w-full max-h-[60vh] h-auto rounded-lg object-contain"
                  />
                </div>
              )}
              {uploadedFileType === 'application/pdf' && (
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <iframe
                    src={previewUrl}
                    className="w-full h-[60vh] border-0"
                    title="PDF preview"
                    aria-label="Uploaded PDF document preview"
                  />
                </div>
              )}
              {uploadedFileType && !uploadedFileType.startsWith('image/') && uploadedFileType !== 'application/pdf' && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Preview not available for this file type</p>
                  <p className="text-xs text-gray-500 mt-1">{uploadedFileType}</p>
                </div>
              )}
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:underline"
                aria-label="Open document in new tab"
              >
                Open in new tab
              </a>
              {!showSuggestions && (
                <a
                  href={`/doc/${uploadedDocId}`}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  aria-label="View full document details"
                >
                  View Details
                </a>
              )}
            </div>
          </div>
        )}

        {/* Topic Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-md p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Suggested Topics
              </h2>
              <p className="text-sm text-gray-600">
                Choose a topic to help organize this document in your vault
              </p>
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => {
                // Topic color mapping (same as vault page)
                const topicColors: Record<string, string> = {
                  'Labs': 'bg-blue-100 text-blue-700',
                  'Imaging': 'bg-purple-100 text-purple-700',
                  'Medications': 'bg-green-100 text-green-700',
                  'Vitals': 'bg-red-100 text-red-700',
                  'Procedures': 'bg-orange-100 text-orange-700',
                  'Reports': 'bg-indigo-100 text-indigo-700',
                  'Other': 'bg-gray-100 text-gray-700'
                }
                const colorClass = topicColors[suggestion.topic] || 'bg-gray-100 text-gray-700'

                return (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
                            {suggestion.topic}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{suggestion.reason}</p>
                      </div>
                      <button
                        onClick={() => selectTopic(suggestion.topic)}
                        className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 whitespace-nowrap flex-shrink-0"
                        aria-label={`Select ${suggestion.topic} topic`}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-200">
              <button
                onClick={skipTopicSelection}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:underline"
              >
                Skip and continue without a topic
              </button>
            </div>
          </div>
        )}

        {/* Camera Modal */}
        {cameraMode !== 'closed' && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-modal-title"
          >
            <div className="w-full h-full sm:w-auto sm:h-auto sm:max-w-4xl sm:max-h-screen flex flex-col relative">
              {/* Close button */}
              <button
                onClick={stopCamera}
                className="absolute top-4 right-4 z-10 p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close camera modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex-1 flex items-center justify-center p-4">
                {cameraMode === 'initializing' && (
                  <div className="text-center text-white">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mb-4"></div>
                    <p id="camera-modal-title" className="text-base font-medium">Starting camera...</p>
                  </div>
                )}

                {cameraMode === 'active' && (
                  <div className="relative w-full max-w-3xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto rounded-xl"
                      aria-label="Camera preview"
                    />
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        onClick={stopCamera}
                        className="px-6 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Cancel and close camera"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="px-8 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Capture photo"
                      >
                        Capture Photo
                      </button>
                    </div>
                  </div>
                )}

                {cameraMode === 'preview' && capturedImage && (
                  <div className="w-full max-w-3xl">
                    <img
                      src={capturedImage}
                      alt="Captured photo preview"
                      className="w-full h-auto max-h-[70vh] object-contain rounded-xl bg-black"
                    />
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        onClick={retakePhoto}
                        className="px-6 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Retake photo"
                      >
                        Retake
                      </button>
                      <button
                        onClick={usePhoto}
                        className="px-8 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Use this photo for upload"
                      >
                        Use Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
