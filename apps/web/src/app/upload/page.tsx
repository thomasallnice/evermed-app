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

    // Fetch Person record to get personId (required for RLS policies)
    const { data: personData, error: personError } = await supabase
      .from('Person')
      .select('id')
      .eq('ownerId', user.id)
      .single()

    if (personError || !personData) {
      setStatus(`Error: Person record not found. Please complete onboarding.`)
      return
    }

    const personId = personData.id

    // Upload to Supabase Storage using personId (not userId)
    const path = `${personId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setStatus(`Upload error: ${uploadError.message}`)
      return
    }

    // Insert metadata row and obtain id
    const { data: ins, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        storage_path: path,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        tags: [
          `kind:${kind}`,
          ...(file.type.startsWith('image/') ? [`ocr:${ocr ? 1 : 0}`] : []),
        ],
      } as any)
      .select('id')
      .single()

    if (insertError || !ins) {
      setStatus(`Insert error: ${insertError?.message || 'unknown'}`)
      return
    }

    const docId = (ins as any).id as string

    // For images: optional OCR (if kind=document and OCR selected)
    if (file.type.startsWith('image/') && kind === 'document' && ocr) {
      try {
        setStatus('Extracting text (OCR)…')
        await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId })
        })
      } catch {}
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

    // Auto‑index (RAG)
    if (kind !== 'photo') {
      try {
        setStatus('Indexing for RAG…')
        const r = await fetch('/api/rag/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId })
        })
        const j = await r.json().catch(() => ({}))
        if (r.ok) setStatus(`Done. Indexed ${j.chunks || 0} chunks.`)
        else setStatus(`Indexing failed: ${j.error || 'error'}`)
      } catch {}
    }

    // Redirect to document page to review
    setTimeout(() => (window.location.href = `/doc/${docId}`), 800)
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
