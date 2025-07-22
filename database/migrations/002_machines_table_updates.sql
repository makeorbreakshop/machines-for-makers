-- Migration: Add variant and lifecycle columns to machines table  
-- Created: 2025-07-22
-- Description: Adds columns needed for variant grouping, lifecycle tracking, and flexible specifications

-- Add variant grouping columns
ALTER TABLE machines ADD COLUMN IF NOT EXISTS parent_machine_id uuid REFERENCES machines(id);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_variant boolean DEFAULT false;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS variant_name text;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS variant_order integer DEFAULT 0;

-- Add lifecycle tracking columns
ALTER TABLE machines ADD COLUMN IF NOT EXISTS lifecycle_status text DEFAULT 'active';
ALTER TABLE machines ADD COLUMN IF NOT EXISTS last_seen_at timestamp DEFAULT now();
ALTER TABLE machines ADD COLUMN IF NOT EXISTS discontinued_at timestamp;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS discovery_source text DEFAULT 'manual';

-- Add flexible specifications column
ALTER TABLE machines ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_machines_parent_id ON machines(parent_machine_id);
CREATE INDEX IF NOT EXISTS idx_machines_is_variant ON machines(is_variant);
CREATE INDEX IF NOT EXISTS idx_machines_lifecycle_status ON machines(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_machines_discovery_source ON machines(discovery_source);
CREATE INDEX IF NOT EXISTS idx_machines_last_seen ON machines(last_seen_at);

-- Add constraints
ALTER TABLE machines ADD CONSTRAINT check_lifecycle_status 
  CHECK (lifecycle_status IN ('active', 'discontinued', 'coming_soon', 'archived'));

ALTER TABLE machines ADD CONSTRAINT check_discovery_source 
  CHECK (discovery_source IN ('manual', 'crawler', 'api'));

-- Add comments for documentation
COMMENT ON COLUMN machines.parent_machine_id IS 'Links variants to their parent machine';
COMMENT ON COLUMN machines.is_variant IS 'True if this machine is a variant of another';
COMMENT ON COLUMN machines.variant_name IS 'Name of the variant (e.g., "20W", "Large Format")';
COMMENT ON COLUMN machines.variant_order IS 'Display order for variants (0 = primary)';
COMMENT ON COLUMN machines.lifecycle_status IS 'Current status of the machine in its lifecycle';
COMMENT ON COLUMN machines.last_seen_at IS 'Last time this machine was seen during crawling';
COMMENT ON COLUMN machines.discontinued_at IS 'When the machine was discontinued';
COMMENT ON COLUMN machines.discovery_source IS 'How this machine was added to the database';
COMMENT ON COLUMN machines.specifications IS 'Machine-type specific specifications as JSON';