'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useServerTime } from '@/lib/useServerTime'
import type { Poll, PollOption, UUID } from '@/types/db'

type IdRow = { id: UUID }

async function latestEventId(campusSlug: string): Promise<UUID | null> {
  const { data: campus } = await supabase.from('campuses').select('id').eq('slug', campusSlug).maybeSingle()
  if (!(campus as IdRow | null)?.id) return null
  const { data: events } = await supabase.from('events').select('id, created_at').eq('campus_id', (campus as IdRow).id).order('created_at', { ascending: false }).limit(1)
  return (events as IdRow[] | null)?.[0]?.id ?? null
}

export default function ModeratorPanel({ campusSlug }: { campusSlug: string }) {
  const [eventId, setEventId] = useState<UUID | null>(null)
  const [polls, setPolls] = useState<Poll[]>([])
  const [active, setActive] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN // convenience for client calls
  const [bTitle, setBTitle] = useState('')
  const [bBody, setBBody] = useState('')
  const [bType, setBType] = useState<'link'|'share'|'sms'|'none'>('link')
  const [bLabel, setBLabel] = useState('Open')
  const [bPayload, setBPayload] = useState('')
  const [bSmsMessage, setBSmsMessage] = useState('')
  const [bSmsUrl, setBSmsUrl] = useState('')
  const [bDuration, setBDuration] = useState<number>(10)

  // Poll management state
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', ''])
  const [newPollCorrectIndex, setNewPollCorrectIndex] = useState<number | null>(null)
  const [pollOptions, setPollOptions] = useState<Record<UUID, PollOption[]>>({})
  const [expandedPolls, setExpandedPolls] = useState<Set<UUID>>(new Set())
  const [addingOptionToPoll, setAddingOptionToPoll] = useState<UUID | null>(null)
  const [newOptionLabel, setNewOptionLabel] = useState('')
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(false)
  const [eventDuration, setEventDuration] = useState<number>(30)
  const [eventResults, setEventResults] = useState<number>(10)
  const [isUpdatingResults, setIsUpdatingResults] = useState(false)
  const [gameEndTime, setGameEndTime] = useState<string>('')
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [showBannerModal, setShowBannerModal] = useState(false)
  
  // Clock display
  const serverTimeMs = useServerTime(1000, 15000)
  const [currentTime, setCurrentTime] = useState<string>('')
  
  useEffect(() => {
    const updateTime = () => {
      const date = new Date(serverTimeMs)
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      setCurrentTime(`${hours}:${minutes}:${seconds}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [serverTimeMs])

  const refreshPolls = useCallback(async () => {
    if (!eventId) return
    console.log('[moderator] Refreshing polls for event:', eventId)
    const { data, error: pollsError } = await supabase.from('polls').select('*').eq('event_id', eventId).order('created_at', { ascending: true })
    if (pollsError) {
      console.error('[moderator] Error fetching polls:', pollsError)
    }
    setPolls((data ?? []) as unknown as Poll[])
    console.log(`[moderator] Found ${data?.length || 0} total polls`)
    
    // Check for active polls with more detailed logging
    const { data: a, error: activeError } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', eventId)
      .eq('state', 'active')
      .limit(1)
    
    if (activeError) {
      console.error('[moderator] Error fetching active poll:', activeError)
    }
    
    const activePoll = ((a ?? [])[0] as Poll) ?? null
    setActive(activePoll)
    if (activePoll) {
      const timeUntilEnd = activePoll.ends_at ? new Date(activePoll.ends_at).getTime() - Date.now() : null
      console.log(`[moderator] Active poll found: ${activePoll.id} - "${activePoll.question}" (ends at ${activePoll.ends_at}, ${timeUntilEnd ? Math.round(timeUntilEnd / 1000) + 's remaining' : 'no end time'})`)
    } else {
      console.log('[moderator] No active poll found')
      // Log all poll states for debugging
      if (data && data.length > 0) {
        const states = data.map(p => {
          const poll = p as Poll
          return `${poll.id.substring(0, 8)}: ${poll.state}${poll.ends_at ? ` (ends ${new Date(poll.ends_at).toLocaleTimeString()})` : ''}`
        }).join(', ')
        console.log(`[moderator] Poll states: ${states}`)
      }
    }
    
    // Check event settings
    // Note: If duration/results columns don't exist, use defaults
    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('auto_advance, duration_seconds, results_seconds, game_ends_at, game_ended')
        .eq('id', eventId)
        .single()
      if (eventData) {
        setAutoAdvanceEnabled(eventData.auto_advance ?? false)
        setEventDuration(eventData.duration_seconds ?? 30)
        // Only update results_seconds if not currently updating and value is not 150 (likely stale)
        if (!isUpdatingResults && eventData.results_seconds !== 150) {
          setEventResults(eventData.results_seconds ?? 10)
        }
        setGameEnded(eventData.game_ended ?? false)
        // Convert UTC game_ends_at to CST time string (HH:MM format)
        if (eventData.game_ends_at) {
          const utcDate = new Date(eventData.game_ends_at)
          // Convert UTC to CST (UTC-6)
          const cstDate = new Date(utcDate.getTime() - (6 * 60 * 60 * 1000))
          const hours = String(cstDate.getUTCHours()).padStart(2, '0')
          const minutes = String(cstDate.getUTCMinutes()).padStart(2, '0')
          setGameEndTime(`${hours}:${minutes}`)
        } else {
          setGameEndTime('')
        }
      }
    } catch {
      // Columns don't exist yet, use defaults
      const { data: eventData } = await supabase
        .from('events')
        .select('auto_advance, game_ends_at, game_ended')
        .eq('id', eventId)
        .single()
      if (eventData) {
        setAutoAdvanceEnabled(eventData.auto_advance ?? false)
        setGameEnded(eventData.game_ended ?? false)
        // Convert UTC game_ends_at to CST time string (HH:MM format)
        if (eventData.game_ends_at) {
          const utcDate = new Date(eventData.game_ends_at)
          // Convert UTC to CST (UTC-6)
          const cstDate = new Date(utcDate.getTime() - (6 * 60 * 60 * 1000))
          const hours = String(cstDate.getUTCHours()).padStart(2, '0')
          const minutes = String(cstDate.getUTCMinutes()).padStart(2, '0')
          setGameEndTime(`${hours}:${minutes}`)
        } else {
          setGameEndTime('')
        }
      }
      setEventDuration(30)
      setEventResults(10)
    }
    
    // Refresh options for all polls
    if (data && data.length > 0) {
      const pollIds = data.map(p => p.id)
      const { data: allOptions } = await supabase
        .from('poll_options')
        .select('*')
        .in('poll_id', pollIds)
        .order('created_at', { ascending: true })
      
      const optionsMap: Record<UUID, PollOption[]> = {}
      for (const opt of (allOptions ?? []) as PollOption[]) {
        if (!optionsMap[opt.poll_id]) optionsMap[opt.poll_id] = []
        optionsMap[opt.poll_id].push(opt)
      }
      setPollOptions(optionsMap)
    }
  }, [eventId])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const eid = await latestEventId(campusSlug)
      if (!alive) return
      setEventId(eid)
      if (!eid) return setLoading(false)
      
      // Immediately fetch event's auto_advance status
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('auto_advance, duration_seconds, results_seconds')
          .eq('id', eid)
          .single()
        if (eventData && alive) {
          setAutoAdvanceEnabled(eventData.auto_advance ?? false)
          setEventDuration(eventData.duration_seconds ?? 30)
          if (!isUpdatingResults) {
            setEventResults(eventData.results_seconds ?? 10)
          }
        }
      } catch {
        // Try without duration/results columns
        try {
          const { data: eventData } = await supabase
            .from('events')
            .select('auto_advance')
            .eq('id', eid)
            .single()
          if (eventData && alive) {
            setAutoAdvanceEnabled(eventData.auto_advance ?? false)
          }
        } catch {
          // Ignore errors, will be set by refreshPolls
        }
      }
      
      // Load initial polls
      const { data } = await supabase.from('polls').select('*').eq('event_id', eid).order('created_at', { ascending: true })
      if (alive) {
        setPolls((data ?? []) as unknown as Poll[])
        const { data: a } = await supabase.from('polls').select('*').eq('event_id', eid).eq('state', 'active').limit(1)
        setActive(((a ?? [])[0] as Poll) ?? null)
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [campusSlug])

  // Subscribe to poll changes for real-time updates
  useEffect(() => {
    if (!eventId) return
    const channel = supabase
      .channel(`moderator:polls:${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polls',
        filter: `event_id=eq.${eventId}`,
      }, () => {
        refreshPolls()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, refreshPolls])

  // Subscribe to event changes (for auto_advance status)
  useEffect(() => {
    if (!eventId) return
    const channel = supabase
      .channel(`moderator:events:${eventId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${eventId}`,
      }, (payload) => {
        const newData = payload.new as { auto_advance?: boolean; duration_seconds?: number; results_seconds?: number; game_ended?: boolean }
        if (newData.auto_advance !== undefined) {
          setAutoAdvanceEnabled(newData.auto_advance)
        }
        if (newData.duration_seconds !== undefined) {
          setEventDuration(newData.duration_seconds)
        }
        if (newData.results_seconds !== undefined && !isUpdatingResults && newData.results_seconds !== 150) {
          setEventResults(newData.results_seconds)
        }
        if (newData.game_ended !== undefined) {
          setGameEnded(newData.game_ended)
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  // Call refreshPolls when eventId is set
  useEffect(() => {
    if (eventId) {
      refreshPolls()
    }
  }, [eventId, refreshPolls])

  // Auto-advance polling (client-side polling since we removed cron jobs)
  useEffect(() => {
    if (!autoAdvanceEnabled || !eventId) return
    
    const interval = setInterval(async () => {
      const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
      try {
        const res = await fetch('/api/mod/auto-advance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken ?? '',
          },
          body: JSON.stringify({ event_id: eventId }),
        })
        if (res.ok) {
          await refreshPolls()
        } else {
          const text = await res.text()
          let errorMsg = text
          try {
            const json = JSON.parse(text)
            errorMsg = json.error || text
          } catch {
            // Not JSON, use text as-is
          }
          console.error('Auto-advance API error:', errorMsg)
          // Only show error in UI if it's not a transient error
          if (!errorMsg.includes('Event not found') && !errorMsg.includes('no_change')) {
            setLastError(`Auto-advance: ${errorMsg}`)
          }
        }
      } catch (err) {
        console.error('Auto-advance error:', err)
      }
    }, 1000) // Check every 1 second for faster transitions
    
    return () => clearInterval(interval)
  }, [autoAdvanceEnabled, eventId, refreshPolls])

  async function call(path: string, body: Record<string, unknown>) {
    setLastError(null)

    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken ?? '',
        },
        body: JSON.stringify(body),
      })

      const text = await res.text()

      if (!res.ok) {
        let msg = text
        try {
          const json = JSON.parse(text)
          msg = json.error || json.message || text || `HTTP ${res.status} ${res.statusText}`
        } catch {
          msg = text || `HTTP ${res.status} ${res.statusText}`
        }
        console.error('Moderator API error', { path, status: res.status, msg, text })
        // Try to parse error message from response
        let errorMsg = msg
        try {
          const errorJson = JSON.parse(text)
          if (errorJson.error) {
            errorMsg = errorJson.error
          }
        } catch {
          // Not JSON, use text as is
        }
        setLastError(`${path}: ${errorMsg}`)
        return null
      }

      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Moderator API exception', { path, msg })
      setLastError(`${path}: ${msg}`)
      return null
    }
  }

  async function pushBanner() {
    if (!eventId) return
    
    // For SMS, combine message and URL
    let finalPayload = bPayload
    if (bType === 'sms') {
      const parts = [bSmsMessage, bSmsUrl].filter(Boolean)
      finalPayload = parts.join(' ')
    }
    
    const result = await call('/api/banner/push', {
      event_id: eventId,
      title: bTitle,
      body: bBody || null,
      cta_label: bLabel || null,
      cta_type: bType === 'none' ? null : bType,
      cta_payload: finalPayload || null,
      duration_sec: bDuration || null,
    })
    if (result !== null) {
      setBTitle(''); setBBody(''); setBPayload(''); setBSmsMessage(''); setBSmsUrl('')
    }
  }
  async function clearBanner() {
    if (!eventId) return
    await call('/api/banner/clear', { event_id: eventId })
  }

  if (loading) return <p>Loading…</p>
  if (!eventId) return <p>No event found.</p>

  return (
    <div className="space-y-4">
      {/* Header with Home Button and Clock */}
      <div className="flex justify-between items-center mb-4">
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border-2 font-semibold transition-colors"
          style={{
            borderColor: 'rgba(56, 93, 117, 0.3)',
            backgroundColor: 'rgba(242, 247, 247, 0.9)',
            color: '#385D75',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
            e.currentTarget.style.color = 'white'
            e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.9)'
            e.currentTarget.style.color = '#385D75'
            e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
          }}
        >
          ← Home
        </Link>
        <div className="text-2xl font-mono font-bold" style={{ color: '#385D75' }}>
          {currentTime}
        </div>
      </div>

      {lastError && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          Moderator error: {lastError}
        </div>
      )}
      {!adminToken && (
        <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          ⚠️ Warning: NEXT_PUBLIC_ADMIN_TOKEN is not set. API calls will fail. Please set this environment variable.
        </div>
      )}
      {polls.length === 0 && (
        <div className="text-sm text-yellow-600">⚠️ No polls found. Create at least one poll before starting the game.</div>
      )}

      {/* Banner Modal Button */}
      <button
        onClick={() => setShowBannerModal(true)}
        className="px-4 py-2 rounded-lg border-2 font-semibold transition-colors"
        style={{
          borderColor: 'rgba(56, 93, 117, 0.3)',
          backgroundColor: 'rgba(242, 247, 247, 0.9)',
          color: '#385D75',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
          e.currentTarget.style.color = 'white'
          e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.9)'
          e.currentTarget.style.color = '#385D75'
          e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
        }}
      >
        Banner Builder
      </button>

      {/* Banner Modal */}
      {showBannerModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowBannerModal(false)}
        >
          <div 
            className="border rounded-xl p-6 space-y-3 bg-white max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-xl">Banner Settings</h3>
              <button
                onClick={() => setShowBannerModal(false)}
                className="text-2xl font-bold text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <input value={bTitle} onChange={e=>setBTitle(e.target.value)} placeholder="Title" className="border rounded px-2 py-1" />
              <input value={bBody} onChange={e=>setBBody(e.target.value)} placeholder="Body (optional)" className="border rounded px-2 py-1" />
              <select value={bType} onChange={e=>setBType(e.target.value as 'link'|'share'|'sms'|'none')} className="border rounded px-2 py-1">
                <option value="link">Link</option>
                <option value="share">Share</option>
                <option value="sms">SMS</option>
                <option value="none">No CTA</option>
              </select>
              <input value={bLabel} onChange={e=>setBLabel(e.target.value)} placeholder="CTA label (e.g., Open)" className="border rounded px-2 py-1" />
              {bType === 'sms' ? (
                <>
                  <input value={bSmsMessage} onChange={e=>setBSmsMessage(e.target.value)} placeholder="SMS message body" className="border rounded px-2 py-1 md:col-span-2" />
                  <input value={bSmsUrl} onChange={e=>setBSmsUrl(e.target.value)} placeholder="URL to append (optional)" className="border rounded px-2 py-1 md:col-span-2" />
                </>
              ) : (
                <input value={bPayload} onChange={e=>setBPayload(e.target.value)} placeholder="CTA payload (URL / text)" className="border rounded px-2 py-1 md:col-span-2" />
              )}
              <input type="number" value={bDuration} onChange={e=>setBDuration(Number(e.target.value))} placeholder="Duration seconds" className="border rounded px-2 py-1" />
            </div>
            <div className="flex gap-2">
              <button onClick={async () => { await pushBanner(); setShowBannerModal(false); }} className="px-3 py-2 rounded border hover:bg-gray-50">Push Banner</button>
              <button onClick={async () => { await clearBanner(); setShowBannerModal(false); }} className="px-3 py-2 rounded border hover:bg-gray-50">Clear</button>
              <button onClick={() => setShowBannerModal(false)} className="px-3 py-2 rounded border hover:bg-gray-50 ml-auto">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Settings and Start/Stop Game Controls - Side by Side */}
      <div className="flex gap-4 items-start">
        {/* Global Settings - Half Width, Left Side */}
        <div className="border rounded-xl p-4 space-y-3 bg-white flex-1 max-w-[50%]">
          <h3 className="font-semibold">Global Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Question Duration (seconds)</label>
              <input
                type="number"
                value={eventDuration}
                onChange={e => setEventDuration(Number(e.target.value))}
                onBlur={async () => {
                  if (eventId) {
                    await call('/api/mod/event/update', {
                      event_id: eventId,
                      duration_seconds: eventDuration,
                    })
                    await refreshPolls()
                  }
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Results Duration (seconds)</label>
              <input
                type="number"
                value={eventResults}
                onChange={e => setEventResults(Number(e.target.value))}
                onBlur={async () => {
                  if (eventId && eventResults !== 150) {
                    setIsUpdatingResults(true)
                    try {
                      const result = await call('/api/mod/event/update', {
                        event_id: eventId,
                        results_seconds: eventResults,
                      })
                      if (result !== null) {
                        // Wait a bit longer to ensure database update propagates
                        await new Promise(resolve => setTimeout(resolve, 300))
                        // Don't refresh polls - it will read the old value
                        // Instead, just let the realtime subscription handle it
                      }
                    } finally {
                      // Keep the flag for a bit longer to prevent realtime overwrite
                      setTimeout(() => {
                        setIsUpdatingResults(false)
                      }, 500)
                    }
                  }
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Game End Time (Central Standard Time)</label>
            <div className="flex gap-2 items-center">
              <select
                value={gameEndTime ? gameEndTime.split(':')[0] || '12' : ''}
                onChange={async (e) => {
                  const hours = e.target.value
                  const minutes = gameEndTime ? gameEndTime.split(':')[1] || '00' : '00'
                  const newTime = hours ? `${hours}:${minutes}` : ''
                  setGameEndTime(newTime)
                  if (eventId && newTime) {
                    // Convert CST time to UTC ISO string
                    const [h, m] = newTime.split(':').map(Number)
                    const today = new Date()
                    const cstDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), h, m))
                    const utcDate = new Date(cstDate.getTime() + (6 * 60 * 60 * 1000))
                    const gameEndsAtUTC = utcDate.toISOString()
                    await call('/api/mod/event/update', {
                      event_id: eventId,
                      game_ends_at: gameEndsAtUTC,
                    })
                    await refreshPolls()
                  } else if (eventId && !newTime) {
                    await call('/api/mod/event/update', {
                      event_id: eventId,
                      game_ends_at: null,
                    })
                    await refreshPolls()
                  }
                }}
                className="border rounded px-3 py-2 flex-1"
              >
                <option value="">-- Hour --</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={String(i).padStart(2, '0')}>
                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                  </option>
                ))}
              </select>
              <span className="text-gray-500">:</span>
              <select
                value={gameEndTime ? gameEndTime.split(':')[1] || '00' : ''}
                onChange={async (e) => {
                  const minutes = e.target.value
                  const hours = gameEndTime ? gameEndTime.split(':')[0] || '' : ''
                  if (!hours) return
                  const newTime = `${hours}:${minutes}`
                  setGameEndTime(newTime)
                  if (eventId) {
                    // Convert CST time to UTC ISO string
                    const [h, m] = newTime.split(':').map(Number)
                    const today = new Date()
                    const cstDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), h, m))
                    const utcDate = new Date(cstDate.getTime() + (6 * 60 * 60 * 1000))
                    const gameEndsAtUTC = utcDate.toISOString()
                    await call('/api/mod/event/update', {
                      event_id: eventId,
                      game_ends_at: gameEndsAtUTC,
                    })
                    await refreshPolls()
                  }
                }}
                className="border rounded px-3 py-2 flex-1"
                disabled={!gameEndTime || !gameEndTime.split(':')[0]}
              >
                <option value="">-- Min --</option>
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={String(i).padStart(2, '0')}>
                    {String(i).padStart(2, '0')}
                  </option>
                ))}
              </select>
              {gameEndTime && (
                <button
                  onClick={async () => {
                    setGameEndTime('')
                    if (eventId) {
                      await call('/api/mod/event/update', {
                        event_id: eventId,
                        game_ends_at: null,
                      })
                      await refreshPolls()
                    }
                  }}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Set when the game should automatically end (CST)</p>
          </div>
        </div>

        {/* Start/Stop Game Controls - Right Side */}
        <div className="flex flex-col items-center gap-4">
          {gameEnded && !autoAdvanceEnabled ? (
            <button
              className="px-8 py-6 rounded-xl transition-all duration-200 backdrop-blur-md font-bold text-xl"
              style={{
                border: '1px solid rgba(56, 93, 117, 0.3)',
                backgroundColor: 'rgba(242, 247, 247, 0.6)',
                color: '#385D75',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
                e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.6)'
                e.currentTarget.style.color = '#385D75'
                e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}
              onClick={async () => {
                if (!eventId) return
                const result = await call('/api/mod/game/ready', { event_id: eventId })
                if (result !== null) {
                  await refreshPolls()
                }
              }}
            >
              ✓ Ready Game
            </button>
          ) : !autoAdvanceEnabled ? (
            <button
              className="px-8 py-6 rounded-xl transition-all duration-200 backdrop-blur-md font-bold text-xl"
              style={{
                border: '1px solid rgba(56, 93, 117, 0.3)',
                backgroundColor: 'rgba(242, 247, 247, 0.6)',
                color: '#385D75',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
                e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.6)'
                e.currentTarget.style.color = '#385D75'
                e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}
              onClick={async () => {
                if (!eventId) return
                setLastError(null)
                console.log('[moderator] Starting game for event:', eventId)
                const result = await call('/api/mod/game/start', { event_id: eventId })
                console.log('[moderator] Start game result:', result)
                if (result !== null) {
                  console.log('[moderator] Game started, refreshing polls in 500ms...')
                  // Small delay to ensure database has updated
                  await new Promise(resolve => setTimeout(resolve, 500))
                  await refreshPolls()
                  console.log('[moderator] Polls refreshed after start')
                } else {
                  console.error('[moderator] Failed to start game - result was null')
                }
              }}
            >
              ▶ Start Game
            </button>
          ) : (
            <button
              className="px-8 py-6 rounded-xl transition-all duration-200 backdrop-blur-md font-bold text-xl"
              style={{
                border: '1px solid rgba(56, 93, 117, 0.3)',
                backgroundColor: 'rgba(242, 247, 247, 0.6)',
                color: '#385D75',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
                e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.6)'
                e.currentTarget.style.color = '#385D75'
                e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}
              onClick={async () => {
                if (!eventId) return
                const result = await call('/api/mod/game/stop', { event_id: eventId })
                if (result !== null) {
                  await refreshPolls()
                }
              }}
            >
              ⏸ Stop Game
            </button>
          )}
        </div>
      </div>

      {/* Poll Management Section */}
      <div className="mt-6 border rounded-xl p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Poll Management</h3>
          <button
            onClick={() => {
              setShowCreatePoll(!showCreatePoll)
              if (!showCreatePoll) {
                setNewPollQuestion('')
                setNewPollOptions(['', ''])
                setNewPollCorrectIndex(null)
              }
            }}
            className="px-3 py-1 text-sm rounded border hover:bg-gray-50"
          >
            {showCreatePoll ? 'Cancel' : '+ New Poll'}
          </button>
        </div>

        {showCreatePoll && (
          <div className="border border-gray-300 rounded-lg p-4 space-y-3 bg-white text-gray-900 shadow-sm">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-900">Question</label>
              <input
                value={newPollQuestion}
                onChange={e => setNewPollQuestion(e.target.value)}
                placeholder="Enter poll question"
                className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-900">Options</label>
              <p className="text-xs text-gray-600 mb-2">Select the correct answer with the radio button</p>
              {newPollOptions.map((opt, idx) => (
                <div key={idx} className={`flex gap-2 mb-2 items-center p-2 rounded ${newPollCorrectIndex === idx ? 'bg-green-50 border-2 border-green-500' : 'border border-gray-200'}`}>
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={newPollCorrectIndex === idx}
                    onChange={() => setNewPollCorrectIndex(idx)}
                    className="cursor-pointer w-5 h-5 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    disabled={!opt.trim()}
                  />
                  <span className={`text-sm font-medium ${newPollCorrectIndex === idx ? 'text-green-700' : 'text-gray-700'}`}>
                    {newPollCorrectIndex === idx && '✓ '}Correct
                  </span>
                  <input
                    value={opt}
                    onChange={e => {
                      const updated = [...newPollOptions]
                      updated[idx] = e.target.value
                      setNewPollOptions(updated)
                      // Clear correct answer if this option is cleared
                      if (!e.target.value.trim() && newPollCorrectIndex === idx) {
                        setNewPollCorrectIndex(null)
                      }
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {newPollOptions.length > 2 && (
                    <button
                      onClick={() => {
                        const updated = newPollOptions.filter((_, i) => i !== idx)
                        setNewPollOptions(updated)
                        // Adjust correct index if needed
                        if (newPollCorrectIndex === idx) {
                          setNewPollCorrectIndex(null)
                        } else if (newPollCorrectIndex !== null && newPollCorrectIndex > idx) {
                          setNewPollCorrectIndex(newPollCorrectIndex - 1)
                        }
                      }}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setNewPollOptions([...newPollOptions, ''])}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add Option
              </button>
            </div>
            <button
              onClick={async () => {
                if (!newPollQuestion.trim()) {
                  setLastError('Question is required')
                  return
                }
                const validOptions = newPollOptions.filter(o => o.trim().length > 0)
                if (validOptions.length < 2) {
                  setLastError('At least 2 options are required')
                  return
                }
                const result = await call('/api/poll/create', {
                  event_id: eventId,
                  question: newPollQuestion.trim(),
                  duration_seconds: eventDuration,
                  results_seconds: eventResults,
                  options: validOptions,
                  correct_option_index: newPollCorrectIndex !== null ? newPollCorrectIndex : null,
                })
                if (result !== null) {
                  await refreshPolls()
                  setShowCreatePoll(false)
                  setNewPollQuestion('')
                  setNewPollOptions(['', ''])
                  setNewPollCorrectIndex(null)
                }
              }}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Poll
            </button>
          </div>
        )}

        {/* Questions List */}
        <div className="border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold">Questions ({polls.length})</h3>
          <div className="space-y-4">
            {polls.map(poll => {
              const isExpanded = expandedPolls.has(poll.id)
              const options = pollOptions[poll.id] || []
              const correctOption = poll.correct_option_id ? options.find(o => o.id === poll.correct_option_id) : null
              return (
                <div key={poll.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {poll.question}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {options.length} options
                        {correctOption && (
                          <span className="ml-2 text-green-600 font-medium">✓ Correct: {correctOption.label}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedPolls)
                          if (isExpanded) {
                            newExpanded.delete(poll.id)
                            if (addingOptionToPoll === poll.id) {
                              setAddingOptionToPoll(null)
                              setNewOptionLabel('')
                            }
                          } else {
                            newExpanded.add(poll.id)
                          }
                          setExpandedPolls(newExpanded)
                        }}
                        className="px-3 py-1 text-sm rounded border hover:bg-gray-50"
                      >
                        {isExpanded ? 'Hide' : 'Edit'}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete poll "${poll.question}"?`)) {
                            const result = await call('/api/poll/delete', { poll_id: poll.id })
                            if (result !== null) {
                              await refreshPolls()
                            }
                          }
                        }}
                        className="px-3 py-1 text-sm rounded border text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Options Display */}
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-2 rounded border ${
                          poll.correct_option_id === opt.id
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {poll.correct_option_id === opt.id && (
                            <span className="text-green-600 font-bold">✓</span>
                          )}
                          <span className={poll.correct_option_id === opt.id ? 'font-semibold text-green-700' : 'text-gray-700'}>
                            {opt.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 pt-3 border-t">
                      {/* Edit Poll */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Question</label>
                        <input
                          value={poll.question}
                          onChange={async e => {
                            const result = await call('/api/poll/update', {
                              poll_id: poll.id,
                              question: e.target.value,
                            })
                            if (result !== null) await refreshPolls()
                          }}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>

                    {/* Options */}
                    <div>
                      <div className="font-medium text-sm mb-2">Options</div>
                      {options.map(opt => (
                        <div key={opt.id} className="flex gap-2 mb-2">
                          <input
                            value={opt.label}
                            onChange={async e => {
                              const result = await call('/api/poll/option/update', {
                                option_id: opt.id,
                                label: e.target.value,
                              })
                              if (result !== null) await refreshPolls()
                            }}
                            className="flex-1 border rounded px-2 py-1"
                          />
                          <button
                            onClick={async () => {
                              if (confirm(`Delete option "${opt.label}"?`)) {
                                const result = await call('/api/poll/option/delete', { option_id: opt.id })
                                if (result !== null) await refreshPolls()
                              }
                            }}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {addingOptionToPoll === poll.id ? (
                        <div className="flex gap-2">
                          <input
                            value={newOptionLabel}
                            onChange={e => setNewOptionLabel(e.target.value)}
                            placeholder="Enter option label"
                            className="flex-1 border rounded px-2 py-1"
                            onKeyDown={async e => {
                              if (e.key === 'Enter' && newOptionLabel.trim()) {
                                const result = await call('/api/poll/option/create', {
                                  poll_id: poll.id,
                                  label: newOptionLabel.trim(),
                                })
                                if (result !== null) {
                                  await refreshPolls()
                                  setNewOptionLabel('')
                                  setAddingOptionToPoll(null)
                                }
                              }
                              if (e.key === 'Escape') {
                                setAddingOptionToPoll(null)
                                setNewOptionLabel('')
                              }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              if (newOptionLabel.trim()) {
                                const result = await call('/api/poll/option/create', {
                                  poll_id: poll.id,
                                  label: newOptionLabel.trim(),
                                })
                                if (result !== null) {
                                  await refreshPolls()
                                  setNewOptionLabel('')
                                  setAddingOptionToPoll(null)
                                }
                              }
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setAddingOptionToPoll(null)
                              setNewOptionLabel('')
                            }}
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingOptionToPoll(poll.id)
                            setNewOptionLabel('')
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          + Add Option
                        </button>
                      )}
                    </div>

                    {/* Correct Answer */}
                    {options.length > 0 && (
                      <div className="border-t pt-3">
                        <label className="block font-medium text-sm mb-2">
                          Correct Answer
                          <span className="text-xs font-normal text-gray-500 ml-2">
                            (Shown on voting page after poll closes)
                          </span>
                        </label>
                        <select
                          value={poll.correct_option_id || ''}
                          onChange={async e => {
                            const result = await call('/api/poll/update', {
                              poll_id: poll.id,
                              correct_option_id: e.target.value || null,
                            })
                            if (result !== null) await refreshPolls()
                          }}
                          className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">-- Select correct answer --</option>
                          {options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                              {poll.correct_option_id === opt.id && ' ✓'}
                            </option>
                          ))}
                        </select>
                        {poll.correct_option_id && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Correct answer is set
                          </p>
                        )}
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

