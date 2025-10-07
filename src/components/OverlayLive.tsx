'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { Poll, PollOption, UUID } from '@/types/db'
import { useServerTime } from '@/lib/useServerTime'
import Countdown from '@/components/Countdown'

type LiveState =
  | { status: 'loading' }
  | { status: 'idle' }
  | { status: 'active'; poll: Poll }
  | { status: 'results'; poll: Poll }

async function getCampusIdBySlug(slug: string): Promise<UUID | null> {
  const { data, error } = await supabase
    .from('campuses')
    .select('id')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()
  if (error) { console.warn(error); return null }
  return data?.id ?? null
}

async function getLatestEventId(campus_id: UUID): Promise<UUID | null> {
  const { data, error } = await supabase
    .from('events')
    .select('id, created_at')
    .eq('campus_id', campus_id)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) { console.warn(error); return null }
  return data?.[0]?.id ?? null
}

async function fetchState(event_id: UUID): Promise<LiveState> {
  // Prefer active
  {
    const { data } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', event_id)
      .eq('state', 'active')
      .limit(1)
    if (data && data[0]) return { status: 'active', poll: data[0] as Poll }
  }
  // Else showing_results
  {
    const { data } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', event_id)
      .eq('state', 'showing_results')
      .order('results_until', { ascending: false })
      .limit(1)
    if (data && data[0]) return { status: 'results', poll: data[0] as Poll }
  }
  return { status: 'idle' }
}

function useOptions(pollId?: UUID) {
  const [options, setOptions] = useState<PollOption[]>([])
  useEffect(() => {
    if (!pollId) return
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', pollId)
        .order('order_index', { ascending: true })
      if (alive) setOptions((data ?? []) as any)
    })()
    return () => { alive = false }
  }, [pollId])
  return options
}

export default function OverlayLive() {
  const params = useSearchParams()
  const campusSlug = params.get('campus') || 'unknown'
  const eventParam = params.get('event') // may be null → fallback to latest
  const [eventId, setEventId] = useState<UUID | null>(null)
  const [state, setState] = useState<LiveState>({ status: 'loading' })
  const serverNowMs = useServerTime(250, 15000)

  // Bootstrap event selection
  useEffect(() => {
    let alive = true
    ;(async () => {
      setState({ status: 'loading' })
      if (eventParam) {
        setEventId(eventParam as UUID)
      } else {
        const campusId = await getCampusIdBySlug(campusSlug)
        if (!alive || !campusId) return setState({ status: 'idle' })
        const evtId = await getLatestEventId(campusId)
        if (!alive) return
        setEventId(evtId)
      }
    })()
    return () => { alive = false }
  }, [campusSlug, eventParam])

  // Load state and subscribe to changes
  useEffect(() => {
    if (!eventId) return
    let alive = true
    ;(async () => {
      const s = await fetchState(eventId)
      if (alive) setState(s)
    })()
    const ch = supabase
      .channel(`overlay:polls:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `event_id=eq.${eventId}` },
        async () => {
          const s = await fetchState(eventId)
          setState(s)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [eventId])

  const pollId = state.status === 'active' || state.status === 'results' ? state.poll.id : null
  const options = useOptions(pollId ?? undefined)

  // live counts (insert only)
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!pollId) return
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', pollId)
      if (!alive) return
      const init: Record<string, number> = {}
      for (const row of data ?? []) init[row.option_id] = (init[row.option_id] ?? 0) + 1
      setCounts(init)
    })()
    const ch = supabase
      .channel(`overlay:votes:${pollId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `poll_id=eq.${pollId}` },
        (payload) => {
          const opt = (payload.new as any).option_id as string
          setCounts(prev => ({ ...prev, [opt]: (prev[opt] ?? 0) + 1 }))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [pollId])

  const total = useMemo(() => Object.values(counts).reduce((a,b)=>a+b,0), [counts])

  // UI
  const bgStyle = { backgroundColor: '#00FF00' } // pure chroma key green

  if (state.status === 'loading') {
    return <main style={bgStyle} className="min-h-screen p-10 text-black">Loading…</main>
  }
  if (state.status === 'idle') {
    return (
      <main style={bgStyle} className="min-h-screen p-10 flex items-center">
        <h1 className="text-6xl font-bold">Get Ready</h1>
      </main>
    )
  }

  const question = state.poll.question
  const endsAt = state.status === 'active' ? state.poll.ends_at : null
  const duration = state.poll.duration_seconds

  return (
    <main style={bgStyle} className="min-h-screen p-10 flex">
      {/* Left: Question */}
      <div className="w-2/5 pr-10 flex flex-col justify-start gap-6">
        <h2 className="text-5xl font-extrabold leading-tight">{question}</h2>
        {state.status === 'active' && (
          <div className="max-w-md">
            <Countdown nowMs={serverNowMs} endsAtIso={endsAt} totalDurationSec={duration} />
          </div>
        )}
        {state.status === 'results' && (
          <p className="text-2xl font-semibold">Showing Results</p>
        )}
      </div>

      {/* Right: Bars */}
      <div className="w-3/5 flex flex-col justify-center gap-4">
        {options.map((o) => {
          const c = counts[o.id] ?? 0
          const pct = total > 0 ? Math.round((c / total) * 100) : 0
          return (
            <div key={o.id} className="w-full">
              <div className="flex justify-between text-2xl font-bold mb-1">
                <span>{o.label}</span>
                <span className="tabular-nums">{c} • {pct}%</span>
              </div>
              <div className="h-6 w-full bg-white rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, backgroundColor: '#000', transition: 'width 200ms linear' }}
                />
              </div>
            </div>
          )
        })}
        <div className="text-xl mt-4">Total Votes: <span className="tabular-nums font-bold">{total}</span></div>
      </div>
    </main>
  )
}

