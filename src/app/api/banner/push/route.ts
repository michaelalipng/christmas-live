import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req); if (unauth) return unauth
  const body = await req.json()
  const { event_id, title, body: bbody, cta_label, cta_type, cta_payload, duration_sec } = body || {}
  if (!event_id || !title) return NextResponse.json({ error: 'event_id and title required' }, { status: 400 })

  // only one active: clear any existing
  await supabaseAdmin.from('banners').update({ is_active: false }).eq('event_id', event_id).eq('is_active', true)

  const expires_at = duration_sec ? new Date(Date.now() + Number(duration_sec) * 1000).toISOString() : null
  const { data, error } = await supabaseAdmin
    .from('banners')
    .insert({ event_id, title, body: bbody ?? null, cta_label: cta_label ?? null, cta_type: cta_type ?? null, cta_payload: cta_payload ?? null, is_active: true, expires_at })
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, banner: data })
}

