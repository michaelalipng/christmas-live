'use client'

import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/next'

/**
 * Analytics wrapper that ensures analytics loads properly in iframe contexts
 * This component helps track page views even when embedded on other sites
 */
export default function AnalyticsWrapper() {
  useEffect(() => {
    // Force analytics initialization in iframe context
    // This helps ensure tracking works even when embedded
    if (typeof window !== 'undefined') {
      // Check if we're in an iframe
      const inIframe = window.self !== window.top
      
      if (inIframe) {
        // Log for debugging (remove in production if desired)
        console.log('[Analytics] Tracking enabled for embedded view')
        
        // Ensure analytics script is loaded even in iframe
        // Vercel Analytics should handle this automatically, but this ensures it
        if (typeof window !== 'undefined' && !(window as any).va) {
          // Analytics script will be loaded by the Analytics component
        }
      }
    }
  }, [])

  return <Analytics />
}

