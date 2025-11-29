'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { PollOption, UUID } from '@/types/db'

type Counts = Record<string, number>
type VoteRow = { option_id: UUID }

export default function LiveTally({ pollId }: { pollId: UUID }) {
  const [options, setOptions] = useState<PollOption[]>([])
  const [counts, setCounts] = useState<Counts>({})

  // load options once
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', pollId)
        .order('order_index', { ascending: true })
      if (!alive) return
      setOptions((data ?? []) as unknown as PollOption[])
    })()
    return () => { alive = false }
  }, [pollId])

  // initial counts snapshot
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', pollId)
      if (!alive) return
      const init: Counts = {}
      for (const row of (data as VoteRow[] | null) ?? []) {
        init[row.option_id] = (init[row.option_id] ?? 0) + 1
      }
      setCounts(init)
    })()
    return () => { alive = false }
  }, [pollId])

  // realtime inserts
  useEffect(() => {
    const channel = supabase
      .channel(`votes:poll:${pollId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `poll_id=eq.${pollId}` },
        (payload) => {
          const opt = (payload.new as VoteRow).option_id
          setCounts(prev => ({ ...prev, [opt]: (prev[opt] ?? 0) + 1 }))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [pollId])

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts])

  if (!options.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide opacity-70">Live Votes: {total}</p>
      <div className="grid gap-2">
        {options.map(o => {
          const c = counts[o.id] ?? 0
          const pct = total > 0 ? Math.round((c / total) * 100) : 0
          return (
            <div key={o.id}>
              <div className="flex justify-between text-sm">
                <span>{o.label}</span>
                <span className="tabular-nums">{c} • {pct}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, backgroundColor: 'black', transition: 'width 200ms linear' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

