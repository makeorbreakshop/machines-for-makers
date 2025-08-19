export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { getGoogleAnalyticsData } from '@/lib/google-analytics';
import { subDays, startOfDay, endOfDay } from 'date-fns';

interface AttributionSource {
  source: string;
  medium?: string;
  campaign?: string;
  displayTitle?: string;
  campaignType?: string;
  clicks: number;
  leads: number;
  conversionRate: number;
  lastSeen: string;
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
    const sourceFilter = searchParams.get('source');

    // Calculate date range
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Fetch Google Analytics data for visitor counts
    let gaData: any = null;
    try {
      gaData = await getGoogleAnalyticsData(dateRange);
    } catch (error) {
      console.error('Failed to fetch GA data:', error);
    }

    // Fetch link clicks data
    const clicksQuery = supabase
      .from('link_clicks')
      .select('*')
      .gte('clicked_at', startDate.toISOString())
      .lte('clicked_at', endDate.toISOString())
      .eq('is_bot', false);

    if (sourceFilter && sourceFilter !== 'all') {
      clicksQuery.or(`utm_source.eq.${sourceFilter},source.eq.${sourceFilter}`);
    }

    const { data: clicks, error: clicksError } = await clicksQuery;
    if (clicksError) throw clicksError;

    // Fetch email subscribers (leads) data
    const leadsQuery = supabase
      .from('email_subscribers')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (sourceFilter && sourceFilter !== 'all') {
      leadsQuery.or(`utm_source.eq.${sourceFilter},source.eq.${sourceFilter}`);
    }

    const { data: leads, error: leadsError } = await leadsQuery;
    if (leadsError) throw leadsError;

    // Aggregate data by campaign (not generic source)
    const campaignMap = new Map<string, AttributionSource>();

    // Process clicks data - focus on campaigns from short links
    clicks?.forEach(click => {
      // Use campaign as the primary identifier, fallback to source for non-campaign traffic
      const campaignKey = click.utm_campaign || click.campaign || click.utm_source || click.source || 'direct';
      const source = click.utm_source || click.source || 'direct';
      
      // Skip internal page destinations that shouldn't be shown as sources
      if (['deals-page', 'material-library', 'direct'].includes(campaignKey) && !click.utm_campaign && !click.campaign) {
        return;
      }
      
      const existing = campaignMap.get(campaignKey) || {
        source: source,
        medium: click.utm_medium,
        campaign: campaignKey,
        clicks: 0,
        leads: 0,
        conversionRate: 0,
        lastSeen: click.clicked_at,
      };

      existing.clicks++;
      if (new Date(click.clicked_at) > new Date(existing.lastSeen)) {
        existing.lastSeen = click.clicked_at;
      }

      campaignMap.set(campaignKey, existing);
    });

    // Process leads data - match to campaigns
    leads?.forEach(lead => {
      // Use campaign as the primary identifier
      const campaignKey = lead.utm_campaign || lead.utm_source || lead.source || 'direct';
      const source = lead.utm_source || lead.source || 'direct';
      
      // Skip internal page destinations that shouldn't be shown as sources
      if (['deals-page', 'material-library', 'direct'].includes(campaignKey) && !lead.utm_campaign) {
        return;
      }
      
      const existing = campaignMap.get(campaignKey) || {
        source: source,
        medium: lead.utm_medium,
        campaign: campaignKey,
        clicks: 0,
        leads: 0,
        conversionRate: 0,
        lastSeen: lead.created_at,
      };

      existing.leads++;
      if (new Date(lead.created_at) > new Date(existing.lastSeen)) {
        existing.lastSeen = lead.created_at;
      }

      campaignMap.set(campaignKey, existing);
    });

    // Get short link metadata for campaign titles
    const { data: campaignMetadata } = await supabase
      .from('short_links')
      .select('campaign, metadata')
      .in('campaign', Array.from(campaignMap.keys()));

    // Create a metadata lookup map
    const metadataMap = new Map();
    campaignMetadata?.forEach(link => {
      if (link.campaign && link.metadata) {
        metadataMap.set(link.campaign, link.metadata);
      }
    });

    // Calculate rates and prepare campaign data
    const sources = Array.from(campaignMap.values()).map(campaign => {
      // Focus on click-to-lead conversion since that's what we're actually tracking
      campaign.conversionRate = campaign.clicks > 0 ? campaign.leads / campaign.clicks : 0;
      
      // Add display title from metadata
      const metadata = metadataMap.get(campaign.campaign);
      if (metadata) {
        campaign.displayTitle = metadata.video_title || metadata.description || campaign.campaign;
        campaign.campaignType = metadata.campaign_type;
      } else {
        campaign.displayTitle = campaign.campaign;
      }
      
      return campaign;
    }).sort((a, b) => b.clicks - a.clicks); // Sort by clicks for campaign performance

    // Calculate overview metrics
    const totalClicks = sources.reduce((sum, s) => sum + s.clicks, 0);
    const totalLeads = sources.reduce((sum, s) => sum + s.leads, 0);

    const overview = {
      totalClicks,
      totalLeads,
      clickToLeadRate: totalClicks > 0 ? totalLeads / totalClicks : 0,
    };

    // Get top conversion paths from actual short links with campaign data
    const { data: topLinks } = await supabase
      .from('short_links')
      .select('slug, campaign, metadata, destination_url')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .limit(20);

    // Calculate conversions for each link based on actual click and lead data
    const topPaths = topLinks?.map(link => {
      const linkClicks = clicks?.filter(c => c.utm_campaign === link.campaign || c.campaign === link.campaign).length || 0;
      const linkLeads = leads?.filter(l => l.utm_campaign === link.campaign).length || 0;
      
      return {
        path: link.destination_url,
        campaign: link.campaign,
        slug: link.slug,
        description: link.metadata?.description || link.metadata?.video_title || link.campaign,
        count: linkClicks,
        conversions: linkLeads,
      };
    })
    .filter(link => link.count > 0) // Only show links with actual clicks
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) || [];

    // Get recent customer journeys with campaign context
    const recentJourneys = leads?.slice(0, 5).map(lead => {
      const campaign = lead.utm_campaign || 'direct';
      const clicksForLead = clicks?.filter(c => 
        c.utm_campaign === campaign && 
        new Date(c.clicked_at) <= new Date(lead.created_at)
      ) || [];

      // Get the short link metadata for this campaign
      const shortLink = topLinks?.find(link => link.campaign === campaign);
      
      return {
        id: lead.id,
        source: lead.utm_source || lead.source || 'direct',
        campaign: campaign,
        campaignDescription: shortLink?.metadata?.video_title || shortLink?.metadata?.description || campaign,
        steps: [
          ...clicksForLead.map(click => ({
            type: 'click' as const,
            timestamp: click.clicked_at,
            details: `Clicked short link: ${shortLink?.slug || campaign}`,
          })),
          {
            type: 'lead' as const,
            timestamp: lead.created_at,
            details: `Signed up via ${lead.form_name || 'newsletter'}`,
          },
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      };
    }) || [];

    return NextResponse.json({
      overview,
      sources,
      topPaths,
      recentJourneys,
    });
  } catch (error) {
    console.error('Attribution API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}