export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const propertyId = process.env.GA_PROPERTY_ID;
    
    if (!credentialsJson || !propertyId) {
      return NextResponse.json({ error: 'GA not configured' }, { status: 400 });
    }

    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    
    const analytics = google.analyticsdata({ version: 'v1beta', auth });
    
    // Get data for last 7 days to match your dashboard screenshot
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('Fetching GA data for:', { startDate, endDate, propertyId });
    
    // Test different metrics to see what GA returns
    const response = await analytics.properties.runReport({
      property: propertyId,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'totalUsers' },      // Total unique users
          { name: 'newUsers' },         // New users
          { name: 'activeUsers' },      // Active users (what we're currently using)
          { name: 'sessions' },         // Sessions
          { name: 'screenPageViews' },  // Page views
          { name: 'eventCount' }        // Total events
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }
    });

    const data = response.data.rows?.map(row => ({
      date: row.dimensionValues?.[0]?.value,
      totalUsers: parseInt(row.metricValues?.[0]?.value || '0'),
      newUsers: parseInt(row.metricValues?.[1]?.value || '0'),
      activeUsers: parseInt(row.metricValues?.[2]?.value || '0'),
      sessions: parseInt(row.metricValues?.[3]?.value || '0'),
      pageViews: parseInt(row.metricValues?.[4]?.value || '0'),
      eventCount: parseInt(row.metricValues?.[5]?.value || '0')
    })) || [];
    
    // Calculate totals
    const totals = data.reduce((acc, day) => ({
      totalUsers: acc.totalUsers + day.totalUsers,
      newUsers: acc.newUsers + day.newUsers,
      activeUsers: acc.activeUsers + day.activeUsers,
      sessions: acc.sessions + day.sessions,
      pageViews: acc.pageViews + day.pageViews,
      eventCount: acc.eventCount + day.eventCount
    }), {
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      sessions: 0,
      pageViews: 0,
      eventCount: 0
    });

    return NextResponse.json({
      dateRange: { startDate, endDate },
      totals,
      dailyData: data,
      propertyId,
      explanation: {
        totalUsers: 'Unique users who visited your site',
        activeUsers: 'Users who engaged with your site',
        sessions: 'Number of sessions (visits)',
        pageViews: 'Total page views',
        eventCount: 'Total events tracked'
      }
    });

  } catch (error) {
    console.error('GA test error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch GA data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}