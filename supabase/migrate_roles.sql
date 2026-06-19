-- Run in Supabase SQL Editor if sign-in shows "Auth failed (500)".
-- Safe to run multiple times.

ALTER TABLE barangays ADD COLUMN IF NOT EXISTS operator_user_id TEXT;
ALTER TABLE barangays ADD COLUMN IF NOT EXISTS barangay_code TEXT;
ALTER TABLE barangays ADD COLUMN IF NOT EXISTS city_municipality TEXT;
ALTER TABLE barangays ADD COLUMN IF NOT EXISTS province TEXT;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS barangay_id INTEGER REFERENCES barangays(id) ON DELETE SET NULL;

UPDATE user_profiles
SET roles = json_build_array(role)::text
WHERE roles IS NULL OR roles = '';

CREATE TABLE IF NOT EXISTS household_registrations (
    id                      SERIAL PRIMARY KEY,
    barangay_id             INTEGER NOT NULL REFERENCES barangays(id) ON DELETE CASCADE,
    applicant_user_id       TEXT NOT NULL,
    applicant_email         TEXT NOT NULL,
    display_name            TEXT NOT NULL,
    address                 TEXT,
    purok                   TEXT,
    has_solar               SMALLINT DEFAULT 0,
    has_battery             SMALLINT DEFAULT 0,
    battery_model           TEXT,
    battery_capacity_kwh    DOUBLE PRECISION,
    household_id            TEXT REFERENCES households(id) ON DELETE SET NULL,
    status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
    rejection_reason        TEXT,
    reviewed_by_user_id     TEXT,
    reviewed_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);
