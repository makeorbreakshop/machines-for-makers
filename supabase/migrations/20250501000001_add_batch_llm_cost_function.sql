-- Function to calculate total LLM usage cost for a batch
CREATE OR REPLACE FUNCTION get_batch_llm_cost(batch_id_param UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    total_cost NUMERIC := 0;
BEGIN
    -- Calculate the total cost from llm_usage_tracking for the given batch
    SELECT COALESCE(SUM(estimated_cost), 0)
    INTO total_cost
    FROM llm_usage_tracking t
    JOIN batch_results br ON t.machine_id = br.machine_id::text
    WHERE br.batch_id = batch_id_param;

    RETURN total_cost;
END;
$$; 