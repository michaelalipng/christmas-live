import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

// This endpoint can be called with or without auth
// - GET (cron): processes all events with auto_advance=true
// - POST with auth: processes a specific event_id
export async function GET(req: NextRequest) {
  // Cron job calls this endpoint - process all auto-advance events
  return await processAllAutoAdvanceEvents()
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-token')
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN || process.env.ADMIN_TOKEN
  const isAuthenticated = authHeader === adminToken
  
  const body = await req.json().catch(() => ({}))
  const event_id = body.event_id

  // If event_id provided, require auth
  if (event_id && !isAuthenticated) {
    const unauth = requireModAuth(req)
    if (unauth) return unauth
  }

  // Process specific event
  if (event_id) {
    return await processEvent(event_id)
  }

  // Fallback: process all auto-advance events
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
      const resultsUntil = new Date(now.getTime() + (poll.results_seconds ?? 8) * 1000)
      await supabaseAdmin
        .from('polls')
        .update({ 
          state: 'showing_results',
          results_until: resultsUntil.toISOString()
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
    // Get poll IDs before closing them
    const pollIdsToClose = resultsPolls.map(p => p.id)
    
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

    // Find the next poll to start (lowest order_index that's scheduled or closed)
    // If no scheduled polls, loop back to the first poll (lowest order_index)
    const { data: nextPoll, error: nextError } = await supabaseAdmin
      .from('polls')
      .select('*')
      .eq('event_id', event_id)
      .in('state', ['scheduled', 'closed'])
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextError) return NextResponse.json({ error: nextError.message }, { status: 500 })

    if (nextPoll) {
      const durationMs = (nextPoll.duration_seconds ?? 30) * 1000
      const startsAt = now.toISOString()
      const endsAt = new Date(now.getTime() + durationMs).toISOString()
      const resultsUntil = new Date(now.getTime() + durationMs + (nextPoll.results_seconds ?? 8) * 1000)

      const { error: startError } = await supabaseAdmin
        .from('polls')
        .update({
          state: 'active',
          starts_at: startsAt,
          ends_at: endsAt,
          results_until: resultsUntil.toISOString()
        })
        .eq('id', nextPoll.id)

      if (startError) return NextResponse.json({ error: startError.message }, { status: 500 })
      
      return NextResponse.json({ ok: true, poll_id: nextPoll.id, action: 'started' })
    }
  }

  return NextResponse.json({ ok: true, action: 'no_change' })
}

