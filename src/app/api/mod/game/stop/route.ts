import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth
  
  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

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

  return NextResponse.json({ ok: true })
}

