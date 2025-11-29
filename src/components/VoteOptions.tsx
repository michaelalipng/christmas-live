'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { PollOption, UUID } from '@/types/db'
import { getDeviceId } from '@/lib/deviceId'

export default function VoteOptions({ pollId }: { pollId: UUID }) {
  const [options, setOptions] = useState<PollOption[]>([])
  const [sending, setSending] = useState<UUID | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', pollId)
        .order('order_index', { ascending: true })
      if (!alive) return
      if (error) setError(error.message)
      else setOptions((data ?? []) as unknown as PollOption[])
    })()
    return () => { alive = false }
  }, [pollId])

  async function handleVote(optionId: UUID) {
    setError(null)
    setSending(optionId)
    const device_id = getDeviceId()
    const { error } = await supabase
      .from('votes')
      .insert({ poll_id: pollId, option_id: optionId, device_id })
    if (error) setError(error.message)
    setSending(null)
  }

  if (error) return <p className="text-red-600 text-sm">Error: {error}</p>
  if (!options.length) return null

  return (
    <div className="grid gap-3">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => handleVote(o.id)}
          disabled={sending !== null}
          className="w-full border rounded-xl px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-60"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

