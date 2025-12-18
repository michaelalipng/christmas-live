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
    <div className="w-full flex flex-col rounded-xl backdrop-blur-md p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', border: '2px solid rgba(56, 93, 117, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}>
      <div className="grid grid-cols-1 gap-3 overflow-visible">
        {options.map(o => {
          const c = counts[o.id] ?? 0
          const pct = total > 0 ? Math.round((c / total) * 100) : 0
          return (
            <div key={o.id} className="flex flex-col justify-center space-y-1.5">
              <div className="flex justify-between items-center font-bold">
                <span className="uppercase" style={{ color: '#385D75', wordBreak: 'break-word', fontSize: 'clamp(0.75rem, 1.4vw, 1.75rem)' }}>{o.label}</span>
                <span className="tabular-nums font-bold ml-3 flex-shrink-0" style={{ color: '#D8A869', fontSize: 'clamp(0.75rem, 1.4vw, 1.75rem)' }}>{c} • {pct}%</span>
              </div>
              <div className="w-full rounded-full overflow-hidden backdrop-blur-sm" style={{ height: 'clamp(0.5rem, 1vh, 1rem)', backgroundColor: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(56, 93, 117, 0.2)', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)' }}>
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, backgroundColor: '#D8A869', transition: 'width 200ms linear' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

