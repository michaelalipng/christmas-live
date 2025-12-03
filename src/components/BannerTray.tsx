'use client'
import { useEffect, useState } from 'react'
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
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Helper function to check if banner is expired
  function isBannerExpired(b: Banner | null): boolean {
    if (!b || !b.expires_at) return false
    return Date.now() >= Date.parse(b.expires_at)
  }

  // load current active once
  useEffect(() => {
    let alive = true
    // Reset immediately to prevent showing banner from previous event
    setBanner(null)
    setIsLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!alive) return
      const candidate = (data && data[0]) || null
      // Only set banner if it exists and is not expired
      if (candidate && !isBannerExpired(candidate)) {
        setBanner(candidate)
      } else {
        setBanner(null)
      }
      setIsLoading(false)
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
          const candidate = (data && data[0]) || null
          // Only set banner if it exists and is not expired
          if (candidate && !isBannerExpired(candidate)) {
            setBanner(candidate)
          } else {
            setBanner(null)
          }
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
      const exp = Date.parse(banner.expires_at!)
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
    const navShare = (navigator as unknown as { share?: (data: { text?: string; url?: string }) => Promise<void> }).share
    if (banner.cta_type === 'share' && typeof navShare === 'function') {
      const looksLikeUrl = /^https?:\/\//i.test(payload) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(payload)
      const url = looksLikeUrl ? normalizeUrl(payload) : undefined
      const shareData = url ? { url } : { text: payload }
      navShare(shareData).catch(() => {})
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

  // Don't render anything while loading to prevent flash
  if (isLoading || !banner) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-50 pointer-events-none">
      {/* Banner content */}
      <div 
        className="relative max-w-lg w-full rounded-2xl p-6 backdrop-blur-md pointer-events-auto text-center"
        style={{
          border: '1px solid rgba(56, 93, 117, 0.3)',
          backgroundColor: 'rgba(242, 247, 247, 0.5)',
          boxShadow: '0 20px 60px -12px rgba(56, 93, 117, 0.4), 0 0 0 1px rgba(242, 247, 247, 0.2)',
          animation: 'bannerPopUp 0.3s ease-out',
        }}
      >
        <h3 
          className="text-2xl font-bold mb-2"
          style={{ 
            color: '#385D75',
            fontFamily: 'Forum, serif',
          }}
        >
          {banner.title}
        </h3>
        {banner.body && (
          <p 
            className="text-base mb-4"
            style={{ color: '#575555' }}
          >
            {banner.body}
          </p>
        )}
        {banner.cta_label && banner.cta_type && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleCTA}
              className="px-6 py-3 rounded-lg border-2 font-semibold transition-all duration-200 backdrop-blur-md w-full sm:w-auto"
              style={{
                borderColor: 'rgba(216, 168, 105, 0.6)',
                backgroundColor: 'rgba(242, 247, 247, 0.9)',
                color: '#385D75',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(216, 168, 105, 0.9)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'rgba(216, 168, 105, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.9)'
                e.currentTarget.style.color = '#385D75'
                e.currentTarget.style.borderColor = 'rgba(216, 168, 105, 0.6)'
              }}
            >
              {banner.cta_label}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

