import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth
  
  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  // Get event settings (global duration and results)
  // Note: If columns don't exist, use defaults
  let durationSeconds = 30
  let resultsSeconds = 8
  
  try {
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('duration_seconds, results_seconds')
      .eq('id', event_id)
      .single()
    
    if (event) {
      durationSeconds = event.duration_seconds ?? 30
      resultsSeconds = event.results_seconds ?? 8
    }
  } catch {
    // Columns don't exist yet, use defaults
    console.log('Event duration/results columns not found, using defaults')
  }

  // Close any active polls
  await supabaseAdmin
    .from('polls')
    .update({ state: 'closed' })
    .eq('event_id', event_id)
    .in('state', ['active', 'showing_results'])

  // Find the first poll (oldest created_at)
  const { data: firstPoll, error: pollError } = await supabaseAdmin
    .from('polls')
    .select('*')
    .eq('event_id', event_id)
    .in('state', ['scheduled', 'closed'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (pollError) return NextResponse.json({ error: pollError.message }, { status: 500 })
  if (!firstPoll) return NextResponse.json({ error: 'No polls found' }, { status: 404 })

  // Start the first poll
  const now = new Date()
  const durationMs = durationSeconds * 1000
  const startsAt = now.toISOString()
  const endsAt = new Date(now.getTime() + durationMs).toISOString()
  const resultsUntil = new Date(now.getTime() + durationMs + resultsSeconds * 1000).toISOString()

  const { error: startError } = await supabaseAdmin
    .from('polls')
    .update({
      state: 'active',
      starts_at: startsAt,
      ends_at: endsAt,
      results_until: resultsUntil,
      duration_seconds: durationSeconds,
      results_seconds: resultsSeconds,
    })
    .eq('id', firstPoll.id)

  if (startError) return NextResponse.json({ error: startError.message }, { status: 500 })

  // Enable auto-advance
  const { error: autoAdvanceError } = await supabaseAdmin
    .from('events')
    .update({ auto_advance: true })
    .eq('id', event_id)

  if (autoAdvanceError) return NextResponse.json({ error: autoAdvanceError.message }, { status: 500 })

  return NextResponse.json({ ok: true, poll_id: firstPoll.id })
}

