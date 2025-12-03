import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth

  const { event_id, question, duration_seconds, results_seconds, options, correct_option_index } = await req.json()

  if (!event_id || !question) {
    return NextResponse.json({ error: 'event_id and question are required' }, { status: 400 })
  }

  // Create poll
  const { data: poll, error: pollError } = await supabaseAdmin
    .from('polls')
    .insert({
      event_id,
      question,
      state: 'scheduled',
      duration_seconds: duration_seconds ?? 30,
      results_seconds: results_seconds ?? 8,
    })
    .select('id')
    .single()

  if (pollError) {
    return NextResponse.json({ error: pollError.message }, { status: 500 })
  }

  // Create options if provided
  let correctOptionId: string | null = null
  if (options && Array.isArray(options) && options.length > 0) {
    const validOptions = options.filter((opt: string) => opt.trim().length > 0)
    const optionInserts = validOptions.map((label: string, idx: number) => ({
      poll_id: poll.id,
      label: label.trim(),
      order_index: idx,
    }))

    if (optionInserts.length > 0) {
      const { data: createdOptions, error: optionsError } = await supabaseAdmin
        .from('poll_options')
        .insert(optionInserts)
        .select('id, order_index')

      if (optionsError) {
        return NextResponse.json({ error: optionsError.message }, { status: 500 })
      }

      // Find the correct option if specified
      if (correct_option_index !== null && correct_option_index !== undefined && createdOptions) {
        const correctOption = createdOptions.find((opt: { order_index: number }) => opt.order_index === correct_option_index)
        if (correctOption) {
          correctOptionId = correctOption.id
        }
      }
    }
  }

  // Update poll with correct option if specified
  if (correctOptionId) {
    const { error: updateError } = await supabaseAdmin
      .from('polls')
      .update({ correct_option_id: correctOptionId })
      .eq('id', poll.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, poll_id: poll.id })
}

