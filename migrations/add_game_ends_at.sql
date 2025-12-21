-- Add game_ends_at column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS game_ends_at TIMESTAMPTZ;




