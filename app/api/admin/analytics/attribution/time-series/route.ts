export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';

interface TimeSeriesDataPoint {
  date: string;
  [source: string]: string | number; // Dynamic keys for each source
}

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
    const metricType = searchParams.get('metricType') || 'clicks'; // 'clicks' or 'leads'

    // Calculate date range to include today
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    // For 7 days including today: today and 6 days before
    const now = new Date();
    const startDate = startOfDay(subDays(now, days - 1));
    const endDate = endOfDay(now);
    
    console.log('Date calculation:', {
      now: now.toISOString(),
      dateRange,
      days,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Generate all dates in the range (including today)
    const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
    const dateStrings = dateInterval.map(date => format(date, 'yyyy-MM-dd'));
    
    console.log('Generated dates:', {
      count: dateStrings.length,
      first: dateStrings[0],
      last: dateStrings[dateStrings.length - 1],
      allDates: dateStrings
    });

    let data: any[] = [];
    let sourceKeys: Set<string> = new Set();

    if (metricType === 'clicks') {
      // Fetch clicks data
      const { data: clicks, error: clicksError } = await supabase
        .from('link_clicks')
        .select('clicked_at, utm_campaign, campaign, utm_source, source')
        .gte('clicked_at', startDate.toISOString())
        .lte('clicked_at', endDate.toISOString())
        .eq('is_bot', false);

      if (clicksError) throw clicksError;

      // Group clicks by date and source
      const clicksByDateAndSource: Record<string, Record<string, number>> = {};
      
      clicks?.forEach(click => {
        const date = format(new Date(click.clicked_at), 'yyyy-MM-dd');
        const source = click.utm_campaign || click.campaign || click.utm_source || click.source || 'direct';
        
        // Skip internal page destinations
        if (['deals-page', 'material-library', 'direct'].includes(source) && !click.utm_campaign && !click.campaign) {
          return;
        }

        if (!clicksByDateAndSource[date]) {
          clicksByDateAndSource[date] = {};
        }
        
        clicksByDateAndSource[date][source] = (clicksByDateAndSource[date][source] || 0) + 1;
        sourceKeys.add(source);
      });

      data = clicksByDateAndSource;
    } else if (metricType === 'leads') {
      // Fetch leads data
      const { data: leads, error: leadsError } = await supabase
        .from('email_subscribers')
        .select('created_at, utm_campaign, utm_source, source')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (leadsError) throw leadsError;

      // Group leads by date and source
      const leadsByDateAndSource: Record<string, Record<string, number>> = {};
      
      leads?.forEach(lead => {
        const date = format(new Date(lead.created_at), 'yyyy-MM-dd');
        const source = lead.utm_campaign || lead.utm_source || lead.source || 'direct';
        
        // Skip internal page destinations
        if (['deals-page', 'material-library', 'direct'].includes(source) && !lead.utm_campaign) {
          return;
        }

        if (!leadsByDateAndSource[date]) {
          leadsByDateAndSource[date] = {};
        }
        
        leadsByDateAndSource[date][source] = (leadsByDateAndSource[date][source] || 0) + 1;
        sourceKeys.add(source);
      });

      data = leadsByDateAndSource;
    }

    // Get campaign metadata for display titles
    const { data: campaignMetadata } = await supabase
      .from('short_links')
      .select('campaign, metadata')
      .in('campaign', Array.from(sourceKeys));

    const metadataMap = new Map();
    campaignMetadata?.forEach(link => {
      if (link.campaign && link.metadata) {
        metadataMap.set(link.campaign, {
          displayTitle: link.metadata.video_title || link.metadata.description || link.campaign,
          campaignType: link.metadata.campaign_type
        });
      }
    });

    // Transform data into chart format
    const timeSeriesData: TimeSeriesDataPoint[] = dateStrings.map(date => {
      const dataPoint: TimeSeriesDataPoint = { date };
      
      // Add data for each source
      sourceKeys.forEach(source => {
        dataPoint[source] = data[date]?.[source] || 0;
      });
      
      // Add total for this date
      let dayTotal = 0;
      sourceKeys.forEach(source => {
        dayTotal += data[date]?.[source] || 0;
      });
      dataPoint['_dayTotal'] = dayTotal;
      
      return dataPoint;
    });

    // Get the top sources for chart display (limit to top 5-10)
    const sourceTotals = new Map<string, number>();
    timeSeriesData.forEach(point => {
      sourceKeys.forEach(source => {
        const current = sourceTotals.get(source) || 0;
        sourceTotals.set(source, current + (point[source] as number));
      });
    });

    const topSources = Array.from(sourceTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source]) => source);

    // Filter time series data to only include top sources
    const filteredTimeSeriesData = timeSeriesData.map(point => {
      const filteredPoint: TimeSeriesDataPoint = { date: point.date };
      topSources.forEach(source => {
        filteredPoint[source] = point[source];
      });
      return filteredPoint;
    });

    return NextResponse.json({
      timeSeriesData: filteredTimeSeriesData,
      sources: topSources,
      sourceMetadata: Object.fromEntries(metadataMap),
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