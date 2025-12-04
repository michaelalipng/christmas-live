import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth
  
  const { event_id, duration_seconds, results_seconds, game_ends_at } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds
  if (results_seconds !== undefined) updates.results_seconds = results_seconds
  if (game_ends_at !== undefined) {
    // Allow null to clear the game end time
    updates.game_ends_at = game_ends_at === null || game_ends_at === '' ? null : game_ends_at
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Try to update, but if columns don't exist, return a helpful error
  const { error, data } = await supabaseAdmin
    .from('events')
    .update(updates)
    .eq('id', event_id)
    .select()

  if (error) {
    console.error('Event update error:', error)
    // Check if it's a column doesn't exist error
    if (error.message?.includes('does not exist') || error.message?.includes('column') || error.code === '42703') {
      let errorMsg = 'Database columns need to be added to the events table. Please run:'
      if (duration_seconds !== undefined || results_seconds !== undefined) {
        errorMsg += ' ALTER TABLE events ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 30, ADD COLUMN IF NOT EXISTS results_seconds INTEGER DEFAULT 8;'
      }
      if (game_ends_at !== undefined) {
        errorMsg += ' ALTER TABLE events ADD COLUMN IF NOT EXISTS game_ends_at TIMESTAMPTZ;'
      }
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }
    return NextResponse.json({ error: error.message || JSON.stringify(error) || 'Unknown database error' }, { status: 500 })
  }
  
  console.log('Event updated successfully:', { event_id, updates, data })
  return NextResponse.json({ ok: true, data })
}

