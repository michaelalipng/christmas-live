import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req); if (unauth) return unauth
  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  // Get active poll IDs before closing them
  const { data: activePolls } = await supabaseAdmin
    .from('polls')
    .select('id')
    .eq('event_id', event_id)
    .eq('state', 'active')
  
  // Delete all votes for active polls (reset for next time they show)
  if (activePolls && activePolls.length > 0) {
    const activePollIds = activePolls.map(p => p.id)
    await supabaseAdmin.from('votes').delete().in('poll_id', activePollIds)
  }
  
  // close any active poll
  await supabaseAdmin.from('polls').update({ state: 'closed' }).eq('event_id', event_id).eq('state', 'active')

  // find next scheduled by order_index
  const { data: nextPoll, error } = await supabaseAdmin
    .from('polls')
    .select('*')
    .eq('event_id', event_id)
    .eq('state', 'scheduled')
    .order('order_index', { ascending: true })
    .limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!nextPoll) return NextResponse.json({ ok: true, message: 'no scheduled polls' })

  const now = new Date()
  const { error: e2 } = await supabaseAdmin
    .from('polls')
    .update({ state: 'active', starts_at: now.toISOString(), ends_at: new Date(now.getTime() + (nextPoll.duration_seconds ?? 20) * 1000).toISOString() })
    .eq('id', nextPoll.id)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  return NextResponse.json({ ok: true, poll_id: nextPoll.id })
}

