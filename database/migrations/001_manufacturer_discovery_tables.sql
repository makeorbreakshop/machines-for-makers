-- Migration: Add manufacturer discovery system tables
-- Created: 2025-07-22
-- Description: Creates the core tables needed for the manufacturer website discovery and import system

-- Create manufacturer_sites table
CREATE TABLE IF NOT EXISTS manufacturer_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id),
  base_url text NOT NULL,
  sitemap_url text,
  scraping_config jsonb DEFAULT '{}',
  last_full_scan timestamp,
  scan_frequency interval DEFAULT '30 days',
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create discovered_machines table
CREATE TABLE IF NOT EXISTS discovered_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES manufacturer_sites(id),
  discovered_url text NOT NULL UNIQUE,
  page_title text,
  raw_html text,
  extracted_data jsonb,
  normalized_data jsonb,
  validation_status text DEFAULT 'pending',
  validation_errors jsonb,
  import_status text DEFAULT 'pending',
  machine_id uuid REFERENCES machines(id),
  duplicate_of_id uuid REFERENCES machines(id),
  similarity_score float,
  discovered_at timestamp DEFAULT now(),
  reviewed_at timestamp,
  reviewed_by text,
  notes text
);

-- Create site_scan_logs table
CREATE TABLE IF NOT EXISTS site_scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES manufacturer_sites(id),
  scan_type text NOT NULL,
  status text DEFAULT 'running',
  products_found integer DEFAULT 0,
  new_products integer DEFAULT 0,
  pages_crawled integer DEFAULT 0,
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  error_log jsonb,
  cost_usd decimal(10,4)
);

-- Create machine_type_specifications table
CREATE TABLE IF NOT EXISTS machine_type_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_type text NOT NULL,
  specification_key text NOT NULL,
  display_name text,
  data_type text,
  unit text,
  is_required boolean DEFAULT false,
  validation_rules jsonb,
  discovered_from text[],
  created_at timestamp DEFAULT now(),
  UNIQUE(machine_type, specification_key)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_manufacturer_sites_brand_id ON manufacturer_sites(brand_id);
CREATE INDEX IF NOT EXISTS idx_manufacturer_sites_active ON manufacturer_sites(is_active);
CREATE INDEX IF NOT EXISTS idx_discovered_machines_site_id ON discovered_machines(site_id);
CREATE INDEX IF NOT EXISTS idx_discovered_machines_status ON discovered_machines(import_status);
CREATE INDEX IF NOT EXISTS idx_discovered_machines_url ON discovered_machines(discovered_url);
CREATE INDEX IF NOT EXISTS idx_site_scan_logs_site_id ON site_scan_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_site_scan_logs_type ON site_scan_logs(scan_type);
CREATE INDEX IF NOT EXISTS idx_machine_type_specs_type ON machine_type_specifications(machine_type);

-- Add constraints
ALTER TABLE discovered_machines ADD CONSTRAINT check_validation_status 
  CHECK (validation_status IN ('pending', 'passed', 'failed'));
  
ALTER TABLE discovered_machines ADD CONSTRAINT check_import_status 
  CHECK (import_status IN ('pending', 'approved', 'rejected', 'duplicate', 'imported'));
  
ALTER TABLE site_scan_logs ADD CONSTRAINT check_scan_type 
  CHECK (scan_type IN ('discovery', 'update'));
  
ALTER TABLE site_scan_logs ADD CONSTRAINT check_status 
  CHECK (status IN ('running', 'completed', 'failed'));

-- Add RLS policies
ALTER TABLE manufacturer_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_machines ENABLE ROW LEVEL SECURITY;  
ALTER TABLE site_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_type_specifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all tables
CREATE POLICY "Allow authenticated users to read manufacturer_sites" ON manufacturer_sites
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read discovered_machines" ON discovered_machines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read site_scan_logs" ON site_scan_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read machine_type_specifications" ON machine_type_specifications
  FOR SELECT TO authenticated USING (true);

-- Allow service role to do everything (for admin operations)
CREATE POLICY "Allow service role full access to manufacturer_sites" ON manufacturer_sites
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to discovered_machines" ON discovered_machines
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to site_scan_logs" ON site_scan_logs
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to machine_type_specifications" ON machine_type_specifications
  FOR ALL TO service_role USING (true);