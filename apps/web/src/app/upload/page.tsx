'use client'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [kind, setKind] = useState<'document' | 'imaging' | 'photo' | 'other'>('document')
  const [ocr, setOcr] = useState(true)

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

    // Fetch Person record via API route
    const personResponse = await fetch('/api/person/me')
    if (!personResponse.ok) {
      setStatus(`Error: Person record not found. Please complete onboarding.`)
      return
    }

    const personData = await personResponse.json()
    const personId = personData.id

    // Upload via API route (handles storage + database insert + OCR + embeddings)
    setStatus('Uploading…')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('personId', personId)

    const uploadResponse = await fetch('/api/uploads', {
      method: 'POST',
      body: formData
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }))
      setStatus(`Upload error: ${errorData.error || 'Unknown error'}`)
      return
    }

    const { documentId } = await uploadResponse.json()
    setStatus('Processing…')

    // Auto‑explain
    try {
      setStatus('Explaining…')
      await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      })
    } catch {}

    setStatus('Done!')

    // Redirect to document page to review
    setTimeout(() => (window.location.href = `/doc/${documentId}`), 800)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Upload Document</h1>
      <input
        aria-label="file"
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
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">This is a:
          <select className="ml-1" value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="document">Document</option>
            <option value="imaging">Imaging (X‑ray/MRI)</option>
            <option value="photo">Photo (self/body part)</option>
            <option value="other">Other</option>
          </select>
        </label>
        {file?.type?.startsWith('image/') && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ocr} onChange={(e) => setOcr(e.target.checked)} /> OCR extract text
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onUpload} disabled={!file}>Upload</button>
        {status && <p className="text-sm text-neutral-700">{status}</p>}
      </div>
      <p className="text-sm text-neutral-600">Note: Ensure a Supabase Storage bucket named <code>documents</code> exists with RLS allowing user-owned uploads.</p>
    </div>
  )
}
