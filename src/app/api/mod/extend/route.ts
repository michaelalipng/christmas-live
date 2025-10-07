import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req); if (unauth) return unauth
  const { poll_id, seconds } = await req.json()
  if (!poll_id) return NextResponse.json({ error: 'poll_id required' }, { status: 400 })
  const add = (Number(seconds) || 5) * 1000
  // fetch current ends_at
  const { data, error: e1 } = await supabaseAdmin.from('polls').select('ends_at').eq('id', poll_id).single()
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  const ends = data?.ends_at ? new Date(data.ends_at).getTime() : Date.now()
  const newEnds = new Date(ends + add).toISOString()
  const { error: e2 } = await supabaseAdmin.from('polls').update({ ends_at: newEnds }).eq('id', poll_id)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  return NextResponse.json({ ok: true, ends_at: newEnds })
}

