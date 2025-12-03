'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { PollOption, UUID } from '@/types/db'
import { getDeviceId } from '@/lib/deviceId'

export default function VoteOptions({ 
  pollId, 
  correctOptionId, 
  endsAtIso, 
  serverNowMs 
}: { 
  pollId: UUID
  correctOptionId: UUID | null
  endsAtIso: string | null
  serverNowMs: number
}) {
  const [options, setOptions] = useState<PollOption[]>([])
  const [sending, setSending] = useState<UUID | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState<boolean>(false)
  const [votedOptionId, setVotedOptionId] = useState<UUID | null>(null)
  
  // Check if timer has ended
  const isTimerEnded = endsAtIso ? serverNowMs >= Date.parse(endsAtIso) : false

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

  // Check if user has already voted (need to get poll's starts_at to check votes for this cycle)
  useEffect(() => {
    // Reset vote state when poll changes
    setHasVoted(false)
    setVotedOptionId(null)
    setError(null)
    
    let alive = true
    ;(async () => {
      // Get the poll's starts_at to check votes for this specific cycle
      const { data: pollData } = await supabase
        .from('polls')
        .select('starts_at')
        .eq('id', pollId)
        .single()
      
      if (!alive || !pollData?.starts_at) return
      
      const device_id = getDeviceId()
      // Check for votes in this poll cycle (matching starts_at)
      const { data, error } = await supabase
        .from('votes')
        .select('option_id, created_at')
        .eq('poll_id', pollId)
        .eq('device_id', device_id)
        .gte('created_at', pollData.starts_at)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (!alive) return
      if (error) {
        console.error('Error checking vote:', error)
        return
      }
      if (data) {
        setHasVoted(true)
        setVotedOptionId(data.option_id as UUID)
      }
    })()
    return () => { alive = false }
  }, [pollId])

  async function handleVote(optionId: UUID) {
    if (hasVoted) return
    
    setError(null)
    setSending(optionId)
    const device_id = getDeviceId()
    const { error } = await supabase
      .from('votes')
      .insert({ poll_id: pollId, option_id: optionId, device_id })
    
    if (error) {
      // Check if it's a duplicate vote error
      if (error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505') {
        setHasVoted(true)
        setVotedOptionId(optionId)
        setError('You have already voted on this poll.')
      } else {
        setError(error.message)
      }
    } else {
      // Vote successful
      setHasVoted(true)
      setVotedOptionId(optionId)
    }
    setSending(null)
  }

  if (error && !hasVoted) return <p className="text-red-600 text-sm">Error: {error}</p>
  if (!options.length) return null

  return (
    <div className="grid gap-4">
        {options.map(o => {
          const isVotedOption = hasVoted && votedOptionId === o.id
          const isCorrectAnswer = isTimerEnded && correctOptionId === o.id
          return (
            <button
              key={o.id}
              onClick={() => handleVote(o.id)}
              disabled={sending !== null || hasVoted || isTimerEnded}
              className="w-full rounded-xl px-6 py-4 text-left font-medium text-lg transition-all duration-200 disabled:opacity-60 backdrop-blur-md relative"
              style={{
                border: isCorrectAnswer 
                  ? '2px solid rgba(34, 197, 94, 0.8)' 
                  : isVotedOption 
                    ? '1px solid rgba(216, 168, 105, 0.6)' 
                    : '1px solid rgba(56, 93, 117, 0.3)',
                backgroundColor: isCorrectAnswer 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : isVotedOption 
                    ? 'rgba(216, 168, 105, 0.4)' 
                    : 'rgba(242, 247, 247, 0.6)',
                color: '#385D75',
                boxShadow: isCorrectAnswer 
                  ? '0 4px 6px -1px rgba(34, 197, 94, 0.3), 0 2px 4px -1px rgba(34, 197, 94, 0.2)' 
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                cursor: hasVoted || isTimerEnded ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!sending && !hasVoted && !isTimerEnded) {
                  e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (!sending) {
                  e.currentTarget.style.backgroundColor = isCorrectAnswer 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : isVotedOption 
                      ? 'rgba(216, 168, 105, 0.4)' 
                      : 'rgba(242, 247, 247, 0.6)'
                  e.currentTarget.style.color = '#385D75'
                  e.currentTarget.style.border = isCorrectAnswer 
                    ? '2px solid rgba(34, 197, 94, 0.8)' 
                    : isVotedOption 
                      ? '1px solid rgba(216, 168, 105, 0.6)' 
                      : '1px solid rgba(56, 93, 117, 0.3)'
                  e.currentTarget.style.boxShadow = isCorrectAnswer 
                    ? '0 4px 6px -1px rgba(34, 197, 94, 0.3), 0 2px 4px -1px rgba(34, 197, 94, 0.2)' 
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }
              }}
            >
              {o.label}
              {isCorrectAnswer && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold" style={{ color: '#22C55E' }}>✓</span>
              )}
              {!isCorrectAnswer && isVotedOption && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl" style={{ color: '#D8A869' }}>✓</span>
              )}
            </button>
          )
        })}
    </div>
  )
}

