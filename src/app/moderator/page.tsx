// app/moderator/page.tsx
import { Suspense } from 'react'
import ModeratorContent from './ModeratorContent'

// This page is fully client-driven / realtime, so force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ModeratorPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-6 flex items-center justify-center">
          <div className="text-2xl opacity-70">Loading moderator panel…</div>
        </main>
      }
    >
      <ModeratorContent />
    </Suspense>
  )
}

