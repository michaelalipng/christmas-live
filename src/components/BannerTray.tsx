'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { UUID } from '@/types/db'
import { getDeviceId } from '@/lib/deviceId'

type Banner = {
  id: UUID
  event_id: UUID
  title: string
  body: string | null
  cta_label: string | null
  cta_type: 'link' | 'share' | 'sms' | null
  cta_payload: string | null
  is_active: boolean
  expires_at: string | null
}

function normalizeUrl(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed // other schemes (mailto:, tel:, etc.)
  // If it looks like a domain, default to https
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

export default function BannerTray({ eventId }: { eventId: UUID }) {
  const [banner, setBanner] = useState<Banner | null>(null)

  // load current active once
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!alive) return
      setBanner((data && data[0]) || null)
    })()
    return () => { alive = false }
  }, [eventId])

  // subscribe to changes for this event
  useEffect(() => {
    const ch = supabase
      .channel(`banners:event:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners', filter: `event_id=eq.${eventId}` },
        async () => {
          const { data } = await supabase
            .from('banners')
            .select('*')
            .eq('event_id', eventId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
          setBanner((data && data[0]) || null)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [eventId])

  // auto-hide on expiry (client-side)
  useEffect(() => {
    if (!banner?.expires_at) return
   const id = setInterval(() => {
      const now = Date.now()
      const exp = Date.parse(banner.expires_at)
      if (now >= exp) setBanner(null)
    }, 1000)
    return () => clearInterval(id)
  }, [banner?.expires_at])

  async function trackClick() {
    try {
      if (!banner) return
      const device_id = getDeviceId()
      await supabase.from('banner_clicks').insert({ banner_id: banner.id, device_id })
    } catch {/* ignore */}
  }

  async function handleCTA() {
    if (!banner) return
    await trackClick()
    const payload = banner.cta_payload || ''
    if (banner.cta_type === 'link') {
      const url = normalizeUrl(payload)
      if (!url) return
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    if (banner.cta_type === 'share' && (navigator as any).share) {
      const looksLikeUrl = /^https?:\/\//i.test(payload) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(payload)
      const url = looksLikeUrl ? normalizeUrl(payload) : undefined
      const shareData: any = url ? { url } : { text: payload }
      ;(navigator as any).share(shareData).catch(() => {})
      return
    }
    if (banner.cta_type === 'sms') {
      const encoded = encodeURIComponent(payload)
      // Android prefers ?body=, iOS uses &body=
      const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
      const href = isAndroid ? `sms:?body=${encoded}` : `sms:&body=${encoded}`
      window.location.href = href
      return
    }
  }

  if (!banner) return null

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-50">
      <div className="max-w-lg w-full rounded-2xl border bg-white shadow p-4">
        <div className="font-semibold">{banner.title}</div>
        {banner.body && <p className="text-sm mt-1">{banner.body}</p>}
        {banner.cta_label && banner.cta_type && (
          <div className="mt-3">
            <button onClick={handleCTA} className="px-3 py-2 rounded bg-black text-white">
              {banner.cta_label}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

