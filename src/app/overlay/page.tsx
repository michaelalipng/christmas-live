// app/overlay/page.tsx
import { Suspense } from 'react'

import OverlayLive from '@/components/OverlayLive'

// This page is fully client-driven / realtime, so force dynamic rendering
export const dynamic = 'force-dynamic'

export default function OverlayPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-10 flex items-center justify-center" style={{ backgroundColor: '#00FF00' }}>
          <div className="text-2xl opacity-70">Loading overlay…</div>
        </main>
      }
    >
      <OverlayLive />
    </Suspense>
  )
}
