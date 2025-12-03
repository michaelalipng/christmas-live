import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth
  
  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

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

