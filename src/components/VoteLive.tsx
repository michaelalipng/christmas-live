'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Poll, UUID } from '@/types/db'
import { useServerTime } from '@/lib/useServerTime'
import Countdown, { formatSeconds } from '@/components/Countdown'
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
  // First check if the game is active (auto_advance enabled)
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('auto_advance')
    .eq('id', event_id)
    .single()
  
  if (eventError) {
    console.warn('Error checking event auto_advance:', eventError)
  }
  
  // Only show polls if the game is active
  if (!eventData?.auto_advance) {
    return { status: 'idle' }
  }
  
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

  // Then try showing_results (recent) - treat as active so we can show results
  {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', event_id)
      .eq('state', 'showing_results')
      .order('results_until', { ascending: false, nullsFirst: false })
      .limit(1)
    if (error) console.warn('fetch results poll error', error)
    if (data && data[0]) return { status: 'active', poll: data[0] as Poll }
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

  // Realtime: subscribe to polls and events changes for this event
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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        async () => {
          const s = await fetchActiveOrRecentPoll(eventId)
          setState(s)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  // Auto-advance polling (if event has auto_advance enabled)
  // This ensures polls continue advancing even if moderator page is closed
  useEffect(() => {
    if (!eventId) return
    
    let alive = true
    let interval: NodeJS.Timeout | null = null
    
    // Check if event has auto_advance enabled
    ;(async () => {
      const { data: eventData } = await supabase
        .from('events')
        .select('auto_advance')
        .eq('id', eventId)
        .single()
      
      if (eventData?.auto_advance && alive) {
        // Poll for auto-advance every 1 second for more responsive transitions
        interval = setInterval(async () => {
          if (!alive) {
            if (interval) clearInterval(interval)
            return
          }
          
          try {
            // Call auto-advance endpoint (no auth needed for this check)
            const res = await fetch('/api/mod/auto-advance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event_id: eventId }),
            })
            if (!res.ok) {
              const text = await res.text()
              console.error('[VoteLive] Auto-advance API error:', text)
            }
          } catch (err) {
            console.error('[VoteLive] Auto-advance error:', err)
          }
        }, 1000) // Check every 1 second for faster transitions
      }
    })()
    
    return () => {
      alive = false
      if (interval) clearInterval(interval)
    }
  }, [eventId])

  const content = useMemo(() => {
    if (state.status === 'loading') {
      return <p className="opacity-70" style={{ color: '#385D75' }}>Loading current question…</p>
    }
    if (state.status === 'idle') {
      return (
        <div className="flex flex-col items-center space-y-6 w-full px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-center" style={{ color: '#D8A869', fontFamily: 'Forum, serif' }}>
            Welcome to
          </h1>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full max-w-5xl">
            <div className="flex-shrink-0 order-2 md:order-1">
              <img 
                src="/Manger-Scene-Pic.png" 
                alt="Manger Scene" 
                className="max-w-[200px] md:max-w-xs h-auto"
                style={{ maxHeight: '300px' }}
              />
            </div>
            <div className="flex-shrink-0 order-1 md:order-2">
              <img 
                src="/Christmas-Header.png" 
                alt="Christmas Header" 
                className="max-w-[280px] md:max-w-md h-auto"
              />
            </div>
          </div>
        </div>
      )
    }
    if (state.status === 'active') {
      const isTimerEnded = state.poll.ends_at ? serverNowMs >= Date.parse(state.poll.ends_at) : false
      const isShowingResults = state.poll.state === 'showing_results' || isTimerEnded
      const nextQuestionAt = state.poll.results_until
      
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-80 font-medium" style={{ color: '#385D75' }}>Current Question</p>
            <h2 className="text-3xl font-bold leading-tight" style={{ color: '#D8A869', fontFamily: 'Forum, serif', fontSize: '1.6em' }}>{state.poll.question}</h2>
          </div>
          {!isShowingResults && (
            <Countdown
              nowMs={serverNowMs}
              endsAtIso={state.poll.ends_at}
              totalDurationSec={state.poll.duration_seconds}
            />
          )}
          {isShowingResults && nextQuestionAt && (
            <div className="w-full space-y-3">
              <div className="text-base tabular-nums font-medium text-center" style={{ color: '#385D75' }}>
                Next question in: <span className="font-bold" style={{ color: '#D8A869' }}>{formatSeconds(Math.max(0, Date.parse(nextQuestionAt) - serverNowMs))}</span>
              </div>
            </div>
          )}
          <VoteOptions 
            pollId={state.poll.id} 
            correctOptionId={state.poll.correct_option_id}
            endsAtIso={state.poll.ends_at}
            serverNowMs={serverNowMs}
          />
          <LiveTally pollId={state.poll.id} />
        </div>
      )
    }
    return null
  }, [state, serverNowMs])

  return (
    <section className="w-full max-w-2xl mx-auto p-6">
      {content}
      {eventId ? <BannerTray eventId={eventId} /> : null}
    </section>
  )
}
