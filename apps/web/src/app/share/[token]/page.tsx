'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

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

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{data.title} ({data.audience})</h1>
      <div className="text-sm text-neutral-600">Expires: {new Date(data.expiresAt).toLocaleString()}</div>
      <ul className="space-y-2">
        {(data.documents || []).map((d: any) => (
          <li key={d.id} className="border rounded-md p-3 bg-white">
            <div className="font-medium">{d.filename}</div>
            {d.signedUrl && (<a className="text-blue-600 underline text-sm" href={d.signedUrl} target="_blank">Open</a>)}
          </li>
        ))}
      </ul>
      {Array.isArray(data.observations) && data.observations.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mt-4">Observations</h2>
          <ul className="list-disc ml-6">
            {data.observations.map((o: any) => (
              <li key={o.id}>{o.display}: {o.valueNum ?? ''} {o.unit ?? ''} {o.effectiveAt ? `(${new Date(o.effectiveAt).toLocaleDateString()})` : ''}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-neutral-500 mt-6">This link shows only selected items from the vault. Never share your passcode. Expires automatically.</p>
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
