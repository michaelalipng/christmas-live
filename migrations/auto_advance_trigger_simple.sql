-- Simplified Auto-Advance Trigger
-- Run this in your Supabase SQL Editor
-- This trigger automatically starts the next poll when one closes

-- First, drop any existing triggers
DROP TRIGGER IF EXISTS trigger_auto_advance_next_poll ON polls;
DROP FUNCTION IF EXISTS auto_advance_next_poll();

-- Function to start the next poll when a poll closes
CREATE OR REPLACE FUNCTION auto_advance_next_poll()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id UUID;
  v_auto_advance BOOLEAN;
  v_duration_seconds INTEGER;
  v_results_seconds INTEGER;
  v_next_poll_id UUID;
  v_poll_count INTEGER;
  v_now TIMESTAMPTZ;
BEGIN
  -- Only proceed if the poll was just closed (state changed TO closed)
  IF NEW.state != 'closed' OR OLD.state = 'closed' THEN
    RETURN NEW;
  END IF;
  
  v_event_id := NEW.event_id;
  v_now := NOW();
  
  -- Check if auto_advance is enabled for this event
  SELECT 
    COALESCE(auto_advance, false),
    COALESCE(duration_seconds, 30),
    COALESCE(results_seconds, 8)
  INTO v_auto_advance, v_duration_seconds, v_results_seconds
  FROM events
  WHERE id = v_event_id;
  
  -- Only proceed if auto_advance is enabled
  IF NOT v_auto_advance THEN
    RETURN NEW;
  END IF;
  
  -- Count total polls for this event
  SELECT COUNT(*) INTO v_poll_count
  FROM polls
  WHERE event_id = v_event_id;
  
  -- Find the next poll to start
  -- Strategy: Find poll created after this one, or loop back to first
  IF v_poll_count = 1 THEN
    -- Only one poll - loop back to itself
    v_next_poll_id := NEW.id;
  ELSE
    -- Try to find a poll created after this one
    SELECT id INTO v_next_poll_id
    FROM polls
    WHERE event_id = v_event_id
      AND state IN ('scheduled', 'closed')
      AND id != NEW.id
      AND created_at > NEW.created_at
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If no later poll, loop back to first poll
    IF v_next_poll_id IS NULL THEN
      SELECT id INTO v_next_poll_id
      FROM polls
      WHERE event_id = v_event_id
        AND state IN ('scheduled', 'closed')
        AND id != NEW.id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;
  
  -- Start the next poll if we found one
  IF v_next_poll_id IS NOT NULL THEN
    UPDATE polls
    SET 
      state = 'active',
      starts_at = v_now,
      ends_at = v_now + (v_duration_seconds || ' seconds')::INTERVAL,
      results_until = v_now + ((v_duration_seconds + v_results_seconds) || ' seconds')::INTERVAL,
      duration_seconds = v_duration_seconds,
      results_seconds = v_results_seconds
    WHERE id = v_next_poll_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_auto_advance_next_poll
  AFTER UPDATE OF state ON polls
  FOR EACH ROW
  WHEN (NEW.state = 'closed' AND OLD.state != 'closed')
  EXECUTE FUNCTION auto_advance_next_poll();

-- Test the trigger (optional - you can run this to verify)
-- SELECT 'Trigger created successfully!' AS status;



