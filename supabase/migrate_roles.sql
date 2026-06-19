-- Run in Supabase SQL Editor if /api/auth/me returns 500 after dual-role update.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT;

UPDATE user_profiles
SET roles = json_build_array(role)::text
WHERE roles IS NULL OR roles = '';
