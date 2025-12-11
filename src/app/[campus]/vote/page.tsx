'use client'
import { useParams, useSearchParams } from 'next/navigation'
import PageShell from '@/components/PageShell'
import VoteLive from '@/components/VoteLive'

export default function VotePage() {
  const { campus } = useParams() as { campus: string }
  const searchParams = useSearchParams()
  const isEmbed = searchParams.get('embed') === 'true'
  
  const content = <VoteLive campusSlug={campus} />
  
  if (isEmbed) {
    // Embed mode: no background, minimal padding
    return (
      <main className="min-h-screen p-4">
        <div className="w-full max-w-3xl mx-auto">{content}</div>
      </main>
    )
  }
  
  return (
    <PageShell>
      {content}
    </PageShell>
  )
}

