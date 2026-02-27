-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Farms table
CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farm members
CREATE TABLE IF NOT EXISTS farm_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(farm_id, device_id)
);

-- Farm data (stores all synced items as JSONB)
CREATE TABLE IF NOT EXISTS farm_data (
  id TEXT NOT NULL,
  farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('entry', 'field', 'inventory', 'inventory_usage')),
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, farm_id)
);

CREATE INDEX IF NOT EXISTS idx_farm_data_farm_type ON farm_data(farm_id, data_type);

-- RLS Policies (allow anon access since we use anon key without auth)
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on farms" ON farms FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on farm_members" ON farm_members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on farm_data" ON farm_data FOR ALL TO anon USING (true) WITH CHECK (true);
