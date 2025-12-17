-- Migration: Add game_ended column to events table
-- Run this in your Supabase SQL editor

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS game_ended BOOLEAN DEFAULT false;

-- Set all existing events to not ended
UPDATE events 
SET game_ended = false
WHERE game_ended IS NULL;

