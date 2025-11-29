// app/results/page.tsx
import { Suspense } from 'react'

import ResultsWall from '@/components/ResultsWall'

// This page is fully client-driven / realtime, so force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-10 flex items-center justify-center">
          <div className="text-2xl opacity-70">Loading results…</div>
        </main>
      }
    >
      <ResultsWall />
    </Suspense>
  )
}
