-- Migration: Add machine classification columns to discovered_urls table
-- Run this in Supabase SQL Editor

-- Add machine classification columns
ALTER TABLE discovered_urls
ADD COLUMN IF NOT EXISTS ml_classification text,
ADD COLUMN IF NOT EXISTS ml_confidence numeric(3,2),
ADD COLUMN IF NOT EXISTS ml_reason text,
ADD COLUMN IF NOT EXISTS machine_type text,
ADD COLUMN IF NOT EXISTS should_auto_skip boolean DEFAULT false;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_discovered_urls_ml_classification ON discovered_urls(ml_classification);
CREATE INDEX IF NOT EXISTS idx_discovered_urls_should_auto_skip ON discovered_urls(should_auto_skip);

-- Add comments
COMMENT ON COLUMN discovered_urls.ml_classification IS 'Machine learning classification: MACHINE, MATERIAL, ACCESSORY, PACKAGE, SERVICE, UNKNOWN';
COMMENT ON COLUMN discovered_urls.ml_confidence IS 'Confidence score from 0 to 1';
COMMENT ON COLUMN discovered_urls.ml_reason IS 'Reason for the classification';
COMMENT ON COLUMN discovered_urls.machine_type IS 'Type of machine if classified as MACHINE: laser_cutter, 3d_printer, cnc_machine, other';
COMMENT ON COLUMN discovered_urls.should_auto_skip IS 'Whether this URL should be auto-skipped based on ML classification';

-- Update existing records that have ML classification in error_message
UPDATE discovered_urls
SET 
  ml_classification = CASE 
    WHEN error_message LIKE 'ML: MACHINE%' THEN 'MACHINE'
    WHEN error_message LIKE 'ML: MATERIAL%' THEN 'MATERIAL'
    WHEN error_message LIKE 'ML: ACCESSORY%' THEN 'ACCESSORY'
    WHEN error_message LIKE 'ML: PACKAGE%' THEN 'PACKAGE'
    WHEN error_message LIKE 'ML: SERVICE%' THEN 'SERVICE'
    WHEN error_message LIKE 'ML: UNKNOWN%' THEN 'UNKNOWN'
    ELSE NULL
  END,
  should_auto_skip = CASE
    WHEN error_message LIKE 'ML: MATERIAL%' THEN true
    WHEN error_message LIKE 'ML: ACCESSORY%' THEN true
    WHEN error_message LIKE 'ML: SERVICE%' THEN true
    ELSE false
  END
WHERE error_message LIKE 'ML: %';

-- Clear the error_message for ML classifications after migration
UPDATE discovered_urls
SET error_message = NULL
WHERE error_message LIKE 'ML: %';