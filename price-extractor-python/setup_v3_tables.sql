-- Laser Price Tracker V3 Database Schema

-- Create the machines_latest table
CREATE TABLE IF NOT EXISTS machines_latest (
    machine_id TEXT NOT NULL,
    variant_attribute TEXT NOT NULL DEFAULT 'DEFAULT',
    machines_latest_price NUMERIC,
    currency TEXT DEFAULT 'USD',
    last_checked TIMESTAMP WITH TIME ZONE,
    tier TEXT,
    confidence REAL,
    manual_review_flag BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (machine_id, variant_attribute)
);

-- Create the variant_extraction_config table
CREATE TABLE IF NOT EXISTS variant_extraction_config (
    machine_id TEXT NOT NULL,
    variant_attribute TEXT NOT NULL DEFAULT 'DEFAULT',
    domain TEXT NOT NULL,
    requires_js_interaction BOOLEAN DEFAULT FALSE,
    api_endpoint_template TEXT,
    api_endpoint_discovered_at TIMESTAMP WITH TIME ZONE,
    css_price_selector TEXT,
    js_click_sequence JSONB,
    min_extraction_confidence REAL DEFAULT 0.85,
    min_validation_confidence REAL DEFAULT 0.90,
    sanity_check_threshold REAL DEFAULT 0.25,
    PRIMARY KEY (machine_id, variant_attribute, domain)
);

-- Create the llm_usage_tracking table
CREATE TABLE IF NOT EXISTS llm_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    machine_id TEXT,
    variant_attribute TEXT DEFAULT 'DEFAULT',
    model TEXT,
    tier TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    estimated_cost NUMERIC,
    success BOOLEAN
);

-- Add new columns to price_history table
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS variant_attribute TEXT DEFAULT 'DEFAULT';
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS extracted_confidence REAL;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS validation_confidence REAL;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Modify machine_id in price_history to TEXT (if not already)
-- NOTE: This requires migration of existing data and is a potentially breaking change
-- CREATE TEMPORARY TABLE temp_price_history AS SELECT * FROM price_history;
-- ALTER TABLE price_history DROP COLUMN machine_id;
-- ALTER TABLE price_history ADD COLUMN machine_id TEXT;
-- UPDATE price_history p
-- SET machine_id = t.machine_id::TEXT
-- FROM temp_price_history t
-- WHERE p.id = t.id;
-- DROP TABLE temp_price_history;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_machines_latest_machine_id ON machines_latest(machine_id);
CREATE INDEX IF NOT EXISTS idx_variant_extraction_config_machine_id ON variant_extraction_config(machine_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_tracking_machine_id ON llm_usage_tracking(machine_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_tracking_timestamp ON llm_usage_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_price_history_variant ON price_history(machine_id, variant_attribute);

-- Migration script to populate machines_latest from most recent price_history entries
-- This should be run separately after table creation
-- INSERT INTO machines_latest (machine_id, variant_attribute, machines_latest_price, currency, last_checked, tier)
-- SELECT 
--     ph.machine_id::TEXT,
--     'DEFAULT' as variant_attribute,
--     ph.price as machines_latest_price,
--     ph.currency,
--     ph.date as last_checked,
--     'MIGRATION' as tier
-- FROM price_history ph
-- INNER JOIN (
--     SELECT machine_id, MAX(date) as max_date
--     FROM price_history
--     GROUP BY machine_id
-- ) latest ON ph.machine_id = latest.machine_id AND ph.date = latest.max_date
-- ON CONFLICT (machine_id, variant_attribute) DO UPDATE
-- SET 
--     machines_latest_price = EXCLUDED.machines_latest_price,
--     currency = EXCLUDED.currency,
--     last_checked = EXCLUDED.last_checked,
--     tier = EXCLUDED.tier; 