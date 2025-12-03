import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

// This endpoint processes auto-advance for events
// - POST with event_id: processes that event (allows unauthenticated if event has auto_advance enabled)
// - POST with auth: processes a specific event_id (always works)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-token')
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN || process.env.ADMIN_TOKEN
  const isAuthenticated = authHeader === adminToken
  
  const body = await req.json().catch(() => ({}))
  const event_id = body.event_id

  // If event_id provided
  if (event_id) {
    // If authenticated, process it
    if (isAuthenticated) {
      return await processEvent(event_id)
    }
    
    // If not authenticated, check if event has auto_advance enabled
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select('auto_advance')
      .eq('id', event_id)
      .single()
    
    // If auto_advance is enabled, allow unauthenticated processing
    if (eventData?.auto_advance) {
      return await processEvent(event_id)
    }
    
    // Otherwise require auth
    const unauth = requireModAuth(req)
    if (unauth) return unauth
    return await processEvent(event_id)
  }

  // No event_id - require auth to process all
  const unauth = requireModAuth(req)
  if (unauth) return unauth
  return await processAllAutoAdvanceEvents()
}

async function processAllAutoAdvanceEvents() {
  // Get all events with auto_advance enabled
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('auto_advance', true)

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 })
  }

  const results = []
  for (const event of events || []) {
    const result = await processEvent(event.id)
    results.push({ event_id: event.id, result: await result.json() })
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}

async function processEvent(event_id: string): Promise<NextResponse> {
  const now = new Date()
  const nowIso = now.toISOString()

  // Get event's global duration and results settings (used for all polls)
  let durationSeconds = 30
  let resultsSeconds = 8
  
  try {
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select('duration_seconds, results_seconds')
      .eq('id', event_id)
      .single()
    
    if (eventData) {
      durationSeconds = eventData.duration_seconds ?? 30
      resultsSeconds = eventData.results_seconds ?? 8
    }
  } catch {
    // Columns don't exist yet, use defaults
  }

  // Check for active polls that should transition to showing_results
  const { data: activePolls, error: activeError } = await supabaseAdmin
    .from('polls')
    .select('*')
    .eq('event_id', event_id)
    .eq('state', 'active')
    .lte('ends_at', nowIso)

  if (activeError) return NextResponse.json({ error: activeError.message }, { status: 500 })

  // Transition active polls that have ended to showing_results
  if (activePolls && activePolls.length > 0) {
    for (const poll of activePolls) {
      const resultsUntil = new Date(now.getTime() + resultsSeconds * 1000)
      await supabaseAdmin
        .from('polls')
        .update({ 
          state: 'showing_results',
          results_until: resultsUntil.toISOString(),
          results_seconds: resultsSeconds,
        })
        .eq('id', poll.id)
    }
    // Don't return - continue to check if we need to advance from results
  }

  // Check for polls in showing_results that should advance to next poll
  const { data: resultsPolls, error: resultsError } = await supabaseAdmin
    .from('polls')
    .select('*')
    .eq('event_id', event_id)
    .eq('state', 'showing_results')
    .lte('results_until', nowIso)

  if (resultsError) return NextResponse.json({ error: resultsError.message }, { status: 500 })

  // If there are polls that finished showing results, advance to next
  if (resultsPolls && resultsPolls.length > 0) {
    // Get poll IDs and created_at timestamps before closing them
    const pollIdsToClose = resultsPolls.map(p => p.id)
    const latestClosedCreatedAt = resultsPolls.reduce((latest, p) => {
      const pollCreatedAt = new Date(p.created_at).getTime()
      return pollCreatedAt > latest ? pollCreatedAt : latest
    }, 0)
    
    // Delete all votes for these polls (reset for next loop)
    if (pollIdsToClose.length > 0) {
      await supabaseAdmin
        .from('votes')
        .delete()
        .in('poll_id', pollIdsToClose)
    }
    
    // Close all showing_results polls
    await supabaseAdmin
      .from('polls')
      .update({ state: 'closed' })
      .eq('event_id', event_id)
      .eq('state', 'showing_results')

    // Find the next poll to start
    // First, try to find a poll that comes AFTER the one we just closed (by created_at)
    // Or find any scheduled poll
    let nextPoll = null
    
    // Try to find a poll created after the one we just closed
    if (latestClosedCreatedAt > 0) {
      const { data: laterPoll } = await supabaseAdmin
        .from('polls')
        .select('*')
        .eq('event_id', event_id)
        .in('state', ['scheduled', 'closed'])
        .gt('created_at', new Date(latestClosedCreatedAt).toISOString())
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (laterPoll) {
        nextPoll = laterPoll
      }
    }
    
    // If no later poll found, loop back to the first poll (oldest created_at)
    // But exclude the polls we just closed
    if (!nextPoll) {
      const { data: allPolls, error: nextError } = await supabaseAdmin
        .from('polls')
        .select('*')
        .eq('event_id', event_id)
        .in('state', ['scheduled', 'closed'])
        .order('created_at', { ascending: true })

      if (nextError) return NextResponse.json({ error: nextError.message }, { status: 500 })
      
      // Filter out the polls we just closed
      const availablePolls = (allPolls || []).filter(p => !pollIdsToClose.includes(p.id))
      nextPoll = availablePolls[0] || null
    }

    if (nextPoll && !pollIdsToClose.includes(nextPoll.id)) {
      // Use the event settings we already fetched above
      const durationMs = durationSeconds * 1000
      const startsAt = now.toISOString()
      const endsAt = new Date(now.getTime() + durationMs).toISOString()
      const resultsUntil = new Date(now.getTime() + durationMs + resultsSeconds * 1000)

      const { error: startError } = await supabaseAdmin
        .from('polls')
        .update({
          state: 'active',
          starts_at: startsAt,
          ends_at: endsAt,
          results_until: resultsUntil.toISOString(),
          duration_seconds: durationSeconds,
          results_seconds: resultsSeconds,
        })
        .eq('id', nextPoll.id)

      if (startError) return NextResponse.json({ error: startError.message }, { status: 500 })
      
      return NextResponse.json({ ok: true, poll_id: nextPoll.id, action: 'started' })
    }
  }

  return NextResponse.json({ ok: true, action: 'no_change' })
}

