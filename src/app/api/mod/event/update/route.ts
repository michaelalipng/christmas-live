import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth
  
  const { event_id, duration_seconds, results_seconds } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds
  if (results_seconds !== undefined) updates.results_seconds = results_seconds

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Try to update, but if columns don't exist, return a helpful error
  const { error } = await supabaseAdmin
    .from('events')
    .update(updates)
    .eq('id', event_id)

  if (error) {
    // Check if it's a column doesn't exist error
    if (error.message.includes('does not exist') || error.message.includes('column')) {
      return NextResponse.json({ 
        error: 'Database columns duration_seconds and results_seconds need to be added to the events table. Please run: ALTER TABLE events ADD COLUMN duration_seconds INTEGER DEFAULT 30, ADD COLUMN results_seconds INTEGER DEFAULT 8;' 
      }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

