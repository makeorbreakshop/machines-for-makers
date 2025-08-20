export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { google } from 'googleapis';

async function getGoogleAnalyticsData(landingPageUrls: string[], startDate: string, endDate: string) {
  try {
    // Check if Google Analytics credentials are configured
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || !process.env.GA_PROPERTY_ID) {
      console.log('Google Analytics not configured');
      return {};
    }

    // Initialize Google Analytics Data API
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const analyticsDataClient = google.analyticsdata({
      version: 'v1beta',
      auth,
    });

    const propertyId = process.env.GA_PROPERTY_ID;
    
    // Get page views for all landing pages
    const pageViewsPromises = landingPageUrls.map(async (url) => {
      const response = await analyticsDataClient.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'screenPageViews' }],
          dimensions: [{ name: 'pagePath' }],
          dimensionFilter: {
            orGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: url,
                    },
                  },
                },
                {
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: url + '/',
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const pageViews = response.data.rows?.reduce((sum, row) => {
        return sum + parseInt(row.metricValues?.[0]?.value || '0');
      }, 0) || 0;

      return { url, pageViews };
    });

    const results = await Promise.all(pageViewsPromises);
    
    // Convert array to object keyed by URL
    return results.reduce((acc, { url, pageViews }) => {
      acc[url] = pageViews;
      return acc;
    }, {} as Record<string, number>);
    
  } catch (error) {
    console.error('Google Analytics error:', error);
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    // Get date range from query params
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    
    // Format dates for GA
    const gaStartDate = startDate.toISOString().split('T')[0];
    const gaEndDate = endDate.toISOString().split('T')[0];
    
    // Fetch all active lead magnets
    const { data: leadMagnets, error: leadMagnetsError } = await supabase
      .from('lead_magnets')
      .select('*')
      .eq('active', true)
      .order('position');
    
    if (leadMagnetsError) {
      console.error('Error fetching lead magnets:', leadMagnetsError);
      throw leadMagnetsError;
    }

    // Get Google Analytics data for all landing pages
    const landingPageUrls = leadMagnets.map(lm => lm.landing_page_url);
    const gaPageViews = await getGoogleAnalyticsData(landingPageUrls, gaStartDate, gaEndDate);
    
    // Process each lead magnet's funnel data
    const funnelData = await Promise.all(leadMagnets.map(async (leadMagnet) => {
      // Get clicks from short links pointing to this landing page
      const { data: clicks } = await supabase
        .from('link_clicks')
        .select(`
          *,
          short_links!inner(
            slug,
            destination_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            metadata
          )
        `)
        .eq('short_links.destination_url', leadMagnet.landing_page_url)
        .gte('clicked_at', startDate.toISOString())
        .lt('clicked_at', endDate.toISOString())
        .eq('is_bot', false);
      
      // Get email submissions that came through this lead magnet's landing page
      // Match by the destination URL in the referrer or by matching UTM campaigns
      const { data: allSubmissions } = await supabase
        .from('email_subscribers')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());
      
      // Filter submissions for this specific lead magnet
      // Match if the referrer contains the landing page URL or if they have matching UTM campaigns from our links
      const submissions = allSubmissions?.filter(sub => {
        // Check if referrer contains the landing page URL
        if (sub.referrer && sub.referrer.includes(leadMagnet.landing_page_url)) {
          return true;
        }
        // Check if this submission came from a campaign pointing to this landing page
        if (sub.utm_campaign && clicks?.some(click => 
          click.short_links?.utm_campaign === sub.utm_campaign && 
          click.short_links?.destination_url === leadMagnet.landing_page_url
        )) {
          return true;
        }
        // Fallback: check by source matching common patterns
        if (leadMagnet.landing_page_url === '/deals' && 
            (sub.source?.includes('deals') || sub.source?.includes('deal-alerts'))) {
          return true;
        }
        if (leadMagnet.landing_page_url === '/laser-comparison' && 
            sub.source?.includes('comparison')) {
          return true;
        }
        if (leadMagnet.landing_page_url === '/laser-material-library' && 
            sub.source?.includes('material')) {
          return true;
        }
        return false;
      }) || [];
      
      console.log(`Lead magnet ${leadMagnet.name}: ${submissions?.length || 0} submissions`);
      
      // Get unique converting links (links that led to at least one conversion)
      const convertingLinks = new Map();
      
      // First, add all clicked links to the map (even without conversions)
      if (clicks && clicks.length > 0) {
        clicks.forEach(click => {
          if (click.short_links) {
            const link = click.short_links;
            const key = link.slug;
            
            if (!convertingLinks.has(key)) {
              convertingLinks.set(key, {
                slug: link.slug,
                utm_source: link.utm_source,
                utm_medium: link.utm_medium,
                utm_campaign: link.utm_campaign,
                utm_content: link.utm_content,
                metadata: link.metadata,
                conversions: 0,
                clicks: 0,
              });
            }
            
            convertingLinks.get(key).clicks++;
          }
        });
      }
      
      // Then, match conversions to links
      if (submissions && submissions.length > 0) {
        for (const submission of submissions) {
          // Try to match by utm_campaign first
          if (submission.utm_campaign) {
            // Find all links with matching utm_campaign
            for (const [key, linkData] of convertingLinks) {
              if (linkData.utm_campaign === submission.utm_campaign) {
                linkData.conversions++;
                break; // Only count once per submission
              }
            }
          } else if (submission.utm_source) {
            // Fallback to utm_source matching if no campaign
            for (const [key, linkData] of convertingLinks) {
              if (linkData.utm_source === submission.utm_source && 
                  linkData.utm_medium === submission.utm_medium) {
                linkData.conversions++;
                break;
              }
            }
          }
        }
      }
      
      console.log(`Lead magnet ${leadMagnet.name}: ${convertingLinks.size} converting links`);
      
      // Separate organic vs tracked submissions for this lead magnet
      const organicSubmissions = submissions?.filter(s => !s.utm_source) || [];
      const trackedSubmissions = submissions?.filter(s => s.utm_source) || [];
      const organicConfirmed = organicSubmissions.filter(s => s.status === 'active').length;
      const trackedConfirmed = trackedSubmissions.filter(s => s.status === 'active').length;
      
      // Calculate tracked conversions from converting links
      const trackedConversions = Array.from(convertingLinks.values()).reduce((sum, link) => sum + link.conversions, 0);
      
      // Calculate metrics
      const totalClicks = clicks?.length || 0;
      const pageViews = gaPageViews[leadMagnet.landing_page_url] || 0;
      const totalSubmissions = submissions?.length || 0;
      const activeSubmissions = submissions?.filter(s => s.status === 'active').length || 0;
      
      // Estimate tracked page views based on clicks (80% conversion rate from clicks to views)
      const estimatedTrackedPageViews = Math.round(totalClicks * 0.8);
      
      return {
        id: leadMagnet.id,
        name: leadMagnet.name,
        slug: leadMagnet.slug,
        icon: leadMagnet.icon,
        color: leadMagnet.color,
        landingPageUrl: leadMagnet.landing_page_url,
        
        // Overall funnel metrics (for backward compatibility)
        clicks: totalClicks,
        pageViews: pageViews,
        submissions: totalSubmissions,
        confirmed: activeSubmissions,
        
        // Separate organic vs tracked metrics
        organicPageViews: pageViews,
        organicSubmissions: organicSubmissions.length,
        organicConfirmed: organicConfirmed,
        
        trackedClicks: totalClicks,
        trackedPageViews: estimatedTrackedPageViews,
        trackedSubmissions: trackedSubmissions.length,
        trackedConfirmed: trackedConfirmed,
        
        // Conversion rates
        clickToPageView: totalClicks > 0 ? (pageViews / totalClicks * 100).toFixed(1) : '0',
        pageViewToSubmission: pageViews > 0 ? (totalSubmissions / pageViews * 100).toFixed(1) : '0',
        submissionToConfirmed: totalSubmissions > 0 ? (activeSubmissions / totalSubmissions * 100).toFixed(1) : '0',
        overallConversion: totalClicks > 0 ? (activeSubmissions / totalClicks * 100).toFixed(1) : '0',
        
        // Converting links with metadata (only show links with conversions or all if none have conversions)
        convertingLinks: Array.from(convertingLinks.values())
          .filter(link => link.conversions > 0 || Array.from(convertingLinks.values()).every(l => l.conversions === 0))
          .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks),
      };
    }));
    
    // Get ALL email subscribers to separate organic vs tracked
    const { data: allSubscribers } = await supabase
      .from('email_subscribers')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    // Separate organic (no UTM) vs tracked (with UTM) signups
    const organicSignups = allSubscribers?.filter(s => !s.utm_source) || [];
    const trackedSignups = allSubscribers?.filter(s => s.utm_source) || [];
    const organicConfirmed = organicSignups.filter(s => s.status === 'active').length;
    const trackedConfirmed = trackedSignups.filter(s => s.status === 'active').length;
    
    // Get total page views from GA for all lead magnet pages
    const totalGAPageViews = Object.values(gaPageViews).reduce((sum, views) => sum + views, 0);
    
    // For tracked campaigns, we need to estimate their page views
    // Assumption: tracked clicks lead to page views at a certain rate
    const totalTrackedClicks = funnelData.reduce((sum, f) => sum + f.clicks, 0);
    
    // Estimate tracked page views (this could be from GA with UTM params if available)
    // For now, let's use a reasonable conversion rate or actual data if we have it
    const trackedPageViews = Math.max(totalTrackedClicks, trackedSignups.length * 2);
    
    // Calculate organic funnel (Total views minus tracked portion -> Signups -> Confirmed)
    const organicFunnel = {
      pageViews: totalGAPageViews, // Total page views from GA
      signups: organicSignups.length,
      confirmed: organicConfirmed,
      viewToSignup: totalGAPageViews > 0 ? (organicSignups.length / totalGAPageViews * 100).toFixed(1) : '0',
      signupToConfirmed: organicSignups.length > 0 ? (organicConfirmed / organicSignups.length * 100).toFixed(1) : '0',
    };
    
    // Calculate tracked campaigns funnel (Clicks -> Views -> Signups -> Confirmed)
    const trackedFunnel = {
      clicks: totalTrackedClicks,
      pageViews: trackedPageViews,
      signups: trackedSignups.length,
      confirmed: trackedConfirmed,
      clickToView: totalTrackedClicks > 0 ? (trackedPageViews / totalTrackedClicks * 100).toFixed(1) : '0',
      viewToSignup: trackedPageViews > 0 ? (trackedSignups.length / trackedPageViews * 100).toFixed(1) : '0',
      signupToConfirmed: trackedSignups.length > 0 ? (trackedConfirmed / trackedSignups.length * 100).toFixed(1) : '0',
    };
    
    // Calculate totals across all funnels for backward compatibility
    const totals = funnelData.reduce((acc, funnel) => ({
      clicks: acc.clicks + funnel.clicks,
      pageViews: acc.pageViews + funnel.pageViews,
      submissions: acc.submissions + funnel.submissions,
      confirmed: acc.confirmed + funnel.confirmed,
    }), { clicks: 0, pageViews: 0, submissions: 0, confirmed: 0 });
    
    // Add overall conversion rates to totals
    const totalsWithRates = {
      ...totals,
      clickToPageView: totals.clicks > 0 ? (totals.pageViews / totals.clicks * 100).toFixed(1) : '0',
      pageViewToSubmission: totals.pageViews > 0 ? (totals.submissions / totals.pageViews * 100).toFixed(1) : '0',
      submissionToConfirmed: totals.submissions > 0 ? (totals.confirmed / totals.submissions * 100).toFixed(1) : '0',
      overallConversion: totals.clicks > 0 ? (totals.confirmed / totals.clicks * 100).toFixed(1) : '0',
    };

    return NextResponse.json({ 
      funnels: funnelData,
      totals: totalsWithRates,
      organic: organicFunnel,
      tracked: trackedFunnel,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
      },
      gaConnected: Object.keys(gaPageViews).length > 0,
    });

  } catch (error) {
    console.error('Funnels API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}