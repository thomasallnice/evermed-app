'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type DocumentEntry = {
  id: string
  filename: string
  storagePath: string
  signedUrl?: string | null
}

type ObservationEntry = {
  id: string
  code: string
  display: string
  valueNum: number | null
  unit: string | null
  effectiveAt: string | null
  refLow: number | null
  refHigh: number | null
  sourceDocId?: string | null
  sourceDocumentSignedUrl?: string | null
  trend?: { delta: number; windowDays: number; outOfRange: boolean } | null
}

export default function SharePage() {
  const params = useParams<{ token: string }>()
  const token = params?.token
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!token) return
      setLoading(true)
      const res = await fetch(`/api/share-packs/${token}`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return <p>Loading…</p>
  if (!data || data.error) {
    return (
      <div className="space-y-3">
        <p>Enter passcode to view this pack.</p>
        <PasscodeForm id={String(token)} onOk={() => location.reload()} />
      </div>
    )
  }

  const documents: DocumentEntry[] = data.documents || []
  const observations: ObservationEntry[] = data.observations || []
  const documentUrlById = useMemo(() => {
    const map = new Map<string, string | null>()
    documents.forEach((doc) => map.set(doc.id, doc.signedUrl ?? null))
    observations.forEach((obs) => {
      if (obs.sourceDocId && obs.sourceDocumentSignedUrl && !map.has(obs.sourceDocId)) {
        map.set(obs.sourceDocId, obs.sourceDocumentSignedUrl)
      }
    })
    return map
  }, [documents, observations])

  const openDocument = (docId: string) => {
    const url = documentUrlById.get(docId)
    if (url) {
      window.open(url, '_blank', 'noopener')
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{data.title} ({data.audience})</h1>
        <div className="text-sm text-neutral-600">Expires: {new Date(data.expiresAt).toLocaleString()}</div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-neutral-600">No documents included in this pack.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li key={d.id} className="border rounded-md p-3 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{d.filename}</div>
                    <div className="text-xs text-neutral-500 break-all">{d.storagePath}</div>
                  </div>
                  {d.signedUrl && (
                    <button
                      onClick={() => window.open(d.signedUrl as string, '_blank', 'noopener')}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Open
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {observations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Observations</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-neutral-100 text-left">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Latest value</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Trend</th>
                  <th className="px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs) => {
                  const latestDate = obs.effectiveAt ? new Date(obs.effectiveAt) : null
                  const refRange = typeof obs.refLow === 'number' && typeof obs.refHigh === 'number'
                    ? `${obs.refLow} – ${obs.refHigh}`
                    : '—'
                  const trend = obs.trend
                  return (
                    <tr key={obs.id} className="odd:bg-white even:bg-neutral-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-medium">{obs.display || obs.code}</div>
                        <div className="text-xs text-neutral-500">{obs.code}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {obs.valueNum ?? '—'} {obs.unit || ''}
                        {latestDate && <span className="block text-xs text-neutral-500">{latestDate.toLocaleDateString()}</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-neutral-600">{refRange}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {trend ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              trend.outOfRange ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            {trend.delta >= 0 ? '+' : ''}{trend.delta} ({trend.windowDays}d)
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {obs.sourceDocId ? (
                          <button
                            onClick={() => openDocument(obs.sourceDocId!)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View document
                          </button>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-neutral-500">This link shows only selected items from the vault. Never share your passcode. Expires automatically.</p>
    </div>
  )
}

function PasscodeForm({ id, onOk }: { id: string, onOk: () => void }) {
  const [pc, setPc] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    setLoading(true)
    setErr('')
    const res = await fetch(`/api/share-packs/${id}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode: pc }) })
    if (res.ok) onOk()
    else setErr('Invalid passcode or expired link')
    setLoading(false)
  }
  return (
    <div className="flex items-center space-x-2">
      <input value={pc} onChange={(e) => setPc(e.target.value)} className="border rounded px-2 py-1" placeholder="Passcode" />
      <button onClick={submit} disabled={loading} className="border rounded px-3 py-1 bg-neutral-800 text-white">View</button>
      {err && <span className="text-red-600 text-sm">{err}</span>}
    </div>
  )
}
