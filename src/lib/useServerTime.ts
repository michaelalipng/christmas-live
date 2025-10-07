// lib/useServerTime.ts
'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Returns a continuously updated "server time" in ms by
 * periodically sampling /api/time and applying drift correction.
 */
export function useServerTime(pollMs: number = 1000, resyncMs: number = 15000) {
  const [nowMs, setNowMs] = useState<number>(Date.now())
  const driftRef = useRef<number>(0) // server_ms - client_ms snapshot

  // periodic resync with server
  useEffect(() => {
    let alive = true
    const sync = async () => {
      try {
        const t0 = performance.now()
        const res = await fetch('/api/time', { cache: 'no-store' })
        const t1 = performance.now()
        const json = await res.json()
        // simple midpoint adjustment
        const rtt = t1 - t0
        const serverMs = Number(json?.server_ms ?? Date.now())
        const midpointClient = Date.now() - rtt / 2
        const drift = serverMs - midpointClient
        if (alive) driftRef.current = drift
      } catch {
        // ignore network errors; keep last drift
      }
    }
    sync()
    const id = setInterval(sync, resyncMs)
    return () => { alive = false; clearInterval(id) }
  }, [resyncMs])

  // tick "server time"
  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now() + driftRef.current)
    }, pollMs)
    return () => clearInterval(id)
  }, [pollMs])

  return nowMs
}

