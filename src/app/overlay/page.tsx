// app/overlay/page.tsx
import { Suspense } from 'react'
import PageShell from '@/components/PageShell'
import OverlayLive from '@/components/OverlayLive'

// This page is fully client-driven / realtime, so force dynamic rendering
export const dynamic = 'force-dynamic'

export default function OverlayPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-2xl opacity-70" style={{ color: '#385D75' }}>Loading overlay…</div>
          </div>
        }
      >
        <OverlayLive />
      </Suspense>
    </PageShell>
  )
}
