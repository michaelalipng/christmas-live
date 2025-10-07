// app/health/page.tsx
'use client'
import { useEffect, useState } from 'react'

export default function HealthPage() {
  const [serverMs, setServerMs] = useState<number | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ping = async () => {
    try {
      const t0 = performance.now()
      const res = await fetch('/api/time', { cache: 'no-store' })
      const t1 = performance.now()
      const json = await res.json()
      const roundTrip = t1 - t0
      setLatency(Math.round(roundTrip))
      setServerMs(json.server_ms)
      setDelta(Math.round(json.server_ms - Date.now()))
      setError(null)
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Failed to fetch /api/time')
    }
  }

  useEffect(() => {
    ping()
    const id = setInterval(ping, 5000) // recheck every 5s
    return () => clearInterval(id)
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Health Check</h1>
        <ul className="space-y-1 text-sm">
          <li><span className="font-semibold">Server time (ms):</span> {serverMs ?? '—'}</li>
          <li><span className="font-semibold">Round-trip latency:</span> {latency !== null ? `${latency} ms` : '—'}</li>
          <li><span className="font-semibold">Clock delta (server - client):</span> {delta !== null ? `${delta} ms` : '—'}</li>
        </ul>
        {error && <p className="text-red-600 text-sm">Error: {error}</p>}
        <button
          onClick={ping}
          className="px-3 py-2 rounded bg-black text-white"
        >
          Recheck
        </button>
      </div>
    </main>
  )
}

