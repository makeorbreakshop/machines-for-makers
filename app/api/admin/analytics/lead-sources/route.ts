export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_page?: string;
  referrer?: string;
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
    
    // Get date range from query params
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const funnel = url.searchParams.get('funnel') || 'all'; // 'all', 'material-library', 'deals-page'
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    
    // Build query
    let query = supabase
      .from('email_subscribers')
      .select('source, referrer, created_at, email')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());
    
    // Filter by funnel if specified
    if (funnel !== 'all') {
      query = query.ilike('source', `${funnel}%`);
    }
    
    const { data: subscribers, error } = await query;
    
    if (error) {
      console.error('Error fetching subscribers:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
    
    // Process the data to extract UTM parameters
    const sourceBreakdown = new Map<string, number>();
    const mediumBreakdown = new Map<string, number>();
    const campaignBreakdown = new Map<string, number>();
    const sourceDetails = new Map<string, { count: number; campaigns: Set<string> }>();
    
    subscribers?.forEach(subscriber => {
      // Parse the tracking data from referrer field
      let trackingData: UTMData = {};
      try {
        if (subscriber.referrer && subscriber.referrer.startsWith('{')) {
          trackingData = JSON.parse(subscriber.referrer);
        }
      } catch (e) {
        // If parsing fails, treat referrer as a simple URL
        trackingData = { referrer: subscriber.referrer };
      }
      
      // Extract source from the source field or UTM data
      const source = trackingData.utm_source || 
        (subscriber.source?.includes('-') ? subscriber.source.split('-').slice(-1)[0] : 'direct');
      const medium = trackingData.utm_medium || 'unknown';
      const campaign = trackingData.utm_campaign || 'none';
      
      // Update breakdowns
      sourceBreakdown.set(source, (sourceBreakdown.get(source) || 0) + 1);
      mediumBreakdown.set(medium, (mediumBreakdown.get(medium) || 0) + 1);
      campaignBreakdown.set(campaign, (campaignBreakdown.get(campaign) || 0) + 1);
      
      // Update source details
      const key = `${source}:${medium}`;
      if (!sourceDetails.has(key)) {
        sourceDetails.set(key, { count: 0, campaigns: new Set() });
      }
      const details = sourceDetails.get(key)!;
      details.count++;
      if (campaign !== 'none') {
        details.campaigns.add(campaign);
      }
    });
    
    // Convert maps to arrays for response
    const sources = Array.from(sourceBreakdown.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    const mediums = Array.from(mediumBreakdown.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    const campaigns = Array.from(campaignBreakdown.entries())
      .filter(([name]) => name !== 'none')
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    const detailedSources = Array.from(sourceDetails.entries())
      .map(([key, details]) => {
        const [source, medium] = key.split(':');
        return {
          source,
          medium,
          count: details.count,
          campaigns: Array.from(details.campaigns)
        };
      })
      .sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      totalSubscribers: subscribers?.length || 0,
      sources,
      mediums,
      campaigns,
      detailedSources,
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('Lead sources API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}