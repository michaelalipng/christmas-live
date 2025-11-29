'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Poll, UUID } from '@/types/db'

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
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN // convenience for client calls
  const [bTitle, setBTitle] = useState('')
  const [bBody, setBBody] = useState('')
  const [bType, setBType] = useState<'link'|'share'|'sms'|'none'>('link')
  const [bLabel, setBLabel] = useState('Open')
  const [bPayload, setBPayload] = useState('')
  const [bDuration, setBDuration] = useState<number>(10)

  async function refreshPolls() {
    if (!eventId) return
    const { data } = await supabase.from('polls').select('*').eq('event_id', eventId).order('order_index', { ascending: true })
    setPolls((data ?? []) as unknown as Poll[])
    const { data: a } = await supabase.from('polls').select('*').eq('event_id', eventId).eq('state', 'active').limit(1)
    setActive(((a ?? [])[0] as Poll) ?? null)
  }

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
  }, [eventId])

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
    try {
      await call('/api/banner/push', {
        event_id: eventId,
        title: bTitle,
        body: bBody || null,
        cta_label: bLabel || null,
        cta_type: bType === 'none' ? null : bType,
        cta_payload: bPayload || null,
        duration_sec: bDuration || null,
      }, 'Push Banner')
      setBTitle(''); setBBody(''); setBPayload('')
    } catch (err) {
      // Error already handled in call()
    }
  }
  async function clearBanner() {
    if (!eventId) return
    try {
      await call('/api/banner/clear', { event_id: eventId }, 'Clear Banner')
    } catch (err) {
      // Error already handled in call()
    }
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

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {polls.map(p => (
          <button
            key={p.id}
            className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={actionLoading !== null}
            onClick={async () => {
              try {
                await call('/api/mod/start', { poll_id: p.id }, 'Start Poll')
              } catch (err) {
                // Error already handled in call()
              }
            }}
          >
            {actionLoading === `Start Poll` ? 'Starting...' : `Start: ${p.order_index}. ${p.question.slice(0,40)}`}
          </button>
        ))}
      </div>

      {active && (
        <div className="flex gap-2">
          <button 
            className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={actionLoading !== null}
            onClick={async () => {
              try {
                await call('/api/mod/results', { poll_id: active.id }, 'Show Results')
              } catch (err) {
                // Error already handled in call()
              }
            }}
          >
            {actionLoading === 'Show Results' ? 'Loading...' : 'Show Results'}
          </button>
          <button 
            className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={actionLoading !== null}
            onClick={async () => {
              try {
                await call('/api/mod/extend', { poll_id: active.id, seconds: 5 }, 'Extend Poll')
              } catch (err) {
                // Error already handled in call()
              }
            }}
          >
            {actionLoading === 'Extend Poll' ? 'Extending...' : 'Extend +5s'}
          </button>
          <button 
            className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={actionLoading !== null}
            onClick={async () => {
              try {
                await call('/api/mod/end', { poll_id: active.id }, 'End Poll')
              } catch (err) {
                // Error already handled in call()
              }
            }}
          >
            {actionLoading === 'End Poll' ? 'Ending...' : 'End'}
          </button>
        </div>
      )}

      <button 
        className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
        disabled={actionLoading !== null}
        onClick={async () => {
          try {
            await call('/api/mod/next', { event_id: eventId }, 'Next Poll')
          } catch (err) {
            // Error already handled in call()
          }
        }}
      >
        {actionLoading === 'Next Poll' ? 'Loading...' : 'Next (by order)'}
      </button>

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

