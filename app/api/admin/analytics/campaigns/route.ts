export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { google } from 'googleapis';

// Initialize GA Data API client
const initializeAnalytics = () => {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
      return google.analyticsdata({ version: 'v1beta', auth });
    } catch (error) {
      console.error('Error parsing credentials JSON:', error);
    }
  }
  
  return null;
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // Try to use GA API if available
    const analytics = initializeAnalytics();
    const propertyId = process.env.GA_PROPERTY_ID;
    
    if (!analytics || !propertyId) {
      return NextResponse.json({
        error: 'Google Analytics not configured',
        campaigns: [],
        sources: [],
        mediums: []
      });
    }

    try {
      // Fetch UTM campaign data
      const [campaignResponse, sourceMediaResponse] = await Promise.all([
        // Campaign breakdown
        analytics.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0]
            }],
            dimensions: [
              { name: 'sessionCampaignName' },
              { name: 'sessionSource' },
              { name: 'sessionMedium' }
            ],
            metrics: [
              { name: 'sessions' },
              { name: 'screenPageViews' },
              { name: 'activeUsers' }
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 50,
          }
        }),
        // Source/Medium breakdown
        analytics.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0]
            }],
            dimensions: [
              { name: 'sessionSource' },
              { name: 'sessionMedium' }
            ],
            metrics: [
              { name: 'sessions' },
              { name: 'screenPageViews' },
              { name: 'activeUsers' }
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 20,
          }
        })
      ]);

      // Process campaign data
      const campaigns = (campaignResponse.data.rows || []).map(row => ({
        campaign: row.dimensionValues?.[0]?.value || '(not set)',
        source: row.dimensionValues?.[1]?.value || '(not set)',
        medium: row.dimensionValues?.[2]?.value || '(not set)',
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        pageViews: parseInt(row.metricValues?.[1]?.value || '0'),
        users: parseInt(row.metricValues?.[2]?.value || '0')
      })).filter(c => c.campaign !== '(not set)');

      // Process source/medium data
      const sourceMedium = (sourceMediaResponse.data.rows || []).map(row => ({
        source: row.dimensionValues?.[0]?.value || '(not set)',
        medium: row.dimensionValues?.[1]?.value || '(not set)',
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        pageViews: parseInt(row.metricValues?.[1]?.value || '0'),
        users: parseInt(row.metricValues?.[2]?.value || '0')
      }));

      // Aggregate by source
      const sourceMap = new Map();
      const mediumMap = new Map();

      sourceMedium.forEach(item => {
        // Aggregate sources
        const existingSource = sourceMap.get(item.source) || { sessions: 0, pageViews: 0, users: 0 };
        sourceMap.set(item.source, {
          sessions: existingSource.sessions + item.sessions,
          pageViews: existingSource.pageViews + item.pageViews,
          users: existingSource.users + item.users
        });

        // Aggregate mediums
        const existingMedium = mediumMap.get(item.medium) || { sessions: 0, pageViews: 0, users: 0 };
        mediumMap.set(item.medium, {
          sessions: existingMedium.sessions + item.sessions,
          pageViews: existingMedium.pageViews + item.pageViews,
          users: existingMedium.users + item.users
        });
      });

      const sources = Array.from(sourceMap.entries())
        .map(([source, data]) => ({ source, ...data }))
        .sort((a, b) => b.sessions - a.sessions);

      const mediums = Array.from(mediumMap.entries())
        .map(([medium, data]) => ({ medium, ...data }))
        .sort((a, b) => b.sessions - a.sessions);

      return NextResponse.json({
        campaigns,
        sources,
        mediums,
        sourceMedium,
        totalSessions: campaigns.reduce((sum, c) => sum + c.sessions, 0),
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });

    } catch (gaError) {
      console.error('GA API error:', gaError);
      return NextResponse.json({
        error: 'Failed to fetch campaign data',
        details: gaError instanceof Error ? gaError.message : 'Unknown error',
        campaigns: [],
        sources: [],
        mediums: []
      });
    }

  } catch (error) {
    console.error('Campaign analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}