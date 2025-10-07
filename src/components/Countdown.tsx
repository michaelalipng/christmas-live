// components/Countdown.tsx
'use client'
import { useMemo } from 'react'

export function formatSeconds(totalMs: number) {
  const s = Math.max(0, Math.ceil(totalMs / 1000))
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return m > 0 ? `${m}:${ss}` : `${s % 60}s`
}

export default function Countdown({
  nowMs,
  endsAtIso,
  totalDurationSec,
  lockThresholdPct = 0.2, // last 20% visually "lock"
}: {
  nowMs: number
  endsAtIso: string | null
  totalDurationSec: number
  lockThresholdPct?: number
}) {
  const { remainingMs, pct, lockVisual } = useMemo(() => {
    if (!endsAtIso) return { remainingMs: 0, pct: 0, lockVisual: false }
    const ends = Date.parse(endsAtIso)
    const totalMs = Math.max(1, totalDurationSec * 1000)
    const rem = Math.max(0, ends - nowMs)
    const used = Math.min(totalMs, totalMs - rem)
    const pct = used / totalMs // 0..1 elapsed
    const lockVisual = rem <= totalMs * lockThresholdPct
    return { remainingMs: rem, pct, lockVisual }
  }, [nowMs, endsAtIso, totalDurationSec, lockThresholdPct])

  return (
    <div className="w-full space-y-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${lockVisual ? 'opacity-60' : ''}`}
          style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, backgroundColor: 'black', transition: 'width 250ms linear' }}
        />
      </div>
      <div className="text-sm tabular-nums">
        Time left: <span className={lockVisual ? 'opacity-70' : ''}>{formatSeconds(remainingMs)}</span>
      </div>
    </div>
  )
}

