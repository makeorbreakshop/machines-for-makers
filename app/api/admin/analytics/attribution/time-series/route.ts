export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

/**
 * Optimized Time Series API using materialized views
 * This version uses pre-aggregated daily data instead of processing raw records
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication using cookie-based auth
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateRange = searchParams.get('dateRange') || '30d';
    const metricType = searchParams.get('metricType') || 'clicks';

    // Calculate date range
    const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const now = new Date();
    const startDate = startOfDay(subDays(now, days - 1));
    const endDate = endOfDay(now);

    // Query the materialized view for time series data
    const { data: timeSeriesRaw, error: timeSeriesError } = await supabase
      .from('analytics_daily_summary')
      .select('*')
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .order('date', { ascending: true });

    if (timeSeriesError) {
      console.error('Time series query error:', timeSeriesError);
      throw timeSeriesError;
    }

    // Get campaign metadata from cache
    const { data: campaignMetadata, error: metadataError } = await supabase
      .from('campaign_metadata_cache')
      .select('*');

    if (metadataError) {
      console.error('Metadata query error:', metadataError);
      throw metadataError;
    }

    // Create metadata lookup map
    const metadataMap = new Map();
    campaignMetadata?.forEach(item => {
      metadataMap.set(item.campaign, {
        displayTitle: item.display_title,
        campaignType: item.campaign_type
      });
    });

    // Transform data for chart format
    const dateMap = new Map();
    const sourceSet = new Set();

    timeSeriesRaw?.forEach(row => {
      const dateKey = row.date;
      const campaignKey = row.campaign_key;
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }
      
      const dayData = dateMap.get(dateKey);
      
      // Add source to the set
      sourceSet.add(campaignKey);
      
      // Aggregate data by campaign for this date
      if (!dayData[campaignKey]) {
        dayData[campaignKey] = {
          clicks: 0,
          leads: 0,
          confirmed: 0
        };
      }
      
      dayData[campaignKey].clicks += row.clicks || 0;
      dayData[campaignKey].leads += row.leads || 0;
      dayData[campaignKey].confirmed += row.confirmed_leads || 0;
    });

    // Get top sources by total volume
    const sourceTotals = new Map();
    dateMap.forEach((dayData) => {
      Object.entries(dayData).forEach(([source, data]: [string, any]) => {
        const current = sourceTotals.get(source) || { clicks: 0, leads: 0 };
        current.clicks += data.clicks;
        current.leads += data.leads;
        sourceTotals.set(source, current);
      });
    });

    // Sort and get top 8 sources
    const topSources = Array.from(sourceTotals.entries())
      .sort((a, b) => b[1].clicks - a[1].clicks)
      .slice(0, 8)
      .map(([source]) => source);

    // Build time series data array
    const timeSeriesData = [];
    const sortedDates = Array.from(dateMap.keys()).sort();
    
    for (const date of sortedDates) {
      const dayData = dateMap.get(date);
      const dataPoint: any = { date };
      
      // Add data for each top source
      topSources.forEach(source => {
        const sourceData = dayData[source] || { clicks: 0, leads: 0, confirmed: 0 };
        
        if (metricType === 'clicks') {
          dataPoint[source] = sourceData.clicks;
        } else if (metricType === 'leads') {
          dataPoint[source] = sourceData.leads;
          dataPoint[`${source}_leads`] = sourceData.leads; // For compatibility
        }
        
        // Always include conversion rate data
        dataPoint[`${source}_conversion`] = sourceData.clicks > 0 
          ? (sourceData.leads / sourceData.clicks) * 100 
          : 0;
      });
      
      // Calculate totals for this day
      const dayTotals = Object.values(dayData).reduce((acc: any, curr: any) => ({
        clicks: acc.clicks + curr.clicks,
        leads: acc.leads + curr.leads,
        confirmed: acc.confirmed + curr.confirmed
      }), { clicks: 0, leads: 0, confirmed: 0 });
      
      dataPoint.total_clicks = dayTotals.clicks;
      dataPoint.total_leads = dayTotals.leads;
      dataPoint.total_conversion = dayTotals.clicks > 0 
        ? (dayTotals.leads / dayTotals.clicks) * 100 
        : 0;
      
      timeSeriesData.push(dataPoint);
    }

    // Build source metadata
    const sourceMetadata: any = {};
    topSources.forEach(source => {
      const metadata = metadataMap.get(source);
      sourceMetadata[source] = metadata || {
        displayTitle: source,
        campaignType: null
      };
    });

    return NextResponse.json({
      timeSeriesData,
      sources: topSources,
      sourceMetadata,
      metricType,
      dateRange
    });
  } catch (error) {
    console.error('Time series attribution API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}