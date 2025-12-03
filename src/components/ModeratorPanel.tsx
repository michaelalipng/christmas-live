'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
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
  const [bDuration, setBDuration] = useState<number>(10)

  // Poll management state
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollOrder, setNewPollOrder] = useState(0)
  const [newPollDuration, setNewPollDuration] = useState(30)
  const [newPollResults, setNewPollResults] = useState(8)
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', ''])
  const [newPollCorrectIndex, setNewPollCorrectIndex] = useState<number | null>(null)
  const [pollOptions, setPollOptions] = useState<Record<UUID, PollOption[]>>({})
  const [expandedPolls, setExpandedPolls] = useState<Set<UUID>>(new Set())
  const [addingOptionToPoll, setAddingOptionToPoll] = useState<UUID | null>(null)
  const [newOptionLabel, setNewOptionLabel] = useState('')
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(false)

  const refreshPolls = useCallback(async () => {
    if (!eventId) return
    const { data } = await supabase.from('polls').select('*').eq('event_id', eventId).order('order_index', { ascending: true })
    setPolls((data ?? []) as unknown as Poll[])
    const { data: a } = await supabase.from('polls').select('*').eq('event_id', eventId).eq('state', 'active').limit(1)
    setActive(((a ?? [])[0] as Poll) ?? null)
    
    // Refresh options for all polls
    if (data && data.length > 0) {
      const pollIds = data.map(p => p.id)
      const { data: allOptions } = await supabase
        .from('poll_options')
        .select('*')
        .in('poll_id', pollIds)
        .order('order_index', { ascending: true })
      
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
      const { data } = await supabase.from('polls').select('*').eq('event_id', eid).order('order_index', { ascending: true })
      setPolls((data ?? []) as unknown as Poll[])
      const { data: a } = await supabase.from('polls').select('*').eq('event_id', eid).eq('state', 'active').limit(1)
      setActive(((a ?? [])[0] as Poll) ?? null)
      setLoading(false)
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

  // Auto-advance polling
  useEffect(() => {
    if (!autoAdvanceEnabled || !eventId) return
    
    const interval = setInterval(async () => {
      await call('/api/mod/auto-advance', { event_id: eventId })
      await refreshPolls()
    }, 1000) // Check every second
    
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
        const msg = text || `HTTP ${res.status} ${res.statusText}`
        console.error('Moderator API error', { path, status: res.status, msg })
        setLastError(`${path}: ${msg}`)
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
    const result = await call('/api/banner/push', {
      event_id: eventId,
      title: bTitle,
      body: bBody || null,
      cta_label: bLabel || null,
      cta_type: bType === 'none' ? null : bType,
      cta_payload: bPayload || null,
      duration_sec: bDuration || null,
    })
    if (result !== null) {
      setBTitle(''); setBBody(''); setBPayload('')
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
      <h2 className="text-xl font-bold">Moderator — {campusSlug}</h2>
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
      <div className="grid gap-2">
        <div className="text-sm opacity-70">Event: {eventId}</div>
        <div className="text-sm">Active: {active ? active.question : 'None'}</div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          className={`px-4 py-2 rounded border font-semibold ${
            autoAdvanceEnabled 
              ? 'bg-green-500 text-white border-green-600 hover:bg-green-600' 
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          }`}
          onClick={async () => {
            if (!autoAdvanceEnabled) {
              // Starting auto-advance - if no active poll, start the first one
              if (!active && polls.length > 0) {
                const firstPoll = polls[0]
                const result = await call('/api/mod/start', { poll_id: firstPoll.id })
                if (result !== null) {
                  await refreshPolls()
                }
              }
              setAutoAdvanceEnabled(true)
            } else {
              setAutoAdvanceEnabled(false)
            }
          }}
        >
          {autoAdvanceEnabled ? '⏸ Stop Auto-Advance' : '▶ Start Auto-Advance'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {polls.map(p => (
          <button
            key={p.id}
            className="px-3 py-2 rounded border hover:bg-gray-50"
            onClick={async () => {
              const result = await call('/api/mod/start', { poll_id: p.id })
              if (result !== null) {
                await refreshPolls()
              }
            }}
          >
            Start: {p.order_index}. {p.question.slice(0,40)}
          </button>
        ))}
      </div>

      {active && (
        <div className="flex gap-2">
          <button 
            className="px-3 py-2 rounded border hover:bg-gray-50" 
            onClick={async () => {
              const result = await call('/api/mod/results', { poll_id: active.id })
              if (result !== null) {
                await refreshPolls()
              }
            }}
          >
            Show Results
          </button>
          <button 
            className="px-3 py-2 rounded border hover:bg-gray-50" 
            onClick={async () => {
              const result = await call('/api/mod/extend', { poll_id: active.id, seconds: 5 })
              if (result !== null) {
                await refreshPolls()
              }
            }}
          >
            Extend +5s
          </button>
          <button 
            className="px-3 py-2 rounded border hover:bg-gray-50" 
            onClick={async () => {
              const result = await call('/api/mod/end', { poll_id: active.id })
              if (result !== null) {
                await refreshPolls()
              }
            }}
          >
            End
          </button>
        </div>
      )}

      <button 
        className="px-3 py-2 rounded border hover:bg-gray-50" 
        onClick={async () => {
          const result = await call('/api/mod/next', { event_id: eventId })
          if (result !== null) {
            await refreshPolls()
          }
        }}
      >
        Next (by order)
      </button>

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
                setNewPollOrder(polls.length)
                setNewPollDuration(30)
                setNewPollResults(8)
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
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">Order</label>
                <input
                  type="number"
                  value={newPollOrder}
                  onChange={e => setNewPollOrder(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">Duration (s)</label>
                <input
                  type="number"
                  value={newPollDuration}
                  onChange={e => setNewPollDuration(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900">Results (s)</label>
                <input
                  type="number"
                  value={newPollResults}
                  onChange={e => setNewPollResults(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
                  order_index: newPollOrder,
                  duration_seconds: newPollDuration,
                  results_seconds: newPollResults,
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

        {/* Existing Polls */}
        <div className="space-y-2">
          {polls.map(poll => {
            const isExpanded = expandedPolls.has(poll.id)
            const options = pollOptions[poll.id] || []
            return (
              <div key={poll.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">
                      {poll.order_index}. {poll.question}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      State: {poll.state} | Duration: {poll.duration_seconds}s | Options: {options.length}
                      {poll.correct_option_id && (
                        <span className="ml-2 text-green-600 font-semibold">✓ Answer set</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedPolls)
                        if (isExpanded) {
                          newExpanded.delete(poll.id)
                          // Reset adding option state when collapsing
                          if (addingOptionToPoll === poll.id) {
                            setAddingOptionToPoll(null)
                            setNewOptionLabel('')
                          }
                        } else {
                          newExpanded.add(poll.id)
                        }
                        setExpandedPolls(newExpanded)
                      }}
                      className="px-2 py-1 text-sm rounded border hover:bg-gray-50"
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
                      className="px-2 py-1 text-sm rounded border text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 pt-3 border-t">
                    {/* Edit Poll */}
                    <div className="space-y-2">
                      <input
                        value={poll.question}
                        onChange={async e => {
                          const result = await call('/api/poll/update', {
                            poll_id: poll.id,
                            question: e.target.value,
                          })
                          if (result !== null) await refreshPolls()
                        }}
                        className="w-full border rounded px-2 py-1"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={poll.order_index}
                          onChange={async e => {
                            const result = await call('/api/poll/update', {
                              poll_id: poll.id,
                              order_index: Number(e.target.value),
                            })
                            if (result !== null) await refreshPolls()
                          }}
                          className="border rounded px-2 py-1"
                          placeholder="Order"
                        />
                        <input
                          type="number"
                          value={poll.duration_seconds}
                          onChange={async e => {
                            const result = await call('/api/poll/update', {
                              poll_id: poll.id,
                              duration_seconds: Number(e.target.value),
                            })
                            if (result !== null) await refreshPolls()
                          }}
                          className="border rounded px-2 py-1"
                          placeholder="Duration"
                        />
                        <input
                          type="number"
                          value={poll.results_seconds}
                          onChange={async e => {
                            const result = await call('/api/poll/update', {
                              poll_id: poll.id,
                              results_seconds: Number(e.target.value),
                            })
                            if (result !== null) await refreshPolls()
                          }}
                          className="border rounded px-2 py-1"
                          placeholder="Results"
                        />
                      </div>
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

      <div className="mt-6 border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">Banner</h3>
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
          <input value={bPayload} onChange={e=>setBPayload(e.target.value)} placeholder="CTA payload (URL / text)" className="border rounded px-2 py-1 md:col-span-2" />
          <input type="number" value={bDuration} onChange={e=>setBDuration(Number(e.target.value))} placeholder="Duration seconds" className="border rounded px-2 py-1" />
        </div>
        <div className="flex gap-2">
          <button onClick={pushBanner} className="px-3 py-2 rounded border hover:bg-gray-50">Push Banner</button>
          <button onClick={clearBanner} className="px-3 py-2 rounded border hover:bg-gray-50">Clear</button>
        </div>
      </div>
    </div>
  )
}

