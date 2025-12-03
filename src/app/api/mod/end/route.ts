import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req); if (unauth) return unauth
  const { poll_id } = await req.json()
  if (!poll_id) return NextResponse.json({ error: 'poll_id required' }, { status: 400 })
  
  // Delete all votes for this poll (reset for next time it shows)
  await supabaseAdmin.from('votes').delete().eq('poll_id', poll_id)
  
  const { error } = await supabaseAdmin.from('polls').update({ state: 'closed' }).eq('id', poll_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

