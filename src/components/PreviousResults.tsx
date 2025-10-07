// components/PreviousResults.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Poll, PollOption } from '@/types/db'

type VoteRow = {
  id: string
  poll_id: string
  option_id: string
  created_at: string
}

type OptionWithVotes = {
  option: PollOption
  count: number
  percentage: number
}

export default function PreviousResults({ eventId }: { eventId: string }) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [results, setResults] = useState<OptionWithVotes[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Fetch the latest results poll for this event
      const { data: pollData, error: pollError } = await supabase
        .from('latest_poll_for_event')
        .select('*')
        .eq('event_id', eventId)
        .limit(1)
        .maybeSingle()

      if (pollError || !pollData || !alive) {
        setPoll(null)
        setResults([])
        return
      }

      const latestPoll = pollData as Poll
      setPoll(latestPoll)

      // Fetch options for this poll
      const { data: options, error: optionsError } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', latestPoll.id)
        .order('order_index', { ascending: true })

      if (optionsError || !options || !alive) {
        setResults([])
        return
      }

      // Fetch votes for this poll
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('poll_id', latestPoll.id)

      if (votesError || !alive) {
        setResults([])
        return
      }

      const votesList = (votes as VoteRow[]) || []

      // Count votes per option
      const voteCounts = new Map<string, number>()
      for (const vote of votesList) {
        voteCounts.set(vote.option_id, (voteCounts.get(vote.option_id) || 0) + 1)
      }

      const totalVotes = votesList.length
      const optionsWithVotes: OptionWithVotes[] = (options as PollOption[]).map((opt) => {
        const count = voteCounts.get(opt.id) || 0
        const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0
        return { option: opt, count, percentage }
      })

      if (alive) setResults(optionsWithVotes)
    })()
    return () => {
      alive = false
    }
  }, [eventId])

  if (!poll) return null

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-2">
        Previous Poll
      </h3>
      <p className="text-lg font-medium mb-4">{poll.question}</p>
      <div className="space-y-3">
        {results.map(({ option, count, percentage }) => (
          <div key={option.id} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{option.label}</span>
              <span className="text-gray-600">
                {count} ({Math.round(percentage)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-700 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

