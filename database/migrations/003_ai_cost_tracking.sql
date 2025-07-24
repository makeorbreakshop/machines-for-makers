-- Migration 003: AI Cost Tracking Tables
-- Creates tables for tracking AI usage costs and budget management

-- Table for tracking individual AI cost entries
CREATE TABLE IF NOT EXISTS ai_cost_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type text NOT NULL, -- 'discovery', 'extraction', 'analysis'
    model_used text NOT NULL,     -- 'gpt-4', 'claude-3-sonnet', etc.
    tokens_used integer NOT NULL,
    cost_usd decimal(10,6) NOT NULL, -- Cost in USD with 6 decimal precision
    timestamp timestamp NOT NULL DEFAULT now(),
    site_id uuid REFERENCES manufacturer_sites(id) ON DELETE SET NULL,
    scan_id uuid, -- Reference to scan log
    url text,     -- URL processed
    success boolean DEFAULT true,
    created_at timestamp DEFAULT now()
);

-- Indexes for cost tracking
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_timestamp ON ai_cost_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_operation ON ai_cost_tracking(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_site_id ON ai_cost_tracking(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_date ON ai_cost_tracking(DATE(timestamp));

-- Table for budget alerts
CREATE TABLE IF NOT EXISTS budget_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_message text NOT NULL,
    cost_data text, -- JSON string with cost data
    created_at timestamp NOT NULL DEFAULT now(),
    alert_type text NOT NULL DEFAULT 'budget_exceeded',
    status text DEFAULT 'active', -- 'active', 'resolved', 'ignored'
    resolved_at timestamp,
    resolved_by text
);

-- Index for budget alerts
CREATE INDEX IF NOT EXISTS idx_budget_alerts_created_at ON budget_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_status ON budget_alerts(status);

-- RLS policies for cost tracking (admin access only)
ALTER TABLE ai_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for ai_cost_tracking (service role can read/write)
CREATE POLICY "Service role can manage ai_cost_tracking" ON ai_cost_tracking
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Policy for budget_alerts (service role can read/write)  
CREATE POLICY "Service role can manage budget_alerts" ON budget_alerts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create a view for daily cost summaries
CREATE OR REPLACE VIEW daily_cost_summary AS
SELECT 
    DATE(timestamp) as cost_date,
    operation_type,
    SUM(cost_usd) as total_cost,
    COUNT(*) as total_operations,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_operations,
    AVG(cost_usd) as average_cost,
    MAX(cost_usd) as max_cost,
    MIN(cost_usd) as min_cost
FROM ai_cost_tracking 
GROUP BY DATE(timestamp), operation_type
ORDER BY cost_date DESC, total_cost DESC;

-- Create a view for site cost summaries  
CREATE OR REPLACE VIEW site_cost_summary AS
SELECT 
    s.id as site_id,
    s.base_url,
    b.name as brand_name,
    COUNT(c.*) as total_operations,
    SUM(c.cost_usd) as total_cost,
    AVG(c.cost_usd) as average_cost,
    SUM(CASE WHEN c.success THEN 1 ELSE 0 END) as successful_operations,
    MAX(c.timestamp) as last_operation
FROM manufacturer_sites s
LEFT JOIN brands b ON s.brand_id = b.id
LEFT JOIN ai_cost_tracking c ON s.id = c.site_id
GROUP BY s.id, s.base_url, b.name
ORDER BY total_cost DESC NULLS LAST;

COMMENT ON TABLE ai_cost_tracking IS 'Tracks AI model usage and costs for all operations';
COMMENT ON TABLE budget_alerts IS 'Stores budget alerts when spending limits are exceeded';
COMMENT ON VIEW daily_cost_summary IS 'Daily summary of AI costs by operation type';
COMMENT ON VIEW site_cost_summary IS 'Cost summary by manufacturer site';