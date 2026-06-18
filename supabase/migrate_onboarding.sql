-- Run this in Supabase SQL Editor if schema.sql failed partway through.
-- Safe to run multiple times (idempotent).

-- ---------------------------------------------------------------------------
-- 1. Upgrade existing tables (barangays, households)
-- ---------------------------------------------------------------------------
ALTER TABLE barangays ADD COLUMN IF NOT EXISTS barangay_code TEXT;
ALTER TABLE barangays ADD COLUMN IF NOT EXISTS city_municipality TEXT;
ALTER TABLE barangays ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE barangays ADD COLUMN IF NOT EXISTS operator_user_id TEXT;

UPDATE barangays
SET barangay_code = 'SK-LEGACY-' || LPAD(id::text, 4, '0')
WHERE barangay_code IS NULL;

ALTER TABLE households ADD COLUMN IF NOT EXISTS household_code TEXT;
ALTER TABLE households ADD COLUMN IF NOT EXISTS claimable SMALLINT DEFAULT 0;

UPDATE households
SET household_code = 'SK-LEGACY-H' || REPLACE(id, '-', ''),
    claimable = 1
WHERE household_code IS NULL AND id LIKE 'HH-%';

-- ---------------------------------------------------------------------------
-- 2. Create auth / onboarding tables if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id                      TEXT PRIMARY KEY,
    email                   TEXT NOT NULL UNIQUE,
    role                    TEXT NOT NULL CHECK (role IN ('operator','household')),
    display_name            TEXT NOT NULL,
    barangay_id             INTEGER REFERENCES barangays(id) ON DELETE SET NULL,
    household_id            TEXT REFERENCES households(id) ON DELETE SET NULL,
    address                 TEXT,
    has_solar               SMALLINT DEFAULT 0,
    has_battery             SMALLINT DEFAULT 0,
    battery_model           TEXT,
    battery_capacity_kwh    DOUBLE PRECISION,
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','pending','inactive','rejected')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS barangay_id INTEGER REFERENCES barangays(id) ON DELETE SET NULL;

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

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_barangay ON user_profiles(barangay_id);
CREATE INDEX IF NOT EXISTS idx_household_registrations_barangay ON household_registrations(barangay_id);
CREATE INDEX IF NOT EXISTS idx_household_registrations_status ON household_registrations(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_households_code ON households(household_code) WHERE household_code IS NOT NULL;
