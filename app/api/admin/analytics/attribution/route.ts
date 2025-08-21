export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Optimized Attribution API using materialized views and database functions
 * This version reduces database queries from 10+ to 2-3 and leverages
 * pre-aggregated data for much faster response times.
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

    // Calculate date range
    const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Use the optimized database function to get attribution data
    const { data: attributionData, error: attributionError } = await supabase
      .rpc('get_attribution_summary', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

    if (attributionError) {
      console.error('Attribution query error:', attributionError);
      throw attributionError;
    }

    // Get aggregated totals using the materialized view
    const { data: totals, error: totalsError } = await supabase
      .from('analytics_daily_summary')
      .select('clicks, leads')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (totalsError) {
      console.error('Totals query error:', totalsError);
      throw totalsError;
    }

    // Calculate overview metrics
    const totalClicks = totals?.reduce((sum, row) => sum + (row.clicks || 0), 0) || 0;
    const totalLeads = totals?.reduce((sum, row) => sum + (row.leads || 0), 0) || 0;

    const overview = {
      totalClicks,
      totalLeads,
      clickToLeadRate: totalClicks > 0 ? totalLeads / totalClicks : 0,
    };

    // Transform attribution data for the frontend
    const sources = (attributionData || []).map((row: any) => ({
      source: row.source,
      medium: row.medium,
      campaign: row.campaign_key,
      displayTitle: row.display_title,
      campaignType: row.campaign_type,
      clicks: parseInt(row.total_clicks || 0),
      leads: parseInt(row.total_leads || 0),
      conversionRate: parseFloat(row.conversion_rate || 0) / 100,
      lastSeen: row.last_seen,
    }));

    return NextResponse.json({
      overview,
      sources,
      // Empty arrays for removed sections
      topPaths: [],
      recentJourneys: [],
    });
  } catch (error) {
    console.error('Attribution API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}