# Analytics Dashboard Performance Optimization

## Overview
The analytics dashboard was experiencing slow load times (5-10+ seconds) due to inefficient database queries. This document outlines the optimizations implemented to improve performance.

## Performance Issues Identified

### 1. Multiple Sequential Queries
- **Problem**: Each API endpoint made 5-10+ separate database queries
- **Impact**: High latency due to network round trips
- **Solution**: Consolidated queries using materialized views

### 2. Missing Composite Indexes
- **Problem**: Queries filtering on multiple columns lacked composite indexes
- **Impact**: Full table scans on large tables (link_clicks, email_subscribers)
- **Solution**: Added composite indexes for common query patterns

### 3. Client-Side Aggregation
- **Problem**: Raw data fetched and aggregated in JavaScript
- **Impact**: Large data transfers and CPU-intensive processing
- **Solution**: Pre-aggregated data in materialized views

### 4. Redundant Data Fetching
- **Problem**: Same data queried multiple times across endpoints
- **Impact**: Unnecessary database load
- **Solution**: Shared materialized views and caching

## Optimizations Implemented

### Database-Level Optimizations

#### 1. Composite Indexes
Added indexes for common query patterns:
```sql
-- Date range + bot filtering (most common pattern)
idx_link_clicks_date_bot ON link_clicks(clicked_at, is_bot) WHERE is_bot = false

-- Attribution queries
idx_link_clicks_full_attribution ON link_clicks(clicked_at, utm_source, utm_medium, utm_campaign)
idx_email_subscribers_full_attribution ON email_subscribers(created_at, utm_source, utm_medium, utm_campaign)
```

#### 2. Materialized Views
Created pre-aggregated views updated hourly:

**`analytics_daily_summary`**
- Pre-aggregated daily metrics by campaign/source
- Reduces query complexity from O(n) to O(1) for daily stats
- Updates hourly via `refresh_analytics_views()` function

**`campaign_metadata_cache`**
- Cached campaign metadata for fast lookups
- Eliminates JOIN operations on short_links table

#### 3. Optimized Database Functions
**`get_attribution_summary()`**
- Single function call replaces 5+ separate queries
- Returns fully aggregated attribution data
- Leverages materialized views for speed

### API-Level Optimizations

Created optimized versions of API endpoints:
- `/api/admin/analytics/attribution/route-optimized.ts`
- `/api/admin/analytics/attribution/time-series/route-optimized.ts`

**Benefits:**
- Reduced database queries from 10+ to 2-3
- Eliminated client-side aggregation
- Smaller payload sizes

## Performance Improvements

### Before Optimization
- **Load Time**: 5-10+ seconds
- **Database Queries**: 10-15 per page load
- **Data Transfer**: 50-100KB+ of raw data
- **CPU Usage**: High (client-side aggregation)

### After Optimization (Expected)
- **Load Time**: <1 second
- **Database Queries**: 2-3 per page load
- **Data Transfer**: 5-10KB of aggregated data
- **CPU Usage**: Minimal (pre-aggregated)

## Implementation Steps

### 1. Apply Database Migration
```bash
# Run the migration to create indexes and materialized views
npm run supabase:migrations
```

The migration file is located at:
`/supabase/migrations/20250121_analytics_performance_optimization.sql`

### 2. Set Up Scheduled Refresh
In Supabase Dashboard:
1. Go to Database > Extensions
2. Enable `pg_cron` extension
3. Create a cron job:
```sql
SELECT cron.schedule(
  'refresh-analytics-views',
  '0 * * * *', -- Every hour
  'SELECT refresh_analytics_views();'
);
```

### 3. Switch to Optimized Endpoints
Replace the current API routes with optimized versions:

```bash
# Backup current routes
mv app/api/admin/analytics/attribution/route.ts app/api/admin/analytics/attribution/route-old.ts
mv app/api/admin/analytics/attribution/time-series/route.ts app/api/admin/analytics/attribution/time-series/route-old.ts

# Use optimized routes
mv app/api/admin/analytics/attribution/route-optimized.ts app/api/admin/analytics/attribution/route.ts
mv app/api/admin/analytics/attribution/time-series/route-optimized.ts app/api/admin/analytics/attribution/time-series/route.ts
```

### 4. Monitor Performance
After implementation:
1. Check query performance in Supabase Dashboard > Database > Query Performance
2. Monitor materialized view refresh times
3. Track page load times in Vercel Analytics

## Additional Optimization Opportunities

### 1. Redis Caching
For even better performance, consider adding Redis caching:
- Cache attribution data for 5-10 minutes
- Cache time series data for 15-30 minutes
- Invalidate on new data ingestion

### 2. Edge Functions
Move analytics aggregation to Supabase Edge Functions:
- Closer to data = lower latency
- Can leverage database connections pooling
- Better for real-time updates

### 3. Incremental Materialized Views
Instead of full refresh, implement incremental updates:
- Only process new/changed data
- Reduces refresh time from minutes to seconds
- Better for high-traffic sites

### 4. Data Partitioning
For very large datasets (millions of records):
- Partition tables by date (monthly/quarterly)
- Archive old data to separate tables
- Query only relevant partitions

## Rollback Plan

If issues arise, rollback is simple:

1. **Revert API Routes**:
```bash
mv app/api/admin/analytics/attribution/route.ts app/api/admin/analytics/attribution/route-optimized.ts
mv app/api/admin/analytics/attribution/route-old.ts app/api/admin/analytics/attribution/route.ts
# Repeat for time-series route
```

2. **Drop Materialized Views** (if needed):
```sql
DROP MATERIALIZED VIEW IF EXISTS analytics_daily_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS campaign_metadata_cache CASCADE;
DROP FUNCTION IF EXISTS get_attribution_summary CASCADE;
DROP FUNCTION IF EXISTS refresh_analytics_views CASCADE;
```

The original indexes can remain as they don't hurt performance.

## Monitoring & Maintenance

### Daily Checks
- Verify materialized views are refreshing (check `last_refresh` timestamp)
- Monitor query performance in Supabase dashboard
- Check for slow queries in logs

### Weekly Maintenance
- Analyze query patterns for new optimization opportunities
- Review index usage statistics
- Check table sizes and consider archiving old data

### Monthly Review
- Evaluate materialized view definitions
- Consider adjusting refresh frequency based on usage
- Review and optimize slow queries

## Conclusion

These optimizations should reduce the analytics dashboard load time from 5-10+ seconds to under 1 second. The key improvements are:

1. **Pre-aggregation**: Materialized views eliminate real-time aggregation
2. **Composite Indexes**: Targeted indexes for common query patterns
3. **Query Consolidation**: Single database function replaces multiple queries
4. **Caching**: Metadata caching eliminates redundant lookups

The optimizations are designed to be:
- **Scalable**: Handles growth without performance degradation
- **Maintainable**: Clear separation of concerns and documentation
- **Reversible**: Easy rollback if issues arise