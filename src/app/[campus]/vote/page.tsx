'use client'
import { useParams } from 'next/navigation'
import PageShell from '@/components/PageShell'
import VoteLive from '@/components/VoteLive'

export default function VotePage() {
  const { campus } = useParams() as { campus: string }
  return (
    <PageShell>
      <h1 className="text-2xl font-bold mb-4">Voting — {campus}</h1>
      <VoteLive campusSlug={campus} />
    </PageShell>
  )
}

