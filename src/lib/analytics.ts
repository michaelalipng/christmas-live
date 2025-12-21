// Analytics utility for tracking custom events with Vercel Analytics
// Note: track function should only be called from client components

export function trackEvent(
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
) {
  if (typeof window !== 'undefined') {
    // Dynamically import to ensure it's only loaded client-side
    import('@vercel/analytics/react').then(({ track }) => {
      track(eventName, eventParams)
    }).catch(() => {
      // Silently fail if analytics isn't available (e.g., in development)
    })
  }
}

// Convenience functions for common events
export const analytics = {
  vote: (pollId: string, optionId: string, campusSlug: string) => {
    trackEvent('vote', {
      poll_id: pollId,
      option_id: optionId,
      campus: campusSlug,
    })
  },
  pollStart: (pollId: string, campusSlug: string) => {
    trackEvent('poll_start', {
      poll_id: pollId,
      campus: campusSlug,
    })
  },
  pollEnd: (pollId: string, campusSlug: string) => {
    trackEvent('poll_end', {
      poll_id: pollId,
      campus: campusSlug,
    })
  },
  gameStart: (eventId: string, campusSlug: string) => {
    trackEvent('game_start', {
      event_id: eventId,
      campus: campusSlug,
    })
  },
  gameEnd: (eventId: string, campusSlug: string) => {
    trackEvent('game_end', {
      event_id: eventId,
      campus: campusSlug,
    })
  },
}

