// components/PreviousResults.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Poll, PollOption } from '@/types/db'

export default function PreviousResults({ eventId }: { eventId: string }) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<PollOption | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Fetch the latest closed poll (not currently showing results)
      // We want the previous poll, not the one currently active or showing results
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('event_id', eventId)
        .eq('state', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pollError || !pollData || !alive) {
        setPoll(null)
        setCorrectAnswer(null)
        return
      }

      const latestPoll = pollData as Poll
      setPoll(latestPoll)

      // If there's a correct answer, fetch it
      if (latestPoll.correct_option_id) {
        const { data: option, error: optionError } = await supabase
          .from('poll_options')
          .select('*')
          .eq('id', latestPoll.correct_option_id)
          .maybeSingle()

        if (!optionError && option && alive) {
          setCorrectAnswer(option as PollOption)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [eventId])

  // Don't show if no poll or if poll is still active/showing results
  if (!poll || poll.state === 'active' || (poll.state === 'showing_results' && !poll.correct_option_id)) {
    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-2">
        Previous Question
      </h3>
      <p className="text-lg font-medium mb-2">{poll.question}</p>
      {correctAnswer ? (
        <div className="text-base">
          <span className="opacity-70">Answer: </span>
          <span className="font-semibold">{correctAnswer.label}</span>
        </div>
      ) : (
        <div className="text-sm opacity-60 italic">No answer set</div>
      )}
    </div>
  )
}

