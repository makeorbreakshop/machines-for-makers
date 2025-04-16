-- Add indexes to improve query performance and reduce CPU usage

-- Index for batch_results table to improve lookup by batch_id
CREATE INDEX IF NOT EXISTS idx_batch_results_batch_id ON batch_results (batch_id);

-- Index for machines table to improve price update queries
CREATE INDEX IF NOT EXISTS idx_machines_html_timestamp ON machines (html_timestamp);

-- Index for machines to optimize product_link queries
CREATE INDEX IF NOT EXISTS idx_machines_product_link ON machines (product_link) WHERE product_link IS NOT NULL;

-- Index for price_history to improve machine lookups
CREATE INDEX IF NOT EXISTS idx_price_history_machine_id ON price_history (machine_id);

-- Index for price_history to improve date-based queries
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history (date);

-- Index for batches table
CREATE INDEX IF NOT EXISTS idx_batches_id ON batches (id);

-- Analyze tables to update query planner statistics
ANALYZE batch_results;
ANALYZE machines;
ANALYZE price_history;
ANALYZE batches;
