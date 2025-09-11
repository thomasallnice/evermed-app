'use client'
import { useEffect, useState } from 'react'

type Status = {
  env: { environment: string }
  openai: { stream: boolean; model: string; model_summary?: string; model_embed?: string; base_url?: string }
  extractor: { configured: boolean; url_host?: string; bearer_set: boolean; fallback_enabled: boolean; max_bytes: number; libs: { pdf_parse: boolean; pdfjs: boolean }; ping: { ok: boolean; status?: number; skipped?: boolean; error?: string } }
  rag: { documents: number | null; chunks: number | null; cache_texts: number | null }
}

export default function DevPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/dev/status', { cache: 'no-store' })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || 'Failed to load status')
        setStatus(j)
      } catch (e: any) {
        setError(e?.message || 'Failed to load status')
      }
    })()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dev Status</h1>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      {!status && !error && <div>Loading…</div>}

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-3 bg-white">
            <h2 className="font-medium mb-2">Environment</h2>
            <ul className="text-sm space-y-1">
              <li>Env: <span className="font-mono">{status.env.environment}</span></li>
            </ul>
          </div>

          <div className="border rounded-md p-3 bg-white">
            <h2 className="font-medium mb-2">OpenAI</h2>
            <ul className="text-sm space-y-1">
              <li>Model: <span className="font-mono">{status.openai.model}</span></li>
              {status.openai.model_summary && <li>Summary: <span className="font-mono">{status.openai.model_summary}</span></li>}
              {status.openai.model_embed && <li>Embed: <span className="font-mono">{status.openai.model_embed}</span></li>}
              <li>Streaming: <span className="font-mono">{String(status.openai.stream)}</span></li>
              {status.openai.base_url && <li>Base: <span className="font-mono">{status.openai.base_url}</span></li>}
            </ul>
          </div>

          <div className="border rounded-md p-3 bg-white">
            <h2 className="font-medium mb-2">Extractor</h2>
            <ul className="text-sm space-y-1">
              <li>Configured: <span className="font-mono">{String(status.extractor.configured)}</span></li>
              {status.extractor.url_host && <li>Host: <span className="font-mono">{status.extractor.url_host}</span></li>}
              <li>Bearer set: <span className="font-mono">{String(status.extractor.bearer_set)}</span></li>
              <li>Fallback: <span className="font-mono">{String(status.extractor.fallback_enabled)}</span></li>
              <li>pdf-parse: <span className="font-mono">{String(status.extractor.libs.pdf_parse)}</span></li>
              <li>pdfjs: <span className="font-mono">{String(status.extractor.libs.pdfjs)}</span></li>
              <li>Ping: <span className="font-mono">{status.extractor.ping.skipped ? 'skipped' : `${status.extractor.ping.ok} (${status.extractor.ping.status ?? '-'})`}</span></li>
              <li>Max bytes: <span className="font-mono">{status.extractor.max_bytes}</span></li>
            </ul>
          </div>

          <div className="border rounded-md p-3 bg-white">
            <h2 className="font-medium mb-2">RAG</h2>
            <ul className="text-sm space-y-1">
              <li>Documents: <span className="font-mono">{status.rag.documents ?? '-'}</span></li>
              <li>Chunks: <span className="font-mono">{status.rag.chunks ?? '-'}</span></li>
              <li>Cached texts: <span className="font-mono">{status.rag.cache_texts ?? '-'}</span></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

