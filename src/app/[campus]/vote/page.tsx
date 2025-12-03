'use client'
import { useParams } from 'next/navigation'
import PageShell from '@/components/PageShell'
import VoteLive from '@/components/VoteLive'

export default function VotePage() {
  const { campus } = useParams() as { campus: string }
  return (
    <PageShell>
      <VoteLive campusSlug={campus} />
    </PageShell>
  )
}

