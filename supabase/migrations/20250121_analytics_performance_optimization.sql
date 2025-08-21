-- Analytics Performance Optimization Migration
-- This migration adds composite indexes and materialized views to speed up analytics queries

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================

-- Composite index for link_clicks date range + bot filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_link_clicks_date_bot 
ON link_clicks(clicked_at, is_bot) 
WHERE is_bot = false;

-- Composite index for email_subscribers date range queries
CREATE INDEX IF NOT EXISTS idx_email_subscribers_date_source 
ON email_subscribers(created_at, source, utm_source, utm_campaign);

-- Composite index for short_links campaign lookups
CREATE INDEX IF NOT EXISTS idx_short_links_campaign 
ON short_links(campaign) 
WHERE campaign IS NOT NULL;

-- Composite index for link_clicks with campaign data
CREATE INDEX IF NOT EXISTS idx_link_clicks_campaign_date 
ON link_clicks(utm_campaign, clicked_at) 
WHERE utm_campaign IS NOT NULL AND is_bot = false;

-- Composite index for attribution queries
CREATE INDEX IF NOT EXISTS idx_link_clicks_full_attribution 
ON link_clicks(clicked_at, utm_source, utm_medium, utm_campaign, campaign) 
WHERE is_bot = false;

-- Composite index for email subscribers attribution
CREATE INDEX IF NOT EXISTS idx_email_subscribers_full_attribution 
ON email_subscribers(created_at, utm_source, utm_medium, utm_campaign, source);

-- ============================================
-- MATERIALIZED VIEW FOR DAILY ANALYTICS
-- ============================================

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS analytics_daily_summary CASCADE;

-- Create materialized view for daily analytics summary
CREATE MATERIALIZED VIEW analytics_daily_summary AS
WITH daily_clicks AS (
    SELECT 
        DATE(clicked_at) as date,
        COALESCE(utm_campaign, campaign, utm_source, source, 'direct') as campaign_key,
        COALESCE(utm_source, source, 'direct') as source,
        utm_medium as medium,
        COUNT(*) as click_count,
        COUNT(DISTINCT visitor_id) as unique_visitors
    FROM link_clicks
    WHERE is_bot = false
    GROUP BY DATE(clicked_at), campaign_key, source, medium
),
daily_leads AS (
    SELECT 
        DATE(created_at) as date,
        COALESCE(utm_campaign, utm_source, source, 'direct') as campaign_key,
        COALESCE(utm_source, source, 'direct') as source,
        utm_medium as medium,
        COUNT(*) as lead_count,
        COUNT(DISTINCT email) as unique_leads,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count
    FROM email_subscribers
    GROUP BY DATE(created_at), campaign_key, source, medium
)
SELECT 
    COALESCE(dc.date, dl.date) as date,
    COALESCE(dc.campaign_key, dl.campaign_key) as campaign_key,
    COALESCE(dc.source, dl.source) as source,
    COALESCE(dc.medium, dl.medium) as medium,
    COALESCE(dc.click_count, 0) as clicks,
    COALESCE(dc.unique_visitors, 0) as unique_visitors,
    COALESCE(dl.lead_count, 0) as leads,
    COALESCE(dl.unique_leads, 0) as unique_leads,
    COALESCE(dl.confirmed_count, 0) as confirmed_leads,
    CASE 
        WHEN COALESCE(dc.click_count, 0) > 0 
        THEN COALESCE(dl.lead_count, 0)::float / dc.click_count::float 
        ELSE 0 
    END as conversion_rate
FROM daily_clicks dc
FULL OUTER JOIN daily_leads dl 
    ON dc.date = dl.date 
    AND dc.campaign_key = dl.campaign_key
    AND dc.source = dl.source
    AND COALESCE(dc.medium, '') = COALESCE(dl.medium, '');

-- Create index on materialized view for fast lookups
CREATE INDEX idx_analytics_daily_date ON analytics_daily_summary(date DESC);
CREATE INDEX idx_analytics_daily_campaign ON analytics_daily_summary(campaign_key);
CREATE INDEX idx_analytics_daily_source ON analytics_daily_summary(source);
CREATE INDEX idx_analytics_daily_date_campaign ON analytics_daily_summary(date DESC, campaign_key);

-- ============================================
-- MATERIALIZED VIEW FOR CAMPAIGN METADATA
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS campaign_metadata_cache CASCADE;

CREATE MATERIALIZED VIEW campaign_metadata_cache AS
SELECT DISTINCT
    campaign,
    metadata,
    COALESCE(
        metadata->>'video_title',
        metadata->>'description',
        campaign
    ) as display_title,
    metadata->>'campaign_type' as campaign_type
FROM short_links
WHERE campaign IS NOT NULL;

CREATE INDEX idx_campaign_metadata_campaign ON campaign_metadata_cache(campaign);

-- ============================================
-- FUNCTION TO REFRESH MATERIALIZED VIEWS
-- ============================================

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_metadata_cache;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SCHEDULED REFRESH (needs to be set up in Supabase dashboard)
-- ============================================
-- Note: In Supabase dashboard, create a cron job to run:
-- SELECT refresh_analytics_views();
-- Schedule: Every hour or as needed

-- ============================================
-- OPTIMIZED FUNCTION FOR ATTRIBUTION DATA
-- ============================================

CREATE OR REPLACE FUNCTION get_attribution_summary(
    start_date timestamp,
    end_date timestamp
)
RETURNS TABLE (
    campaign_key text,
    source text,
    medium text,
    display_title text,
    campaign_type text,
    total_clicks bigint,
    total_leads bigint,
    conversion_rate numeric,
    last_seen timestamp
) AS $$
BEGIN
    RETURN QUERY
    WITH summary AS (
        SELECT 
            ads.campaign_key,
            ads.source,
            ads.medium,
            SUM(ads.clicks) as total_clicks,
            SUM(ads.leads) as total_leads,
            MAX(ads.date) as last_date
        FROM analytics_daily_summary ads
        WHERE ads.date BETWEEN start_date::date AND end_date::date
        GROUP BY ads.campaign_key, ads.source, ads.medium
    )
    SELECT 
        s.campaign_key,
        s.source,
        s.medium,
        COALESCE(cmc.display_title, s.campaign_key) as display_title,
        cmc.campaign_type,
        s.total_clicks,
        s.total_leads,
        CASE 
            WHEN s.total_clicks > 0 
            THEN ROUND((s.total_leads::numeric / s.total_clicks::numeric) * 100, 2)
            ELSE 0 
        END as conversion_rate,
        s.last_date::timestamp as last_seen
    FROM summary s
    LEFT JOIN campaign_metadata_cache cmc ON s.campaign_key = cmc.campaign
    WHERE s.total_clicks > 0 OR s.total_leads > 0
    ORDER BY s.total_clicks DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON analytics_daily_summary TO authenticated, anon;
GRANT SELECT ON campaign_metadata_cache TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_attribution_summary TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_analytics_views TO authenticated;

-- ============================================
-- INITIAL REFRESH
-- ============================================

-- Refresh the materialized views with initial data
REFRESH MATERIALIZED VIEW analytics_daily_summary;
REFRESH MATERIALIZED VIEW campaign_metadata_cache;

-- Add comment to track migration purpose
COMMENT ON MATERIALIZED VIEW analytics_daily_summary IS 'Pre-aggregated daily analytics data for fast dashboard queries';
COMMENT ON MATERIALIZED VIEW campaign_metadata_cache IS 'Cached campaign metadata for fast lookups';
COMMENT ON FUNCTION get_attribution_summary IS 'Optimized function to get attribution data from materialized views';