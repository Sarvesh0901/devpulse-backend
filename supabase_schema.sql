-- ================================================================
-- DevPulse Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- 1. GitHub API response cache
CREATE TABLE IF NOT EXISTS github_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   TEXT        UNIQUE NOT NULL,
  data        JSONB       NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by key + expiry
CREATE INDEX IF NOT EXISTS idx_github_cache_key_expiry
  ON github_cache (cache_key, expires_at);

-- Enable RLS (service role key bypasses it, no anon access needed)
ALTER TABLE github_cache ENABLE ROW LEVEL SECURITY;

-- 2. User sessions (for audit trail & future revocation)
CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id     BIGINT      UNIQUE NOT NULL,
  github_login  TEXT        NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- Cleanup job: delete expired cache rows (run manually or via cron)
-- ================================================================
-- DELETE FROM github_cache WHERE expires_at < NOW();
