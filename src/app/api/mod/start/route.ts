import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req); if (unauth) return unauth
  const { poll_id } = await req.json()
  if (!poll_id) return NextResponse.json({ error: 'poll_id required' }, { status: 400 })
  
  // First, get the event_id for this poll
  const { data: poll, error: pollError } = await supabaseAdmin
    .from('polls')
    .select('event_id, duration_seconds')
    .eq('id', poll_id)
    .single()
  
  if (pollError) return NextResponse.json({ error: pollError.message }, { status: 500 })
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  
  // Close any active poll for this event (to satisfy unique constraint)
  await supabaseAdmin
    .from('polls')
    .update({ state: 'closed' })
    .eq('event_id', poll.event_id)
    .eq('state', 'active')
  
  // Get event settings (global duration and results)
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('duration_seconds, results_seconds')
    .eq('id', poll.event_id)
    .single()
  
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })
  
  // Use event's global settings, fallback to defaults
  const durationSeconds = event?.duration_seconds ?? 30
  const resultsSeconds = event?.results_seconds ?? 10
  
  // Now start the requested poll
  const now = new Date()
  const durationMs = durationSeconds * 1000
  const resultsMs = resultsSeconds * 1000
  const startsAt = now.toISOString()
  const endsAt = new Date(now.getTime() + durationMs).toISOString()
  const resultsUntil = new Date(now.getTime() + durationMs + resultsMs).toISOString()
  
  const { error } = await supabaseAdmin
    .from('polls')
    .update({ 
      state: 'active', 
      starts_at: startsAt, 
      ends_at: endsAt,
      results_until: resultsUntil,
      duration_seconds: durationSeconds,
      results_seconds: resultsSeconds,
    })
    .eq('id', poll_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

