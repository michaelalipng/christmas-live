import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

// This endpoint processes auto-advance for events
// - POST with event_id: processes that event (allows unauthenticated if event has auto_advance enabled)
// - POST with auth: processes a specific event_id (always works)
export async function POST(req: NextRequest) {
  try {
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
      try {
        const { data: eventData, error: eventError } = await supabaseAdmin
          .from('events')
          .select('auto_advance')
          .eq('id', event_id)
          .single()
        
        if (eventError) {
          console.error('Error checking auto_advance:', eventError)
          return NextResponse.json({ error: `Event not found: ${eventError.message}` }, { status: 404 })
        }
        
        // If auto_advance is enabled, allow unauthenticated processing
        if (eventData?.auto_advance) {
          return await processEvent(event_id)
        }
      } catch (err) {
        console.error('Exception checking auto_advance:', err)
        return NextResponse.json({ error: 'Failed to check auto_advance status' }, { status: 500 })
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
  } catch (err) {
    console.error('Auto-advance endpoint error:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
  try {
    const now = new Date()
    const nowIso = now.toISOString()

    // Get event's global duration and results settings (used for all polls)
    let durationSeconds = 30
    let resultsSeconds = 8
    let gameEndsAt: string | null = null
    
    try {
      const { data: eventData, error: eventError } = await supabaseAdmin
        .from('events')
        .select('duration_seconds, results_seconds, game_ends_at, auto_advance')
        .eq('id', event_id)
        .single()
      
      if (eventError) {
        if (!eventError.message.includes('does not exist')) {
          console.error('Error fetching event settings:', eventError)
        }
      }
      
      if (eventData) {
        durationSeconds = eventData.duration_seconds ?? 30
        resultsSeconds = eventData.results_seconds ?? 8
        gameEndsAt = eventData.game_ends_at ?? null
        
        // Check if game end time has been reached
        if (gameEndsAt && eventData.auto_advance) {
          const gameEndTime = new Date(gameEndsAt).getTime()
          const currentTime = now.getTime()
          
          if (currentTime >= gameEndTime) {
            console.log(`[auto-advance] Game end time reached (${gameEndsAt}), stopping game`)
            
            // Disable auto-advance
            await supabaseAdmin
              .from('events')
              .update({ auto_advance: false })
              .eq('id', event_id)
            
            // Close all active and showing_results polls
            await supabaseAdmin
              .from('polls')
              .update({ state: 'closed' })
              .eq('event_id', event_id)
              .in('state', ['active', 'showing_results'])
            
            console.log(`[auto-advance] Game stopped automatically at end time`)
            return NextResponse.json({ ok: true, action: 'game_stopped_by_end_time' })
          }
        }
      }
    } catch {
      // Columns don't exist yet, use defaults
      console.log('Event duration/results columns not found, using defaults')
    }

  // Check for active polls that should transition to showing_results
  // Add a 2 second buffer to avoid race conditions with newly started polls
  // This ensures polls that were just started have time to be active
  const bufferMs = 2000
  const checkTime = new Date(now.getTime() - bufferMs).toISOString()
  
  const { data: allActivePolls, error: allActiveError } = await supabaseAdmin
    .from('polls')
    .select('*')
    .eq('event_id', event_id)
    .eq('state', 'active')
  
  if (allActiveError) {
    console.error('[auto-advance] Error fetching active polls:', allActiveError)
    return NextResponse.json({ error: allActiveError.message }, { status: 500 })
  }
  
  // Filter to only polls that have actually ended (with buffer)
  // Also check that the poll wasn't just started (starts_at should be at least 3 seconds ago)
  const activePolls = (allActivePolls || []).filter(p => {
    if (!p.ends_at) return false
    
    // Don't transition polls that were just started (within last 3 seconds)
    if (p.starts_at) {
      const startedAgo = now.getTime() - new Date(p.starts_at).getTime()
      if (startedAgo < 3000) {
        console.log(`[auto-advance] Skipping poll ${p.id} - was just started ${Math.round(startedAgo)}ms ago`)
        return false
      }
    }
    
    const endsAtTime = new Date(p.ends_at).getTime()
    const checkTimeMs = new Date(checkTime).getTime()
    return endsAtTime <= checkTimeMs
  })
  
  if (allActivePolls && allActivePolls.length > 0) {
    console.log(`[auto-advance] Found ${allActivePolls.length} active poll(s) total. Now: ${nowIso}, Check time: ${checkTime}`)
    allActivePolls.forEach(p => {
      if (p.ends_at) {
        const timeUntilEnd = new Date(p.ends_at).getTime() - now.getTime()
        const shouldTransition = new Date(p.ends_at).getTime() <= new Date(checkTime).getTime()
        console.log(`[auto-advance] Poll ${p.id}: ends_at=${p.ends_at}, time until end: ${Math.round(timeUntilEnd / 1000)}s, should transition: ${shouldTransition}`)
      } else {
        console.log(`[auto-advance] Poll ${p.id}: no ends_at set`)
      }
    })
  }
  
  if (activePolls.length > 0) {
    console.log(`[auto-advance] ${activePolls.length} poll(s) ready to transition to showing_results`)
  }

  // Transition active polls that have ended to showing_results
  if (activePolls && activePolls.length > 0) {
    console.log(`[auto-advance] Transitioning ${activePolls.length} active poll(s) to showing_results`)
    for (const poll of activePolls) {
      const resultsUntil = new Date(now.getTime() + resultsSeconds * 1000)
      const { error: updateError } = await supabaseAdmin
        .from('polls')
        .update({ 
          state: 'showing_results',
          results_until: resultsUntil.toISOString(),
          results_seconds: resultsSeconds,
        })
        .eq('id', poll.id)
      
      if (updateError) {
        console.error(`[auto-advance] Error transitioning poll ${poll.id}:`, updateError)
      } else {
        console.log(`[auto-advance] Poll ${poll.id} transitioned to showing_results until ${resultsUntil.toISOString()}`)
      }
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

  // If there are polls that finished showing results, close them and start the next poll
  if (resultsPolls && resultsPolls.length > 0) {
    console.log(`[auto-advance] ${resultsPolls.length} poll(s) finished showing results, advancing to next`)
    
    // Get poll IDs and created_at timestamps before closing them
    const pollIdsToClose = resultsPolls.map(p => p.id)
    const latestClosedCreatedAt = resultsPolls.reduce((latest, p) => {
      const pollCreatedAt = new Date(p.created_at).getTime()
      return pollCreatedAt > latest ? pollCreatedAt : latest
    }, 0)
    
    // Delete all votes for these polls (reset for next loop)
    if (pollIdsToClose.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('votes')
        .delete()
        .in('poll_id', pollIdsToClose)
      
      if (deleteError) {
        console.error('[auto-advance] Error deleting votes:', deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
      console.log(`[auto-advance] Deleted votes for ${pollIdsToClose.length} poll(s)`)
    }
    
    // Close all showing_results polls
    const { error: closeError } = await supabaseAdmin
      .from('polls')
      .update({ state: 'closed' })
      .eq('event_id', event_id)
      .eq('state', 'showing_results')
    
    if (closeError) {
      console.error('[auto-advance] Error closing polls:', closeError)
      return NextResponse.json({ error: closeError.message }, { status: 500 })
    }
    
    console.log(`[auto-advance] Closed ${pollIdsToClose.length} poll(s) with IDs: ${pollIdsToClose.join(', ')}, finding next poll to start...`)
    
    // Find the next poll to start
    // Strategy: Find poll created after the one we just closed, or loop back to first
    // IMPORTANT: Always exclude the polls we just closed by ID
    let nextPoll = null
    
    // Get all polls for this event, then filter out the ones we just closed
    const { data: allPollsRaw, error: allPollsError } = await supabaseAdmin
      .from('polls')
      .select('*')
      .eq('event_id', event_id)
      .in('state', ['scheduled', 'closed'])
      .order('created_at', { ascending: true })
    
    if (allPollsError) {
      console.error('[auto-advance] Error fetching all polls:', allPollsError)
      return NextResponse.json({ error: allPollsError.message }, { status: 500 })
    }
    
    // Filter out the polls we just closed
    const allPolls = (allPollsRaw || []).filter(p => !pollIdsToClose.includes(p.id))
    
    console.log(`[auto-advance] Found ${allPollsRaw?.length || 0} total polls, ${allPolls.length} available after filtering out closed ones`)
    if (allPollsRaw && allPollsRaw.length > 0) {
      console.log(`[auto-advance] All poll IDs: ${allPollsRaw.map(p => p.id).join(', ')}`)
      console.log(`[auto-advance] Available poll IDs: ${allPolls.map(p => p.id).join(', ')}`)
    }
    
    if (allPolls.length === 0) {
      // If no polls available, check if there's only one poll total (allow looping to itself)
      const totalPolls = allPollsRaw || []
      if (totalPolls.length === 1 && pollIdsToClose.includes(totalPolls[0].id)) {
        // Only one poll exists - loop back to itself
        nextPoll = totalPolls[0]
        console.log(`[auto-advance] Only one poll exists, looping back to: ${nextPoll.id}`)
      } else {
        console.log('[auto-advance] No polls available (all were just closed)')
        return NextResponse.json({ ok: true, action: 'closed_no_next' })
      }
    } else {
      // Try to find a poll created after the one we just closed
      if (latestClosedCreatedAt > 0) {
        const laterPolls = allPolls.filter(p => {
          const pollCreatedAt = new Date(p.created_at).getTime()
          return pollCreatedAt > latestClosedCreatedAt
        })
        
        if (laterPolls.length > 0) {
          nextPoll = laterPolls[0]
          console.log(`[auto-advance] Found later poll: ${nextPoll.id} (created after closed poll)`)
        }
      }
      
      // If no later poll, loop back to the first available poll
      if (!nextPoll) {
        nextPoll = allPolls[0]
        console.log(`[auto-advance] Looping back to first available poll: ${nextPoll.id}`)
      }
    }
    
    // Start the next poll if we found one
    if (nextPoll) {
      // Double-check that this poll isn't already active (safety check)
      if (nextPoll.state === 'active') {
        console.log(`[auto-advance] Poll ${nextPoll.id} is already active, skipping`)
        return NextResponse.json({ ok: true, action: 'already_active', poll_id: nextPoll.id })
      }
      
      // Make sure we're not starting a poll we just closed
      if (pollIdsToClose.includes(nextPoll.id)) {
        console.error(`[auto-advance] ERROR: Attempted to start poll ${nextPoll.id} which was just closed!`)
        return NextResponse.json({ error: 'Cannot start a poll that was just closed' }, { status: 500 })
      }
      
      const durationMs = durationSeconds * 1000
      const startsAt = now.toISOString()
      const endsAt = new Date(now.getTime() + durationMs).toISOString()
      const resultsUntil = new Date(now.getTime() + durationMs + resultsSeconds * 1000).toISOString()
      
      console.log(`[auto-advance] Starting poll ${nextPoll.id} - Question: "${nextPoll.question.substring(0, 50)}..."`)
      
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
        .eq('id', nextPoll.id)
      
      if (startError) {
        console.error('[auto-advance] Error starting next poll:', startError)
        return NextResponse.json({ error: startError.message }, { status: 500 })
      }
      
      console.log(`[auto-advance] Successfully started next poll ${nextPoll.id}`)
      return NextResponse.json({ ok: true, poll_id: nextPoll.id, action: 'started_next' })
    } else {
      console.log('[auto-advance] No next poll found to start')
      return NextResponse.json({ ok: true, action: 'closed_no_next' })
    }
  }

  return NextResponse.json({ ok: true, action: 'no_change' })
  } catch (err) {
    console.error('Error in processEvent:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

