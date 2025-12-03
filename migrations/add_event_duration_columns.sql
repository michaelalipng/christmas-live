-- Migration: Add duration_seconds and results_seconds columns to events table
-- Run this in your Supabase SQL editor

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS results_seconds INTEGER DEFAULT 8;

-- Optional: Update existing events with default values if they're null
UPDATE events 
SET 
  duration_seconds = COALESCE(duration_seconds, 30),
  results_seconds = COALESCE(results_seconds, 8)
WHERE duration_seconds IS NULL OR results_seconds IS NULL;

