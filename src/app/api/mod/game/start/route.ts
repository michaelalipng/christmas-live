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
  let resultsSeconds = 10
  
  try {
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('duration_seconds, results_seconds')
      .eq('id', event_id)
      .single()
    
    if (event) {
      durationSeconds = event.duration_seconds ?? 30
      resultsSeconds = event.results_seconds ?? 10
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

  if (pollError) {
    console.error('[game/start] Error finding first poll:', pollError)
    return NextResponse.json({ error: pollError.message }, { status: 500 })
  }
  if (!firstPoll) {
    console.error('[game/start] No polls found for event:', event_id)
    return NextResponse.json({ error: 'No polls found. Please create at least one poll first.' }, { status: 404 })
  }
  
  console.log(`[game/start] Found first poll: ${firstPoll.id} - "${firstPoll.question}"`)

  // Start the first poll
  const now = new Date()
  const durationMs = durationSeconds * 1000
  const startsAt = now.toISOString()
  const endsAt = new Date(now.getTime() + durationMs).toISOString()
  const resultsUntil = new Date(now.getTime() + durationMs + resultsSeconds * 1000).toISOString()

  console.log(`[game/start] Attempting to start poll ${firstPoll.id} with:`, {
    state: 'active',
    starts_at: startsAt,
    ends_at: endsAt,
    duration_seconds: durationSeconds,
    results_seconds: resultsSeconds,
  })
  
  const { error: startError, data: updatedPoll } = await supabaseAdmin
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
    .select('id, state, starts_at, ends_at, duration_seconds, results_seconds')
    .single()

  if (startError) {
    console.error('[game/start] Error starting poll:', startError)
    return NextResponse.json({ error: startError.message }, { status: 500 })
  }
  
  if (!updatedPoll) {
    console.error(`[game/start] Poll ${firstPoll.id} update returned no data`)
    return NextResponse.json({ error: 'Failed to start poll - no data returned' }, { status: 500 })
  }
  
  // Verify the poll was actually set to active
  if (updatedPoll.state !== 'active') {
    console.error(`[game/start] Poll ${firstPoll.id} was not set to active. State: ${updatedPoll.state}, Data:`, updatedPoll)
    return NextResponse.json({ error: `Failed to start poll - state is ${updatedPoll.state} instead of active` }, { status: 500 })
  }
  
  console.log(`[game/start] Poll ${firstPoll.id} started successfully:`, {
    state: updatedPoll.state,
    starts_at: updatedPoll.starts_at,
    ends_at: updatedPoll.ends_at,
    duration_seconds: updatedPoll.duration_seconds,
    results_seconds: updatedPoll.results_seconds,
  })
  
  // Double-check by querying the poll again
  const { data: verifyPoll, error: verifyError } = await supabaseAdmin
    .from('polls')
    .select('id, state')
    .eq('id', firstPoll.id)
    .single()
  
  if (verifyError) {
    console.error('[game/start] Error verifying poll:', verifyError)
  } else {
    console.log(`[game/start] Verification query: poll ${verifyPoll?.id} has state ${verifyPoll?.state}`)
    if (verifyPoll?.state !== 'active') {
      console.error(`[game/start] WARNING: Poll state verification failed! Expected 'active', got '${verifyPoll?.state}'`)
    }
  }

  // Enable auto-advance
  const { error: autoAdvanceError } = await supabaseAdmin
    .from('events')
    .update({ auto_advance: true })
    .eq('id', event_id)

  if (autoAdvanceError) {
    console.error('[game/start] Error enabling auto-advance:', autoAdvanceError)
    return NextResponse.json({ error: autoAdvanceError.message }, { status: 500 })
  }
  
  console.log(`[game/start] Auto-advance enabled for event ${event_id}`)

  return NextResponse.json({ ok: true, poll_id: firstPoll.id })
}

