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
        <div className="flex flex-col items-center space-y-6 w-full px-6 relative">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full relative z-10 px-2">
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
          <div className="space-y-8 w-full px-6">
            <div className="space-y-4 text-center animate-fadeIn px-2">
              <p className="text-xl uppercase tracking-wider opacity-80 font-medium" style={{ color: '#385D75' }}>The Answer Is</p>
              <div className="flex justify-center w-full px-2">
                <div 
                  className="inline-block px-6 py-5 rounded-2xl backdrop-blur-md max-w-full"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.3)',
                    border: '3px solid rgba(34, 197, 94, 0.8)',
                    boxShadow: '0 20px 60px -12px rgba(34, 197, 94, 0.5), 0 0 0 1px rgba(34, 197, 94, 0.2)',
                    animation: 'correctAnswerPulse 2s ease-in-out infinite, fadeInScale 0.8s ease-out',
                    overflow: 'visible',
                  }}
                >
                  <h2 
                    className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight break-words px-2"
                    style={{ 
                      color: '#22C55E',
                      fontFamily: 'Forum, serif',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {correctAnswer.label}
                  </h2>
                </div>
              </div>
              {nextQuestionAt && (
                <div className="text-2xl tabular-nums font-medium px-2" style={{ color: '#385D75' }}>
                  Next question in: <span className="font-bold" style={{ color: '#D8A869' }}>{formatSeconds(Math.max(0, Date.parse(nextQuestionAt) - serverNowMs))}</span>
                </div>
              )}
            </div>
            <div className="px-4">
              <LiveTally pollId={state.poll.id} />
            </div>
          </div>
        )
      }
      
      // Normal display during voting
      return (
        <div className="space-y-6 w-full px-4" style={{ marginTop: '-8vh' }}>
          <div className="space-y-3">
            <p className="text-lg uppercase tracking-wider opacity-80 font-medium text-center" style={{ color: '#385D75' }}>Current Question</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-center break-words" style={{ color: '#D8A869', fontFamily: 'Forum, serif', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{state.poll.question}</h2>
          </div>
          <div className="flex justify-center px-2">
            <Countdown
              nowMs={serverNowMs}
              endsAtIso={state.poll.ends_at}
              totalDurationSec={state.poll.duration_seconds}
            />
          </div>
          <div className="px-2">
            <LiveTally pollId={state.poll.id} />
          </div>
        </div>
      )
    }
    return null
  }, [state, serverNowMs])

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden">
      {/* Main Content Area - Top portion */}
      <section className={`flex-1 flex flex-col items-center overflow-visible min-h-0 relative z-10 ${state.status === 'idle' ? 'max-w-6xl mx-auto w-full justify-center p-6 pb-8 pt-16' : state.status === 'active' ? 'max-w-5xl mx-auto justify-start p-6 pb-8 pt-[18vh]' : 'max-w-2xl mx-auto justify-center p-6 pb-8 pt-16'}`}>
        <div className={`w-full flex flex-col items-center overflow-visible px-2 ${state.status === 'active' ? 'h-auto' : 'h-full justify-center'}`}>
          {content}
        </div>
        {eventId ? <BannerTray eventId={eventId} /> : null}
      </section>
      
      {/* QR Code Section - Footer */}
      <footer 
        className="flex items-end justify-center gap-8 px-8 backdrop-blur-md w-full flex-shrink-0"
        style={{
          borderTop: '1px solid rgba(56, 93, 117, 0.3)',
          backgroundColor: 'rgba(242, 247, 247, 0.8)',
          boxShadow: '0 -8px 32px 0 rgba(31, 38, 135, 0.2)',
          paddingTop: '0.5rem',
          paddingBottom: '0.75rem',
          height: '6.25vh',
          minHeight: '6.25vh',
        }}
      >
        <div className="flex items-end justify-between gap-8 w-full max-w-7xl relative px-4 pb-1">
          <h2 
            className="font-bold flex-1"
            style={{ 
              color: '#385D75', 
              fontFamily: 'Forum, serif',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              fontSize: 'clamp(2.5rem, 7vw, 7rem)',
              lineHeight: '1.1',
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em',
            }}
          >
            Scan to Join the game!
          </h2>
          <div className="flex-shrink-0 relative">
            <img 
              src="/Christmas Trivia QR Code.jpg" 
              alt="QR Code to join the game" 
              className="h-36 md:h-44 w-auto rounded-lg shadow-xl"
              style={{
                border: '2px solid rgba(56, 93, 117, 0.2)',
                transform: 'translateY(-10px)',
                maxWidth: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}
