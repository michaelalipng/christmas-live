-- Optional: Create table to store button clicks in database
-- Run this in Supabase SQL editor if you want to query button clicks from database
-- Otherwise, button clicks are logged to Vercel logs (see ANALYTICS_LOGS.md)

CREATE TABLE IF NOT EXISTS button_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  button TEXT NOT NULL,
  campus TEXT,
  metadata JSONB,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast queries by button and date
CREATE INDEX IF NOT EXISTS idx_button_clicks_button ON button_clicks(button);
CREATE INDEX IF NOT EXISTS idx_button_clicks_campus ON button_clicks(campus);
CREATE INDEX IF NOT EXISTS idx_button_clicks_created_at ON button_clicks(created_at);

-- Example queries:
-- Count clicks today for a specific button:
-- SELECT COUNT(*) FROM button_clicks 
-- WHERE button = 'learn_more_click' 
-- AND created_at >= CURRENT_DATE;

-- Count clicks by button today:
-- SELECT button, COUNT(*) as clicks 
-- FROM button_clicks 
-- WHERE created_at >= CURRENT_DATE 
-- GROUP BY button;

-- Count clicks by campus today:
-- SELECT campus, COUNT(*) as clicks 
-- FROM button_clicks 
-- WHERE created_at >= CURRENT_DATE 
-- GROUP BY campus;

