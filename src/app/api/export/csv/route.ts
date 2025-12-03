import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function GET(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event')
  if (!eventId) return NextResponse.json({ error: 'event param required' }, { status: 400 })

  const { data: polls, error: e1 } = await supabaseAdmin
    .from('polls')
    .select('id, question')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  const pollIds = polls.map(p => p.id)
  const { data: votes, error: e2 } = await supabaseAdmin
    .from('votes')
    .select('poll_id, option_id, created_at, device_id')
    .in('poll_id', pollIds)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  const { data: options } = await supabaseAdmin
    .from('poll_options')
    .select('id, poll_id, label')
    .in('poll_id', pollIds)

  const optMap = new Map(options?.map(o => [o.id, o.label]) ?? [])
  const pollMap = new Map(polls.map(p => [p.id, p]))

  let csv = 'poll_question,option_label,device_id,voted_at\n'
  for (const v of votes ?? []) {
    const p = pollMap.get(v.poll_id)
    const label = optMap.get(v.option_id) ?? ''
    const line = [
      JSON.stringify(p?.question ?? ''),
      JSON.stringify(label),
      v.device_id,
      v.created_at,
    ].join(',')
    csv += line + '\n'
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="event_${eventId}.csv"`,
    },
  })
}

