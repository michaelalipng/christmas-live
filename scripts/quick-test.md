# Quick Test Instructions

## Option 1: Automated Setup (Recommended)

Run this command to set up test data:

```bash
npm run test-setup
```

Then follow the URLs printed by the script.

## Option 2: Manual Testing (No Script)

### 1. Create Test Data in Supabase

Go to your Supabase dashboard and create:

**Campus:**
```sql
INSERT INTO campuses (name, slug) 
VALUES ('Ascension Campus', 'ascension')
RETURNING id;
```

**Event:**
```sql
INSERT INTO events (campus_id, name, auto_advance, gap_seconds)
VALUES ('<campus_id>', 'Test Event', false, 5)
RETURNING id;
```

**Poll:**
```sql
INSERT INTO polls (event_id, question, order_index, state, duration_seconds, results_seconds)
VALUES ('<event_id>', 'What is your favorite Christmas tradition?', 1, 'scheduled', 30, 8)
RETURNING id;
```

**Poll Options:**
```sql
INSERT INTO poll_options (poll_id, label, order_index) VALUES
('<poll_id>', 'Decorating the tree', 0),
('<poll_id>', 'Giving gifts', 1),
('<poll_id>', 'Christmas dinner', 2),
('<poll_id>', 'Watching movies', 3);
```

### 2. Test the App

1. **Moderator Panel**: `https://your-app.vercel.app/moderator?campus=ascension`
   - Click "Start" on a poll
   - Watch for real-time updates

2. **Vote Page**: `https://your-app.vercel.app/ascension/vote`
   - Should show the active poll
   - Cast votes
   - Watch live tally update

3. **Overlay**: `https://your-app.vercel.app/overlay?campus=ascension`
   - Should show chroma key green
   - Should display poll and live results

4. **Results**: `https://your-app.vercel.app/results?campus=ascension`
   - Should show latest poll results

### 3. Test Flow

1. Start a poll from moderator panel
2. Open vote page in 2-3 browser tabs
3. Cast votes from different tabs
4. Watch live tally update in real-time
5. Click "Show Results" in moderator panel
6. Verify results display correctly
7. Click "Next" to advance to next poll

## What to Look For

✅ Votes appear immediately  
✅ Live tally updates in real-time  
✅ Results show correct counts  
✅ Overlay displays correctly  
✅ No console errors  
✅ All moderator buttons work  




