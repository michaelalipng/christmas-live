import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth

  const { option_id } = await req.json()

  if (!option_id) {
    return NextResponse.json({ error: 'option_id is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('poll_options')
    .delete()
    .eq('id', option_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}


