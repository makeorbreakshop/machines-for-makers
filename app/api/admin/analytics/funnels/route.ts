export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { google } from 'googleapis';

async function getGoogleAnalyticsData(startDate: string, endDate: string, getTrends: boolean = false) {
  try {
    // Check if Google Analytics credentials are configured
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.log('Google Analytics not configured - using fallback data');
      return {
        materialLibrary: 0,
        dealAlerts: 0,
        isConnected: false,
      };
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
    
    if (!propertyId) {
      console.log('GA_PROPERTY_ID not configured');
      return {
        materialLibrary: 0,
        dealAlerts: 0,
        isConnected: false,
      };
    }

    // Get page views for specific pages - checking multiple possible paths
    const [materialLibraryViews, dealAlertsViews] = await Promise.all([
      // Material Library page views
      analyticsDataClient.properties.runReport({
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
                      value: '/laser-material-library',
                    },
                  },
                },
                {
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: '/laser-material-library/',
                    },
                  },
                },
                {
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: '/tools/laser-settings-library',
                    },
                  },
                },
                {
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: '/tools/laser-settings-library/',
                    },
                  },
                },
              ],
            },
          },
        },
      }),
      // Deal Alerts page views
      analyticsDataClient.properties.runReport({
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
                      value: '/deals',
                    },
                  },
                },
                {
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: '/deals/',
                    },
                  },
                },
                {
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: '/deals-alerts',
                    },
                  },
                },
                {
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: '/deals-alerts/',
                    },
                  },
                },
              ],
            },
          },
        },
      }),
    ]);

    // Extract page view counts
    console.log('Material Library GA Response:', JSON.stringify(materialLibraryViews.data, null, 2));
    console.log('Deal Alerts GA Response:', JSON.stringify(dealAlertsViews.data, null, 2));
    
    const materialLibraryPageViews = materialLibraryViews.data.rows?.reduce((sum, row) => {
      return sum + parseInt(row.metricValues?.[0]?.value || '0');
    }, 0) || 0;

    const dealAlertsPageViews = dealAlertsViews.data.rows?.reduce((sum, row) => {
      return sum + parseInt(row.metricValues?.[0]?.value || '0');
    }, 0) || 0;

    console.log('GA page views - Material Library:', materialLibraryPageViews, 'Deal Alerts:', dealAlertsPageViews);

    // If requesting trends, get daily data
    let trendData = null;
    if (getTrends) {
      const [materialLibraryTrend, dealAlertsTrend] = await Promise.all([
        analyticsDataClient.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'screenPageViews' }],
            dimensionFilter: {
              orGroup: {
                expressions: [
                  {
                    filter: {
                      fieldName: 'pagePath',
                      stringFilter: {
                        matchType: 'EXACT',
                        value: '/laser-material-library',
                      },
                    },
                  },
                ],
              },
            },
            orderBys: [{ dimension: { dimensionName: 'date' } }],
          },
        }),
        analyticsDataClient.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'screenPageViews' }],
            dimensionFilter: {
              orGroup: {
                expressions: [
                  {
                    filter: {
                      fieldName: 'pagePath',
                      stringFilter: {
                        matchType: 'EXACT',
                        value: '/deals',
                      },
                    },
                  },
                ],
              },
            },
            orderBys: [{ dimension: { dimensionName: 'date' } }],
          },
        }),
      ]);

      trendData = {
        materialLibrary: materialLibraryTrend.data.rows || [],
        dealAlerts: dealAlertsTrend.data.rows || [],
      };
    }

    return {
      materialLibrary: materialLibraryPageViews,
      dealAlerts: dealAlertsPageViews,
      isConnected: true,
      trendData,
    };
  } catch (error) {
    console.error('Google Analytics error:', error);
    // Return fallback data if GA fails
    return {
      materialLibrary: 0,
      dealAlerts: 0,
      isConnected: false,
    };
  }
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
    const getTrends = url.searchParams.get('trends') === 'true';
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    
    // Calculate previous period for comparison
    const previousStartDate = new Date(Date.now() - (days * 2) * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Format dates for GA
    const gaStartDate = startDate.toISOString().split('T')[0];
    const gaEndDate = endDate.toISOString().split('T')[0];
    const gaPreviousStartDate = previousStartDate.toISOString().split('T')[0];
    const gaPreviousEndDate = previousEndDate.toISOString().split('T')[0];
    
    // Get page views from Google Analytics
    const pageViews = await getGoogleAnalyticsData(gaStartDate, gaEndDate, getTrends);
    const previousPageViews = getTrends ? await getGoogleAnalyticsData(gaPreviousStartDate, gaPreviousEndDate) : null;
    
    // If still showing 0, let's check the terminal logs
    console.log('Funnel API - GA returned page views:', pageViews);
    
    // Get email submissions from database for current period
    const { data: materialLibrarySubmissions } = await supabase
      .from('email_subscribers')
      .select('*', { count: 'exact' })
      .eq('source', 'material-library')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());
    
    const { data: dealAlertsSubmissions } = await supabase
      .from('email_subscribers')
      .select('*', { count: 'exact' })
      .eq('source', 'deals-page')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());

    // Get previous period data if trends requested
    let previousMaterialLibrarySubmissions = null;
    let previousDealAlertsSubmissions = null;
    
    if (getTrends) {
      const { data: prevMaterial } = await supabase
        .from('email_subscribers')
        .select('*', { count: 'exact' })
        .eq('source', 'material-library')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());
      
      const { data: prevDeals } = await supabase
        .from('email_subscribers')
        .select('*', { count: 'exact' })
        .eq('source', 'deals-page')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());
      
      previousMaterialLibrarySubmissions = prevMaterial;
      previousDealAlertsSubmissions = prevDeals;
    }

    // Get trend data by day if requested
    let trendData = null;
    if (getTrends && pageViews.trendData) {
      // Get daily email submissions
      const { data: dailySubmissions } = await supabase
        .from('email_subscribers')
        .select('created_at, source')
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .in('source', ['material-library', 'deals-page']);

      // Process trend data
      const dateMap = new Map();
      
      // Initialize all dates in range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0].replace(/-/g, '');
        dateMap.set(dateStr, {
          materialLibrary: { pageViews: 0, signups: 0 },
          dealAlerts: { pageViews: 0, signups: 0 }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Add page views from GA
      pageViews.trendData.materialLibrary.forEach(row => {
        const date = row.dimensionValues?.[0]?.value;
        if (date && dateMap.has(date)) {
          dateMap.get(date).materialLibrary.pageViews = parseInt(row.metricValues?.[0]?.value || '0');
        }
      });

      pageViews.trendData.dealAlerts.forEach(row => {
        const date = row.dimensionValues?.[0]?.value;
        if (date && dateMap.has(date)) {
          dateMap.get(date).dealAlerts.pageViews = parseInt(row.metricValues?.[0]?.value || '0');
        }
      });

      // Add email signups
      dailySubmissions?.forEach(sub => {
        const dateStr = new Date(sub.created_at).toISOString().split('T')[0].replace(/-/g, '');
        if (dateMap.has(dateStr)) {
          if (sub.source === 'material-library') {
            dateMap.get(dateStr).materialLibrary.signups++;
          } else if (sub.source === 'deals-page') {
            dateMap.get(dateStr).dealAlerts.signups++;
          }
        }
      });

      // Convert to array format
      trendData = {
        materialLibrary: Array.from(dateMap.entries()).map(([date, data]) => ({
          date,
          pageViews: data.materialLibrary.pageViews,
          signups: data.materialLibrary.signups,
          conversionRate: data.materialLibrary.pageViews > 0 
            ? parseFloat(((data.materialLibrary.signups / data.materialLibrary.pageViews) * 100).toFixed(1))
            : 0
        })),
        dealAlerts: Array.from(dateMap.entries()).map(([date, data]) => ({
          date,
          pageViews: data.dealAlerts.pageViews,
          signups: data.dealAlerts.signups,
          conversionRate: data.dealAlerts.pageViews > 0 
            ? parseFloat(((data.dealAlerts.signups / data.dealAlerts.pageViews) * 100).toFixed(1))
            : 0
        }))
      };
    }
    
    // Get active/confirmed subscribers (all are active since we don't track confirmation)
    const materialLibraryActive = materialLibrarySubmissions?.filter(sub => sub.status === 'active').length || 0;
    const dealAlertsActive = dealAlertsSubmissions?.filter(sub => sub.status === 'active').length || 0;
    
    // Build funnel data
    const funnels = [
      {
        name: 'Material Library',
        pageViews: pageViews.materialLibrary,
        submissions: materialLibrarySubmissions?.length || 0,
        confirmed: materialLibraryActive,
      },
      {
        name: 'Deal Alerts',
        pageViews: pageViews.dealAlerts,
        submissions: dealAlertsSubmissions?.length || 0,
        confirmed: dealAlertsActive,
      },
    ];

    // Add previous period data if trends requested
    let previousPeriod = null;
    if (getTrends && previousPageViews) {
      previousPeriod = {
        materialLibrary: {
          pageViews: previousPageViews.materialLibrary,
          signups: previousMaterialLibrarySubmissions?.length || 0,
          conversionRate: previousPageViews.materialLibrary > 0 
            ? parseFloat(((previousMaterialLibrarySubmissions?.length || 0) / previousPageViews.materialLibrary * 100).toFixed(1))
            : 0
        },
        dealAlerts: {
          pageViews: previousPageViews.dealAlerts,
          signups: previousDealAlertsSubmissions?.length || 0,
          conversionRate: previousPageViews.dealAlerts > 0 
            ? parseFloat(((previousDealAlertsSubmissions?.length || 0) / previousPageViews.dealAlerts * 100).toFixed(1))
            : 0
        }
      };
    }

    return NextResponse.json({ 
      funnels,
      gaConnected: pageViews.isConnected,
      note: pageViews.isConnected ? null : 'Google Analytics not connected. Page view data unavailable.',
      trendData,
      previousPeriod
    });

  } catch (error) {
    console.error('Funnels API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}