import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req); if (unauth) return unauth
  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('banners').update({ is_active: false }).eq('event_id', event_id).eq('is_active', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

