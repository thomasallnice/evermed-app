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
      const res = await fetch(`/api/share?token=${token}`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return <p>Loading…</p>
  if (!data || !data.documents) return <p>Invalid or expired link.</p>

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Shared Documents</h1>
      <ul className="space-y-2">
        {data.documents.map((d: any) => (
          <li key={d.id} className="border rounded-md p-3 bg-white">
            <div className="font-medium">{d.file_name}</div>
            <div className="text-sm text-neutral-600">{d.file_type}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

