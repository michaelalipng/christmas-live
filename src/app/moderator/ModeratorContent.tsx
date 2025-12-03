'use client'
import { useSearchParams } from 'next/navigation'
import ModeratorPanel from '@/components/ModeratorPanel'

export default function ModeratorContent() {
  const params = useSearchParams()
  const campus = params.get('campus') || 'ascension'
  return (
    <main className="min-h-screen p-6">
      <ModeratorPanel campusSlug={campus} />
    </main>
  )
}


