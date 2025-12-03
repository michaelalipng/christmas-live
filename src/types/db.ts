// types/db.ts
export type UUID = string

export type Campus = {
  id: UUID
  name: string
  slug: string
  created_at: string
}

export type EventRow = {
  id: UUID
  campus_id: UUID
  name: string
  starts_at: string | null
  ends_at: string | null
  auto_advance: boolean
  gap_seconds: number
  created_at: string
}

export type PollState = 'scheduled' | 'active' | 'showing_results' | 'closed'

export type Poll = {
  id: UUID
  event_id: UUID
  question: string
  media_url: string | null
  state: PollState
  duration_seconds: number
  results_seconds: number
  order_index: number
  correct_option_id: UUID | null
  starts_at: string | null
  ends_at: string | null
  results_until: string | null
  created_at: string
}

export type PollOption = {
  id: UUID
  poll_id: UUID
  label: string
  order_index: number
  created_at: string
}

