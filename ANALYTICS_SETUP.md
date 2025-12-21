# Analytics Setup

Vercel Analytics has been integrated into the application.

## Quick Setup

1. **Enable Vercel Analytics:**
   - Go to your [Vercel Dashboard](https://vercel.com/dashboard)
   - Navigate to your project → Settings → Analytics
   - Enable "Web Analytics"

2. **Deploy:**
   - Analytics will automatically start tracking once enabled in Vercel
   - Page views are tracked automatically
   - Custom events are tracked for:
     - Votes (`vote` event with poll_id, option_id, campus)
     - Poll starts (`poll_start`)
     - Poll ends (`poll_end`)
     - Game starts (`game_start`)
     - Game ends (`game_end`)

## What's Tracked

- **Page Views**: Automatically tracked on all pages by Vercel Analytics
- **Votes**: Tracked when users vote on polls (includes poll_id, option_id, campus)
- **Game Events**: Can be tracked via the analytics utility (see `src/lib/analytics.ts`)

## Files Added/Modified

- `src/lib/analytics.ts` - Analytics utility functions for custom events
- `src/app/layout.tsx` - Added Vercel Analytics component
- `src/components/VoteOptions.tsx` - Added vote tracking

## Testing

To verify analytics is working:
1. Enable Web Analytics in your Vercel project settings
2. Deploy your application
3. Visit your app and navigate between pages
4. Check Vercel Analytics dashboard (should show page views within minutes)
5. Cast a vote and verify the `vote` event appears in Vercel Analytics

## Viewing Analytics

- Go to your Vercel Dashboard → Your Project → Analytics tab
- View page views, top pages, referrers, and custom events
- Custom events will appear in the Events section

