-- Migration: Auto-advance trigger to start next poll when current one closes
-- Run this in your Supabase SQL editor

-- Function to start the next poll when a poll closes
CREATE OR REPLACE FUNCTION auto_advance_next_poll()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id UUID;
  v_auto_advance BOOLEAN;
  v_duration_seconds INTEGER;
  v_results_seconds INTEGER;
  v_next_poll RECORD;
  v_now TIMESTAMPTZ;
  v_starts_at TIMESTAMPTZ;
  v_ends_at TIMESTAMPTZ;
  v_results_until TIMESTAMPTZ;
  v_poll_count INTEGER;
BEGIN
  -- Only proceed if the poll was just closed
  IF NEW.state != 'closed' OR OLD.state = 'closed' THEN
    RETURN NEW;
  END IF;
  
  v_event_id := NEW.event_id;
  v_now := NOW();
  
  -- Check if auto_advance is enabled for this event
  SELECT auto_advance, COALESCE(duration_seconds, 30), COALESCE(results_seconds, 8)
  INTO v_auto_advance, v_duration_seconds, v_results_seconds
  FROM events
  WHERE id = v_event_id;
  
  -- Only proceed if auto_advance is enabled
  IF NOT v_auto_advance THEN
    RETURN NEW;
  END IF;
  
  -- Find the next poll to start
  -- First, try to find a poll created after this one
  SELECT *
  INTO v_next_poll
  FROM polls
  WHERE event_id = v_event_id
    AND state IN ('scheduled', 'closed')
    AND id != NEW.id
    AND created_at > NEW.created_at
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If no later poll found, loop back to the first poll (oldest created_at)
  -- This handles both: multiple polls looping, and single poll looping back to itself
  IF v_next_poll IS NULL THEN
    -- Check total poll count first
    SELECT COUNT(*) INTO v_poll_count
    FROM polls
    WHERE event_id = v_event_id;
    
    -- If only one poll exists, loop back to itself
    IF v_poll_count = 1 THEN
      SELECT * INTO v_next_poll FROM polls WHERE id = NEW.id;
    ELSE
      -- Otherwise, find the first poll (excluding the one we just closed)
      SELECT *
      INTO v_next_poll
      FROM polls
      WHERE event_id = v_event_id
        AND state IN ('scheduled', 'closed')
        AND id != NEW.id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;
  
  -- If we found a next poll, start it
  IF v_next_poll IS NOT NULL THEN
    v_starts_at := v_now;
    v_ends_at := v_now + (v_duration_seconds || ' seconds')::INTERVAL;
    v_results_until := v_ends_at + (v_results_seconds || ' seconds')::INTERVAL;
    
    UPDATE polls
    SET 
      state = 'active',
      starts_at = v_starts_at,
      ends_at = v_ends_at,
      results_until = v_results_until,
      duration_seconds = v_duration_seconds,
      results_seconds = v_results_seconds
    WHERE id = v_next_poll.id;
    
    RAISE NOTICE 'Auto-advanced to poll %', v_next_poll.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function when a poll state changes to closed
DROP TRIGGER IF EXISTS trigger_auto_advance_next_poll ON polls;
CREATE TRIGGER trigger_auto_advance_next_poll
  AFTER UPDATE OF state ON polls
  FOR EACH ROW
  WHEN (NEW.state = 'closed' AND OLD.state != 'closed')
  EXECUTE FUNCTION auto_advance_next_poll();

-- Also handle transition from active -> showing_results
CREATE OR REPLACE FUNCTION auto_advance_to_results()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id UUID;
  v_auto_advance BOOLEAN;
  v_results_seconds INTEGER;
  v_results_until TIMESTAMPTZ;
BEGIN
  -- Only proceed if the poll was just set to showing_results
  IF NEW.state != 'showing_results' OR OLD.state = 'showing_results' THEN
    RETURN NEW;
  END IF;
  
  v_event_id := NEW.event_id;
  
  -- Check if auto_advance is enabled for this event
  SELECT auto_advance, COALESCE(results_seconds, 8)
  INTO v_auto_advance, v_results_seconds
  FROM events
  WHERE id = v_event_id;
  
  -- Only proceed if auto_advance is enabled
  IF NOT v_auto_advance THEN
    RETURN NEW;
  END IF;
  
  -- Set results_until if not already set
  IF NEW.results_until IS NULL THEN
    v_results_until := NOW() + (v_results_seconds || ' seconds')::INTERVAL;
    
    UPDATE polls
    SET results_until = v_results_until,
        results_seconds = v_results_seconds
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle active -> showing_results transition
DROP TRIGGER IF EXISTS trigger_auto_advance_to_results ON polls;
CREATE TRIGGER trigger_auto_advance_to_results
  AFTER UPDATE OF state ON polls
  FOR EACH ROW
  WHEN (NEW.state = 'showing_results' AND OLD.state = 'active')
  EXECUTE FUNCTION auto_advance_to_results();

-- Function to transition from showing_results to closed when results_until passes
-- This needs to be called periodically, but we can use a simpler approach:
-- The client-side polling will handle checking results_until and closing polls
-- The trigger above will then start the next poll

