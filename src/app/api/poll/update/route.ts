import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth

  const { poll_id, question, order_index, duration_seconds, results_seconds, correct_option_id } = await req.json()

  if (!poll_id) {
    return NextResponse.json({ error: 'poll_id is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (question !== undefined) updates.question = question
  if (order_index !== undefined) updates.order_index = order_index
  if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds
  if (results_seconds !== undefined) updates.results_seconds = results_seconds
  if (correct_option_id !== undefined) updates.correct_option_id = correct_option_id || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('polls')
    .update(updates)
    .eq('id', poll_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

