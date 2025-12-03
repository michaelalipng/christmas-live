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
    <div className="w-full space-y-3">
      <div className="h-3 w-full rounded-full overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(56, 93, 117, 0.2)', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)' }}>
        <div
          className={`h-full ${lockVisual ? 'opacity-70' : ''}`}
          style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, backgroundColor: '#D8A869', transition: 'width 250ms linear' }}
        />
      </div>
      <div className="text-base tabular-nums font-medium" style={{ color: '#385D75' }}>
        Time left: <span className="font-bold" style={{ color: '#D8A869' }}>{formatSeconds(remainingMs)}</span>
      </div>
    </div>
  )
}

