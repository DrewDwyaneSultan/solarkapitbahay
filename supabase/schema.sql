-- SolarKapitBahay Phase 1 schema (PostgreSQL / Supabase)
-- Run in Supabase SQL Editor, or let the FastAPI backend auto-create on startup.

CREATE TABLE IF NOT EXISTS barangays (
    id                      SERIAL PRIMARY KEY,
    name                    TEXT NOT NULL,
    contact_email           TEXT,
    mqtt_broker_host        TEXT,
    mqtt_broker_port        INTEGER DEFAULT 1883,
    battery_low_threshold_pct INTEGER DEFAULT 20,
    auto_device_discovery   SMALLINT DEFAULT 1,
    email_notifications     SMALLINT DEFAULT 1,
    location_lat            DOUBLE PRECISION,
    location_lon            DOUBLE PRECISION,
    timezone                TEXT DEFAULT 'Asia/Manila',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS households (
    id                      TEXT PRIMARY KEY,
    barangay_id             INTEGER NOT NULL REFERENCES barangays(id) ON DELETE CASCADE,
    head_name               TEXT NOT NULL,
    purok                   TEXT,
    address                 TEXT,
    has_solar               SMALLINT DEFAULT 0,
    has_battery             SMALLINT DEFAULT 0,
    battery_capacity_kwh    DOUBLE PRECISION,
    battery_model           TEXT,
    income_tier             TEXT CHECK (income_tier IN ('low','mid','high')),
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','pending','inactive')),
    circuit_key             TEXT,
    circuit_name            TEXT,
    registered_at           TIMESTAMPTZ,
    approved_by_user_id     INTEGER
);

CREATE TABLE IF NOT EXISTS datasets (
    id                      SERIAL PRIMARY KEY,
    dataset_id              TEXT NOT NULL UNIQUE,
    source_file             TEXT,
    household_count         INTEGER,
    hourly_rows             INTEGER,
    location                TEXT,
    imported_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active               SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS hourly_energy_records (
    id                      SERIAL PRIMARY KEY,
    dataset_id              INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    household_id            TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    hour                    INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
    load_kwh                DOUBLE PRECISION,
    solar_kwh               DOUBLE PRECISION,
    net_load_kwh            DOUBLE PRECISION,
    battery_soc_pct         DOUBLE PRECISION,
    grid_import_kwh         DOUBLE PRECISION,
    grid_export_kwh         DOUBLE PRECISION,
    tou_period              TEXT,
    tou_rate_php            DOUBLE PRECISION,
    UNIQUE (dataset_id, household_id, hour)
);

CREATE TABLE IF NOT EXISTS community_batteries (
    id                      SERIAL PRIMARY KEY,
    barangay_id             INTEGER NOT NULL UNIQUE REFERENCES barangays(id) ON DELETE CASCADE,
    capacity_kwh            DOUBLE PRECISION NOT NULL,
    efficiency              DOUBLE PRECISION DEFAULT 0.90,
    min_soc_pct             DOUBLE PRECISION DEFAULT 20,
    max_soc_pct             DOUBLE PRECISION DEFAULT 95,
    max_charge_kw           DOUBLE PRECISION DEFAULT 5.0,
    max_discharge_kw        DOUBLE PRECISION DEFAULT 5.0,
    battery_type            TEXT DEFAULT 'LiFePO4'
);

CREATE TABLE IF NOT EXISTS simulation_runs (
    id                      SERIAL PRIMARY KEY,
    barangay_id             INTEGER REFERENCES barangays(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    algorithm               TEXT NOT NULL,
    households              INTEGER NOT NULL,
    battery_capacity_kwh    DOUBLE PRECISION NOT NULL,
    execution_ms            DOUBLE PRECISION NOT NULL,
    params_json             JSONB NOT NULL,
    results_json            JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hourly_energy_household ON hourly_energy_records(household_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_created ON simulation_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS user_profiles (
    id                      TEXT PRIMARY KEY,
    email                   TEXT NOT NULL UNIQUE,
    role                    TEXT NOT NULL CHECK (role IN ('operator','household')),
    display_name            TEXT NOT NULL,
    household_id            TEXT REFERENCES households(id) ON DELETE SET NULL,
    address                 TEXT,
    has_solar               SMALLINT DEFAULT 0,
    has_battery             SMALLINT DEFAULT 0,
    battery_model           TEXT,
    battery_capacity_kwh    DOUBLE PRECISION,
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','pending','inactive')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
