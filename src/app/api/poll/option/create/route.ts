import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth

  const { poll_id, label, order_index } = await req.json()

  if (!poll_id || !label) {
    return NextResponse.json({ error: 'poll_id and label are required' }, { status: 400 })
  }

  // Get max order_index if not provided
  let finalOrderIndex = order_index
  if (finalOrderIndex === undefined) {
    const { data: existing } = await supabaseAdmin
      .from('poll_options')
      .select('order_index')
      .eq('poll_id', poll_id)
      .order('order_index', { ascending: false })
      .limit(1)
    finalOrderIndex = existing && existing.length > 0 ? (existing[0].order_index as number) + 1 : 0
  }

  const { data, error } = await supabaseAdmin
    .from('poll_options')
    .insert({
      poll_id,
      label: label.trim(),
      order_index: finalOrderIndex,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, option_id: data.id })
}


