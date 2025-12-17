// app/overlay/page.tsx
import { Suspense } from 'react'
import OverlayLive from '@/components/OverlayLive'

// This page is fully client-driven / realtime, so force dynamic rendering
export const dynamic = 'force-dynamic'

export default function OverlayPage() {
  return (
    <main className="h-screen w-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #c8e4f0 0%, #e8f4f8 50%, #f0f8fa 100%)', backgroundAttachment: 'fixed' }}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="text-2xl opacity-70" style={{ color: '#385D75' }}>Loading overlay…</div>
          </div>
        }
      >
        <OverlayLive />
      </Suspense>
    </main>
  )
}
