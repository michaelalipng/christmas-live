import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req); if (unauth) return unauth
  const { poll_id } = await req.json()
  if (!poll_id) return NextResponse.json({ error: 'poll_id required' }, { status: 400 })
  const now = new Date()
  const { data, error } = await supabaseAdmin
    .from('polls')
    .update({ state: 'showing_results', results_until: new Date(now.getTime() + 8_000).toISOString() })
    .eq('id', poll_id)
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, poll: data })
}

