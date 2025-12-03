import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireModAuth } from '@/lib/modAuth'

export async function POST(req: NextRequest) {
  const unauth = requireModAuth(req)
  if (unauth) return unauth

  const { poll_id } = await req.json()

  if (!poll_id) {
    return NextResponse.json({ error: 'poll_id is required' }, { status: 400 })
  }

  // Delete votes first (foreign key constraint)
  const { error: votesError } = await supabaseAdmin
    .from('votes')
    .delete()
    .eq('poll_id', poll_id)

  if (votesError) {
    return NextResponse.json({ error: `Failed to delete votes: ${votesError.message}` }, { status: 500 })
  }

  // Delete options second (foreign key constraint)
  const { error: optionsError } = await supabaseAdmin
    .from('poll_options')
    .delete()
    .eq('poll_id', poll_id)

  if (optionsError) {
    return NextResponse.json({ error: `Failed to delete options: ${optionsError.message}` }, { status: 500 })
  }

  // Delete poll last
  const { error } = await supabaseAdmin
    .from('polls')
    .delete()
    .eq('id', poll_id)

  if (error) {
    return NextResponse.json({ error: `Failed to delete poll: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}


