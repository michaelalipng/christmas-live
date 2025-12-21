# How to View Button Click Analytics

Button clicks are now tracked in **two ways**:

## 1. Vercel Analytics Dashboard (Recommended)

**Where to find:**
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Select your project → **Analytics** tab
- Scroll to **Events** section
- Look for:
  - `learn_more_click` - "Learn More" button clicks
  - `invite_friend_click` - "Invite a Friend" button clicks

**What you can see:**
- Total click counts
- Click counts by campus (via the `campus` parameter)
- Time-based trends
- Filter by date range

## 2. Vercel Logs (API Logs)

**Where to find:**
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Select your project → **Logs** tab
- Filter by: `[Button Click]`

**What you'll see:**
```
[Button Click] {"button":"learn_more_click","campus":"ascension","timestamp":"2024-12-25T10:30:00.000Z",...}
```

**To count clicks today:**
1. Go to Logs tab
2. Filter by: `[Button Click]`
3. Filter by date: Today
4. Count the log entries

**Or use the API endpoint:**
```bash
# Get button click stats
curl https://your-app.vercel.app/api/analytics/button-click?button=learn_more_click
```

## 3. Database Storage (Optional)

If you want to store clicks in your database for easier querying:

1. **Create the table:**
   - Run `migrations/create_button_clicks_table.sql` in Supabase SQL editor

2. **Enable database logging:**
   - Uncomment the database insert code in `src/app/api/analytics/button-click/route.ts`

3. **Query clicks:**
   ```sql
   -- Count clicks today
   SELECT COUNT(*) 
   FROM button_clicks 
   WHERE button = 'learn_more_click' 
   AND created_at >= CURRENT_DATE;
   
   -- Count all button clicks today
   SELECT button, COUNT(*) as clicks 
   FROM button_clicks 
   WHERE created_at >= CURRENT_DATE 
   GROUP BY button;
   
   -- Count by campus today
   SELECT campus, COUNT(*) as clicks 
   FROM button_clicks 
   WHERE created_at >= CURRENT_DATE 
   GROUP BY campus;
   ```

## Quick Reference

**Button Names:**
- `learn_more_click` - "Learn More" button
- `invite_friend_click` - "Invite a Friend" button

**Current Setup:**
- ✅ Vercel Analytics tracking (dashboard)
- ✅ API endpoint logging (Vercel logs)
- ⏸️ Database storage (optional - uncomment code to enable)

