-- Create a function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metadata_cache;
END;
$$ LANGUAGE plpgsql;

-- Set up a cron job to refresh every 15 minutes
-- Note: You need to enable pg_cron extension first if not already enabled
SELECT cron.schedule(
    'refresh-analytics-views',
    '*/15 * * * *', -- Every 15 minutes
    'SELECT refresh_analytics_views();'
);

-- To manually refresh right now:
SELECT refresh_analytics_views();