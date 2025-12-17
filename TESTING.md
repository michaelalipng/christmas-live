# Testing Guide for Christmas Live App

This guide helps you test the full functionality of the Christmas Live voting app.

## Prerequisites

1. **Environment Variables** - Ensure these are set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_TOKEN` (for moderator API authentication)

2. **Database Setup** - Your Supabase database should have these tables:
   - `campuses` (id, name, slug, created_at)
   - `events` (id, campus_id, name, starts_at, ends_at, auto_advance, gap_seconds, created_at)
   - `polls` (id, event_id, question, media_url, state, duration_seconds, results_seconds, order_index, starts_at, ends_at, results_until, created_at)
   - `poll_options` (id, poll_id, label, order_index, created_at)
   - `votes` (id, poll_id, option_id, device_id, created_at)
   - `banners` (id, event_id, title, body, cta_type, cta_label, cta_payload, is_active, expires_at, created_at)

## Quick Test Setup

Run the automated test setup script:

```bash
npm run test-setup
```

This will:
- Create a test campus (if it doesn't exist)
- Create a test event
- Create 3 test polls with options
- Print all the URLs you need for testing

## Manual Testing Workflow

### Step 1: Set Up Test Data

If you didn't use the automated script, manually create:
1. A campus with slug `ascension`
2. An event for that campus
3. At least 2-3 polls with 3-4 options each
4. Set polls to `scheduled` state initially

### Step 2: Test Voting Flow

1. **Open Vote Page**: Navigate to `/ascension/vote` (or your campus slug)
   - Should show "Get Ready" or "Loading..." if no active poll
   
2. **Start a Poll** (from moderator panel):
   - Go to `/moderator?campus=ascension`
   - Click "Start" on a poll
   - Verify the vote page updates to show the question and options

3. **Cast Votes**:
   - Open the vote page in multiple browser tabs/windows
   - Cast votes from different tabs (simulating different users)
   - Verify votes are recorded immediately

4. **Check Live Tally**:
   - On the vote page, watch the "Live Tally" section
   - Verify counts update in real-time as votes come in
   - Check that percentages are calculated correctly

### Step 3: Test Moderator Controls

1. **Start Poll**: Click "Start" on a scheduled poll
   - Verify poll state changes to `active`
   - Verify vote page shows the poll

2. **Show Results**: Click "Show Results" while poll is active
   - Verify poll state changes to `showing_results`
   - Verify vote page shows results view
   - Verify results display correctly

3. **Extend Time**: Click "Extend +5s" 
   - Verify poll end time extends by 5 seconds
   - Verify countdown updates

4. **End Poll**: Click "End"
   - Verify poll state changes to `closed`
   - Verify vote page shows "Get Ready" or next poll

5. **Next Poll**: Click "Next (by order)"
   - Should automatically close current active poll
   - Should start the next scheduled poll in order_index

### Step 4: Test Overlay

1. **Open Overlay**: Navigate to `/overlay?campus=ascension`
   - Should show chroma key green background (#00FF00)
   - Should display current poll question and options
   - Should show live vote counts and percentages
   - Should update in real-time

2. **Test with Active Poll**:
   - Start a poll from moderator panel
   - Verify overlay updates to show the poll
   - Cast votes and verify overlay updates live

### Step 5: Test Results Page

1. **Open Results**: Navigate to `/results?campus=ascension`
   - Should show the latest poll results
   - Should display all options with vote counts
   - Should show percentages

2. **Test with Multiple Polls**:
   - Complete multiple polls
   - Verify results page shows the most recent results
   - Check "Previous Results" section on vote page

### Step 6: Test Banner System

1. **Push Banner** (from moderator panel):
   - Fill in banner form:
     - Title: "Test Banner"
     - Body: "This is a test"
     - CTA Type: "link"
     - CTA Label: "Click Here"
     - CTA Payload: "https://example.com"
     - Duration: 10 seconds
   - Click "Push Banner"
   - Verify banner appears on vote page
   - Verify banner disappears after duration

2. **Clear Banner**:
   - Click "Clear" button
   - Verify banner is removed immediately

### Step 7: Test Real-time Updates

1. **Multi-Device Test**:
   - Open vote page on multiple devices/browsers
   - Cast votes from different devices
   - Verify all devices see updates in real-time
   - Verify no lag or missed updates

2. **Concurrent Actions**:
   - Have one person moderating
   - Have multiple people voting
   - Verify all actions sync correctly

## Test Checklist

- [ ] Vote page loads and shows correct state
- [ ] Polls can be started from moderator panel
- [ ] Votes can be cast and are recorded
- [ ] Live tally updates in real-time
- [ ] Results display correctly
- [ ] Moderator controls work (start, results, extend, end, next)
- [ ] Overlay displays correctly with chroma key
- [ ] Overlay updates in real-time
- [ ] Results page shows correct data
- [ ] Banner push/clear works
- [ ] Multiple devices sync correctly
- [ ] No console errors
- [ ] No build errors

## Troubleshooting

### Votes not appearing
- Check browser console for errors
- Verify Supabase connection
- Check RLS (Row Level Security) policies allow reads/inserts

### Real-time updates not working
- Check Supabase Realtime is enabled
- Verify WebSocket connections in browser dev tools
- Check Supabase dashboard for connection status

### Moderator actions failing
- Verify `ADMIN_TOKEN` is set correctly
- Check API route returns proper errors
- Verify service role key has proper permissions

### Build errors
- Ensure all environment variables are set
- Check Supabase client initialization
- Verify all dependencies are installed

## Performance Testing

1. **Load Test**: Cast 100+ votes quickly
   - Verify app remains responsive
   - Verify all votes are recorded
   - Check for any performance issues

2. **Concurrent Users**: Simulate 10+ simultaneous voters
   - Verify real-time updates work for all
   - Check database performance
   - Monitor Supabase connection limits

## Browser Compatibility

Test on:
- [ ] Chrome/Edge (Chromium)
- [ ] Safari
- [ ] Firefox
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Next Steps After Testing

Once all tests pass:
1. Document any issues found
2. Test with production-like data volumes
3. Verify error handling for edge cases
4. Test on production deployment (Vercel)




