-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    total_machines INTEGER DEFAULT 0,
    days_threshold INTEGER,
    created_by TEXT,
    batch_type TEXT DEFAULT 'price_update',
    status TEXT DEFAULT 'in_progress',
    metadata JSONB
);

-- Create batch_results table to store individual machine results
CREATE TABLE IF NOT EXISTS batch_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id),
    machine_id UUID REFERENCES machines(id),
    machine_name TEXT,
    url TEXT,
    success BOOLEAN,
    old_price NUMERIC,
    new_price NUMERIC,
    price_change NUMERIC,
    percentage_change NUMERIC,
    error TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds NUMERIC,
    extraction_method TEXT,
    http_status INTEGER,
    html_size INTEGER,
    extraction_attempts JSONB
);

-- Create stored procedure for getting batch statistics efficiently
CREATE OR REPLACE FUNCTION get_batch_stats(batch_id_param UUID)
RETURNS TABLE (
    total_machines INTEGER,
    completed_machines INTEGER,
    successful_machines INTEGER,
    failed_machines INTEGER,
    updated_prices INTEGER,
    unchanged_prices INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT total_machines FROM batches WHERE id = batch_id_param),
        COUNT(*)::INTEGER AS completed_machines,
        COUNT(CASE WHEN success = true THEN 1 END)::INTEGER AS successful_machines,
        COUNT(CASE WHEN success = false THEN 1 END)::INTEGER AS failed_machines,
        COUNT(CASE WHEN success = true AND old_price != new_price THEN 1 END)::INTEGER AS updated_prices,
        COUNT(CASE WHEN success = true AND old_price = new_price THEN 1 END)::INTEGER AS unchanged_prices
    FROM batch_results
    WHERE batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_batch_results_batch_id ON batch_results (batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_results_machine_id ON batch_results (machine_id);
CREATE INDEX IF NOT EXISTS idx_batch_results_success ON batch_results (success);
CREATE INDEX IF NOT EXISTS idx_batches_id ON batches (id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches (status);

-- Add RLS policies to secure the data
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_results ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read batch data
CREATE POLICY batches_read_policy ON batches
    FOR SELECT USING (true);

-- Allow anyone to read batch results
CREATE POLICY batch_results_read_policy ON batch_results
    FOR SELECT USING (true);

-- Only allow the service role to modify data
CREATE POLICY batches_insert_policy ON batches
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
    
CREATE POLICY batches_update_policy ON batches
    FOR UPDATE USING (auth.role() = 'service_role');
    
CREATE POLICY batch_results_insert_policy ON batch_results
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
    
CREATE POLICY batch_results_update_policy ON batch_results
    FOR UPDATE USING (auth.role() = 'service_role');
