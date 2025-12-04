'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { Poll, PollOption, UUID } from '@/types/db'
import { useServerTime } from '@/lib/useServerTime'
import Countdown, { formatSeconds } from '@/components/Countdown'
import LiveTally from '@/components/LiveTally'
import dynamic from 'next/dynamic'
const BannerTray = dynamic(() => import('@/components/BannerTray'), { ssr: false })

type LiveState =
  | { status: 'loading' }
  | { status: 'idle' } // no active poll yet
  | { status: 'active'; poll: Poll }

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

export default function OverlayLive() {
  const params = useSearchParams()
  const campusSlug = params.get('campus') || 'unknown'
  const eventParam = params.get('event') // may be null → fallback to latest
  const [eventId, setEventId] = useState<UUID | null>(null)
  const [state, setState] = useState<LiveState>({ status: 'loading' })
  const [correctAnswer, setCorrectAnswer] = useState<PollOption | null>(null)
  const serverNowMs = useServerTime(250, 15000) // smooth 4fps progress; resync every 15s

  // Bootstrap: campus -> latest event -> current poll state
  useEffect(() => {
    let alive = true
    ;(async () => {
      setState({ status: 'loading' })
      let evtId: UUID | null = null
      
      if (eventParam) {
        evtId = eventParam as UUID
      } else {
        // Only try to get campus if slug is not 'unknown'
        if (campusSlug && campusSlug !== 'unknown') {
          const campusId = await getCampusIdBySlug(campusSlug)
          if (!alive || !campusId) return setState({ status: 'idle' })
          evtId = await getLatestEventId(campusId)
          if (!alive || !evtId) return setState({ status: 'idle' })
        } else {
          // If no campus provided, try to get the latest event from any campus
          const { data: latestEvent } = await supabase
            .from('events')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (latestEvent) {
            evtId = latestEvent.id as UUID
          } else {
            return setState({ status: 'idle' })
          }
        }
      }
      
      if (!alive || !evtId) return setState({ status: 'idle' })
      
      setEventId(evtId)
      // Immediately fetch poll state
      const s = await fetchActiveOrRecentPoll(evtId)
      if (alive) setState(s)
    })()
    return () => { alive = false }
  }, [campusSlug, eventParam])

  // Realtime: subscribe to polls and events changes for this event
  useEffect(() => {
    if (!eventId) return
    const channel = supabase
      .channel(`overlay:polls:${eventId}`)
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
          console.log('[OverlayLive] Event updated, refreshing poll state...')
          const s = await fetchActiveOrRecentPoll(eventId)
          setState(s)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  // Periodically check event auto_advance status (every 3 seconds)
  // This ensures we catch changes even if realtime subscription doesn't fire
  // This will detect when game is turned on/off and switch between welcome screen and polls
  useEffect(() => {
    if (!eventId) return
    
    const interval = setInterval(async () => {
      const s = await fetchActiveOrRecentPoll(eventId)
      setState(s)
    }, 3000) // Check every 3 seconds
    
    return () => clearInterval(interval)
  }, [eventId])

  // Auto-advance polling (if event has auto_advance enabled)
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
              console.error('Auto-advance API error:', text)
            }
          } catch (err) {
            console.error('Auto-advance error:', err)
          }
        }, 1000) // Check every 1 second for faster transitions
      }
    })()
    
    return () => {
      alive = false
      if (interval) clearInterval(interval)
    }
  }, [eventId])

  // Fetch correct answer when poll changes and has correct_option_id
  useEffect(() => {
    if (state.status !== 'active' || !state.poll.correct_option_id) {
      setCorrectAnswer(null)
      return
    }
    
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('poll_options')
        .select('*')
        .eq('id', state.poll.correct_option_id)
        .single()
      
      if (alive && data) {
        setCorrectAnswer(data as PollOption)
      }
    })()
    return () => { alive = false }
  }, [state.status === 'active' ? state.poll.id : null, state.status === 'active' ? state.poll.correct_option_id : null])

  const content = useMemo(() => {
    if (state.status === 'loading') {
      return <p className="opacity-70" style={{ color: '#385D75' }}>Loading current question…</p>
    }
    if (state.status === 'idle') {
      return (
        <div className="flex flex-col items-center space-y-10 w-full px-4 relative">
          <h1 
            className="text-3xl md:text-4xl font-bold text-center relative z-10"
            style={{ 
              color: '#D8A869', 
              fontFamily: 'Forum, serif',
              letterSpacing: '0.02em',
              animation: 'fadeInUp 1s ease-out',
              textShadow: '0 2px 8px rgba(216, 168, 105, 0.2)',
            }}
          >
            Welcome to
          </h1>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 w-full max-w-5xl relative z-10">
            <div 
              className="flex-shrink-0 order-2 md:order-1"
              style={{ 
                animation: 'fadeInUp 1.2s ease-out 0.2s both',
              }}
            >
              <img 
                src="/Manger-Scene-Pic.png" 
                alt="Manger Scene" 
                className="max-w-[200px] md:max-w-xs h-auto transition-all duration-300"
                style={{ 
                  maxHeight: '300px',
                  animation: 'floatUp 4s ease-in-out infinite, subtleGlow 3s ease-in-out infinite',
                }}
              />
            </div>
            <div 
              className="flex-shrink-0 order-1 md:order-2"
              style={{ 
                animation: 'fadeInUp 1.2s ease-out 0.4s both',
              }}
            >
              <img 
                src="/Christmas-Header.png" 
                alt="Christmas Header" 
                className="max-w-[280px] md:max-w-md h-auto transition-all duration-300"
                style={{
                  animation: 'floatUp 4s ease-in-out infinite 0.6s, subtleGlow 3s ease-in-out infinite 0.3s',
                }}
              />
            </div>
          </div>
          
          {/* Game Starting Soon Animation - centered below images */}
          <div 
            className="px-8 py-4 rounded-2xl backdrop-blur-md text-center"
            style={{
              border: '1px solid rgba(216, 168, 105, 0.3)',
              backgroundColor: 'rgba(242, 247, 247, 0.7)',
              boxShadow: '0 12px 40px -12px rgba(216, 168, 105, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              animation: 'gentlePulse 4s ease-in-out infinite, fadeInUp 1.4s ease-out 0.6s both',
              position: 'relative',
              overflow: 'hidden',
              maxWidth: '400px',
              margin: '0 auto',
            }}
          >
            {/* Shimmer effect */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(216, 168, 105, 0.25) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 4s ease-in-out infinite',
              }}
            />
            
            {/* Subtle inner glow */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(216, 168, 105, 0.1) 0%, transparent 70%)',
                animation: 'breathe 5s ease-in-out infinite',
              }}
            />
            
            <p 
              className="text-lg md:text-xl font-semibold relative z-10"
              style={{ 
                color: '#385D75',
                fontFamily: 'Forum, serif',
                letterSpacing: '0.08em',
                fontWeight: 500,
              }}
            >
              Game Starting Soon...
            </p>
          </div>
        </div>
      )
    }
    if (state.status === 'active') {
      const isTimerEnded = state.poll.ends_at ? serverNowMs >= Date.parse(state.poll.ends_at) : false
      const isShowingResults = state.poll.state === 'showing_results' || isTimerEnded
      const nextQuestionAt = state.poll.results_until
      
      // If showing results and we have a correct answer, show the animated answer display
      if (isShowingResults && correctAnswer) {
        return (
          <div className="space-y-8">
            <div className="space-y-4 text-center animate-fadeIn">
              <p className="text-sm uppercase tracking-wider opacity-80 font-medium" style={{ color: '#385D75' }}>The Answer Is</p>
              <div 
                className="inline-block px-12 py-8 rounded-2xl backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.3)',
                  border: '3px solid rgba(34, 197, 94, 0.8)',
                  boxShadow: '0 20px 60px -12px rgba(34, 197, 94, 0.5), 0 0 0 1px rgba(34, 197, 94, 0.2)',
                  animation: 'correctAnswerPulse 2s ease-in-out infinite, fadeInScale 0.8s ease-out',
                }}
              >
                <h2 
                  className="text-5xl font-bold leading-tight"
                  style={{ 
                    color: '#22C55E',
                    fontFamily: 'Forum, serif',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {correctAnswer.label}
                </h2>
              </div>
              {nextQuestionAt && (
                <div className="text-lg tabular-nums font-medium" style={{ color: '#385D75' }}>
                  Next question in: <span className="font-bold" style={{ color: '#D8A869' }}>{formatSeconds(Math.max(0, Date.parse(nextQuestionAt) - serverNowMs))}</span>
                </div>
              )}
            </div>
            <LiveTally pollId={state.poll.id} />
          </div>
        )
      }
      
      // Normal display during voting
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-80 font-medium" style={{ color: '#385D75' }}>Current Question</p>
            <h2 className="text-3xl font-bold leading-tight" style={{ color: '#D8A869', fontFamily: 'Forum, serif', fontSize: '1.6em' }}>{state.poll.question}</h2>
          </div>
          <Countdown
            nowMs={serverNowMs}
            endsAtIso={state.poll.ends_at}
            totalDurationSec={state.poll.duration_seconds}
          />
          <LiveTally pollId={state.poll.id} />
        </div>
      )
    }
    return null
  }, [state, serverNowMs])

  return (
    <section className={`w-full max-w-2xl mx-auto p-6 ${state.status === 'idle' ? 'flex flex-col items-center justify-center min-h-[calc(100vh-3rem)]' : ''}`}>
      {content}
      {eventId ? <BannerTray eventId={eventId} /> : null}
    </section>
  )
}
