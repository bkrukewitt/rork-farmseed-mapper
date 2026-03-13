-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Adds last_accessed_at to farms so you can track when a farm was last used (e.g. for cleanup or analytics).
-- Farms are only created when a user explicitly creates one (not created automatically).

-- Add column (safe if already exists)
ALTER TABLE farms
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NOW();

-- Optional: backfill existing rows
UPDATE farms
SET last_accessed_at = created_at
WHERE last_accessed_at IS NULL;

-- Optional: index for queries that sort or filter by last access
CREATE INDEX IF NOT EXISTS idx_farms_last_accessed_at ON farms(last_accessed_at);
