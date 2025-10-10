'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'

type DocumentPreviewProps = {
  documentId: string
  filename: string
  kind: string
  storagePath: string
}

export function DocumentPreview({ documentId, filename, kind }: DocumentPreviewProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Only fetch signed URL for images
    if (kind !== 'image') {
      setLoading(false)
      return
    }

    async function fetchSignedUrl() {
      try {
        const res = await fetch(`/api/documents/${documentId}`)
        if (!res.ok) throw new Error('Failed to fetch document')

        const data = await res.json()
        if (data.signedUrl) {
          setSignedUrl(data.signedUrl)
        } else {
          setError(true)
        }
      } catch (e) {
        console.error('Error fetching signed URL:', e)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchSignedUrl()
  }, [documentId, kind])

  // Loading skeleton
  if (loading && kind === 'image') {
    return (
      <div className="w-full aspect-video bg-gray-200 animate-pulse rounded-t-2xl flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  // Image preview
  if (kind === 'image' && signedUrl && !error) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-t-2xl overflow-hidden relative">
        <Image
          src={signedUrl}
          alt={filename}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      </div>
    )
  }

  // Icon fallback for PDFs, notes, errors, or unknown types
  const iconMap: Record<string, { emoji: string; label: string }> = {
    pdf: { emoji: '📄', label: 'PDF Document' },
    note: { emoji: '📝', label: 'Note' },
    image: { emoji: '🖼️', label: 'Image' },
    default: { emoji: '📁', label: 'Document' }
  }

  const icon = iconMap[kind.toLowerCase()] || iconMap.default

  return (
    <div className="w-full aspect-video bg-gray-100 rounded-t-2xl flex flex-col items-center justify-center">
      <span className="text-5xl mb-2" role="img" aria-label={icon.label}>
        {icon.emoji}
      </span>
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {icon.label}
      </span>
    </div>
  )
}
