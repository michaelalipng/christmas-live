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
    <div className="grid gap-4">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => handleVote(o.id)}
          disabled={sending !== null}
          className="w-full rounded-xl px-6 py-4 text-left font-medium text-lg transition-all duration-200 disabled:opacity-60 backdrop-blur-md"
          style={{
            border: '1px solid rgba(56, 93, 117, 0.3)',
            backgroundColor: 'rgba(242, 247, 247, 0.6)',
            color: '#385D75',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
          onMouseEnter={(e) => {
            if (!sending) {
              e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }
          }}
          onMouseLeave={(e) => {
            if (!sending) {
              e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.6)'
              e.currentTarget.style.color = '#385D75'
              e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

