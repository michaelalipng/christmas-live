'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { Poll, PollOption, UUID } from '@/types/db'
import dynamic from 'next/dynamic'
const BannerTray = dynamic(() => import('@/components/BannerTray'), { ssr: false })

type Counts = Record<string, number>

async function getCampusIdBySlug(slug: string): Promise<UUID | null> {
  const { data } = await supabase.from('campuses').select('id').eq('slug', slug).maybeSingle()
  return (data as any)?.id ?? null
}

async function latestEventId(campus_id: UUID): Promise<UUID | null> {
  const { data } = await supabase.from('events').select('id, created_at').eq('campus_id', campus_id).order('created_at', { ascending: false }).limit(1)
  return data?.[0]?.id ?? null
}

export default function ResultsWall() {
  const params = useSearchParams()
  const campusSlug = params.get('campus') || 'ascension'
  const eventParam = params.get('event') // optional override
  const [eventId, setEventId] = useState<UUID | null>(null)
  const [poll, setPoll] = useState<Poll | null>(null)
  const [options, setOptions] = useState<PollOption[]>([])
  const [counts, setCounts] = useState<Counts>({})

  // pick event
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (eventParam) { setEventId(eventParam as UUID); return }
      const campusId = await getCampusIdBySlug(campusSlug)
      if (!alive || !campusId) return
      const eid = await latestEventId(campusId)
      if (!alive) return
      setEventId(eid)
    })()
    return () => { alive = false }
  }, [campusSlug, eventParam])

  // load latest "results" poll snapshot
  async function loadLatestResults(eid: UUID) {
    const { data: p } = await supabase
      .from('latest_poll_for_event')
      .select('*')
      .eq('event_id', eid)
      .limit(1)
    const pollRow = (p as any)?.[0] as Poll | undefined
    if (!pollRow) { setPoll(null); setOptions([]); setCounts({}); return }
    setPoll(pollRow)
    const [{ data: opts }, { data: votes }] = await Promise.all([
      supabase.from('poll_options').select('*').eq('poll_id', pollRow.id).order('order_index', { ascending: true }),
      supabase.from('votes').select('option_id').eq('poll_id', pollRow.id),
    ])
    setOptions((opts ?? []) as any)
    const init: Counts = {}
    for (const v of votes ?? []) init[(v as any).option_id] = (init[(v as any).option_id] ?? 0) + 1
    setCounts(init)
  }

  // bootstrap + subscribe to polls changes for updates
  useEffect(() => {
    if (!eventId) return
    let alive = true
    ;(async () => { await loadLatestResults(eventId) })()
    const ch = supabase
      .channel(`results:polls:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `event_id=eq.${eventId}` },
        async () => { if (alive) await loadLatestResults(eventId) }
      )
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [eventId])

  // also subscribe to votes inserts for the currently shown poll, if any
  useEffect(() => {
    if (!poll) return
    const ch = supabase
      .channel(`results:votes:${poll.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `poll_id=eq.${poll.id}` },
        (payload) => {
          const opt = (payload.new as any).option_id as string
          setCounts(prev => ({ ...prev, [opt]: (prev[opt] ?? 0) + 1 }))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [poll?.id])

  const total = useMemo(() => Object.values(counts).reduce((a,b)=>a+b,0), [counts])

  return (
    <main className="min-h-screen p-10 flex flex-col items-center bg-white text-black">
      <div className="w-full max-w-5xl">
        <h1 className="text-4xl font-extrabold mb-6">Latest Results</h1>
        {!poll ? (
          <div className="text-2xl opacity-70">Nothing to show yet</div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-snug">{poll.question}</h2>
            <div className="text-lg">Total Votes: <span className="font-semibold tabular-nums">{total}</span></div>
            <div className="grid gap-4">
              {options.map(o => {
                const c = counts[o.id] ?? 0
                const pct = total > 0 ? Math.round((c / total) * 100) : 0
                return (
                  <div key={o.id}>
                    <div className="flex justify-between text-2xl font-bold mb-1">
                      <span>{o.label}</span>
                      <span className="tabular-nums">{c} • {pct}%</span>
                    </div>
                    <div className="h-6 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: '#000', transition: 'width 200ms linear' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {eventId ? <BannerTray eventId={eventId} /> : null}
    </main>
  )
}

