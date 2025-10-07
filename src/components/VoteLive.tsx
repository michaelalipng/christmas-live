'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Poll, UUID } from '@/types/db'
import { useServerTime } from '@/lib/useServerTime'
import Countdown from '@/components/Countdown'
import PreviousResults from '@/components/PreviousResults'
import VoteOptions from '@/components/VoteOptions'
import LiveTally from '@/components/LiveTally'
import dynamic from 'next/dynamic'
const BannerTray = dynamic(() => import('@/components/BannerTray'), { ssr: false })

type LiveState =
  | { status: 'loading' }
  | { status: 'idle' } // no active poll yet
  | { status: 'active'; poll: Poll }
  | { status: 'results'; poll: Poll }

async function getCampusIdBySlug(slug: string): Promise<UUID | null> {
  const { data, error } = await supabase
    .from('campuses')
    .select('id')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()
  if (error) {
    console.warn('campus lookup error', error)
    return null
  }
  return data?.id ?? null
}

async function getLatestEventId(campus_id: UUID): Promise<UUID | null> {
  const { data, error } = await supabase
    .from('events')
    .select('id, created_at')
    .eq('campus_id', campus_id)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) {
    console.warn('events lookup error', error)
    return null
  }
  return data?.[0]?.id ?? null
}

async function fetchActiveOrRecentPoll(event_id: UUID): Promise<LiveState> {
  // Try active first
  {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', event_id)
      .eq('state', 'active')
      .limit(1)
    if (error) console.warn('fetch active poll error', error)
    if (data && data[0]) return { status: 'active', poll: data[0] as Poll }
  }

  // Then try showing_results (recent)
  {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', event_id)
      .eq('state', 'showing_results')
      .order('results_until', { ascending: false, nullsFirst: false })
      .limit(1)
    if (error) console.warn('fetch results poll error', error)
    if (data && data[0]) return { status: 'results', poll: data[0] as Poll }
  }

  return { status: 'idle' }
}

export default function VoteLive({ campusSlug }: { campusSlug: string }) {
  const [state, setState] = useState<LiveState>({ status: 'loading' })
  const [eventId, setEventId] = useState<UUID | null>(null)
  const serverNowMs = useServerTime(250, 15000) // smooth 4fps progress; resync every 15s

  // Bootstrap: campus -> latest event -> current poll state
  useEffect(() => {
    let alive = true
    ;(async () => {
      setState({ status: 'loading' })
      const campusId = await getCampusIdBySlug(campusSlug)
      if (!alive || !campusId) return setState({ status: 'idle' })
      const evtId = await getLatestEventId(campusId)
      if (!alive || !evtId) return setState({ status: 'idle' })
      setEventId(evtId)
      const s = await fetchActiveOrRecentPoll(evtId)
      if (alive) setState(s)
    })()
    return () => { alive = false }
  }, [campusSlug])

  // Realtime: subscribe to polls changes for this event
  useEffect(() => {
    if (!eventId) return
   const channel = supabase
      .channel(`polls:event:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `event_id=eq.${eventId}` },
        async () => {
          const s = await fetchActiveOrRecentPoll(eventId)
          setState(s)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  const content = useMemo(() => {
    if (state.status === 'loading') {
      return <p className="opacity-70">Loading current question…</p>
    }
    if (state.status === 'idle') {
      return <p className="opacity-70">Get Ready</p>
    }
    if (state.status === 'active') {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide opacity-70">Current Question</p>
            <h2 className="text-2xl font-semibold">{state.poll.question}</h2>
          </div>
          <Countdown
            nowMs={serverNowMs}
            endsAtIso={state.poll.ends_at}
            totalDurationSec={state.poll.duration_seconds}
          />
          <VoteOptions pollId={state.poll.id} />
          <LiveTally pollId={state.poll.id} />
        </div>
      )
    }
    if (state.status === 'results') {
      return (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide opacity-70">Showing Results</p>
          <h2 className="text-2xl font-semibold">{state.poll.question}</h2>
        </div>
      )
    }
    return null
  }, [state, serverNowMs])

  return (
    <section className="w-full max-w-2xl mx-auto p-6">
      {content}
      {eventId && <PreviousResults eventId={eventId} />}
      {eventId ? <BannerTray eventId={eventId} /> : null}
    </section>
  )
}
