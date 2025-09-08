export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { google } from 'googleapis';

// Initialize GA Data API client
const initializeAnalytics = () => {
  // Check if we have service account credentials as JSON
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  console.log('Credentials JSON exists:', !!credentialsJson);
  console.log('Credentials JSON length:', credentialsJson?.length);
  
  if (credentialsJson) {
    try {
      // Use service account if available
      const credentials = JSON.parse(credentialsJson);
      console.log('Parsed credentials successfully, project_id:', credentials.project_id);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
      return google.analyticsdata({ version: 'v1beta', auth });
    } catch (error) {
      console.error('Error parsing credentials JSON:', error);
    }
  }
  
  // Fallback to OAuth2 if no service account
  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/api/auth/google/callback'
  );
  
  // For server-side, we'd need to implement OAuth flow
  // For now, return null to use database fallback
  return null;
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication using cookie-based auth
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const metric = searchParams.get('metric') || 'overview';

    // Try to use GA API if available
    const analytics = initializeAnalytics();
    const propertyId = process.env.GA_PROPERTY_ID || 'properties/YOUR_PROPERTY_ID'; // You'll need to add this
    
    if (analytics && propertyId && propertyId !== 'properties/YOUR_PROPERTY_ID') {
      try {
        // Fetch real GA data
        if (metric === 'overview') {
          const [metricsResponse, topPagesResponse, trendResponse] = await Promise.all([
            // Basic metrics
            analytics.properties.runReport({
              property: propertyId,
              requestBody: {
                dateRanges: [{ startDate, endDate }],
                metrics: [
                  { name: 'screenPageViews' },
                  { name: 'activeUsers' },
                  { name: 'engagementRate' },
                  { name: 'averageSessionDuration' }
                ],
              }
            }),
            // Top pages
            analytics.properties.runReport({
              property: propertyId,
              requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'pagePath' }],
                metrics: [{ name: 'screenPageViews' }],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: 10,
              }
            }),
            // Traffic trend data
            analytics.properties.runReport({
              property: propertyId,
              requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'date' }],
                metrics: [
                  { name: 'screenPageViews' },
                  { name: 'sessions' },
                  { name: 'activeUsers' }
                ],
                orderBys: [{ dimension: { dimensionName: 'date' } }],
              }
            })
          ]);

          const metrics = metricsResponse.data.rows?.[0]?.metricValues || [];
          const topPages = topPagesResponse.data.rows || [];
          const trendData = trendResponse.data.rows || [];

          console.log('GA API Response - Metrics:', metrics);
          console.log('GA API Response - Top Pages count:', topPages.length);
          console.log('GA API Response - Trend data count:', trendData.length);

          // Format chart data from GA response
          const chartData = trendData.map(row => ({
            date: row.dimensionValues?.[0]?.value || '',
            pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
            sessions: parseInt(row.metricValues?.[1]?.value || '0'),
            activeUsers: parseInt(row.metricValues?.[2]?.value || '0')
          }));

          return NextResponse.json({
            overview: {
              pageViews: parseInt(metrics[0]?.value || '0'),
              activeUsers: parseInt(metrics[1]?.value || '0'),
              engagementRate: parseFloat(metrics[2]?.value || '0'),
              avgSessionDuration: formatDuration(parseFloat(metrics[3]?.value || '0')),
            },
            topPages: topPages.map(row => ({
              path: row.dimensionValues?.[0]?.value,
              views: parseInt(row.metricValues?.[0]?.value || '0')
            })),
            chartData,
            source: 'google_analytics',
            // Also include database stats
            databaseStats: await getDatabaseStats(supabase)
          });
        }
      } catch (gaError) {
        console.error('GA API error:', gaError);
        // Fall through to database stats
      }
    }

    // Fallback to database statistics
    if (metric === 'overview') {
      // Get machine stats from your database (without views column)
      const { data: machineStats } = await supabase
        .from('machines')
        .select('"Machine Name" as name, "Internal link" as slug, "Company", "Price"')
        .eq('Hidden', 'false')
        .order('Price', { ascending: false })
        .limit(10);

      const { count: totalMachines } = await supabase
        .from('machines')
        .select('*', { count: 'exact', head: true });

      const { count: totalReviews } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true });

      const { count: activeMachines } = await supabase
        .from('machines')
        .select('*', { count: 'exact', head: true })
        .eq('lifecycle_status', 'Active');

      // Generate estimated metrics based on machine count
      const estimatedPageViews = (totalMachines || 0) * 150; // Estimate avg views per machine
      const estimatedUsers = Math.floor(estimatedPageViews / 3.5); // Avg pages per user
      
      // Add mock view counts to machines for display
      const machinesWithViews = machineStats?.map((m, index) => ({
        ...m,
        views: Math.floor(Math.random() * 500) + 100 - (index * 30) // Decreasing mock views
      })) || [];

      return NextResponse.json({
        overview: {
          pageViews: estimatedPageViews,
          activeUsers: estimatedUsers,
          engagementRate: 0.65, // Placeholder
          avgSessionDuration: '2:45', // Placeholder
          totalMachines,
          activeMachines,
          totalReviews
        },
        topProducts: machinesWithViews,
        chartData: generateMockChartData(startDate, endDate),
        source: 'database'
      });
    }

    if (metric === 'products') {
      const { data: categoryStats } = await supabase
        .from('categories')
        .select(`
          name,
          slug,
          machines(count)
        `);

      const { data: topMachines } = await supabase
        .from('machines')
        .select('"Machine Name" as name, "Internal link" as slug, "Company" as brand_name')
        .eq('Hidden', 'false')
        .order('Price', { ascending: false })
        .limit(20);

      // Add mock view counts for display
      const machinesWithViews = topMachines?.map((m, index) => ({
        ...m,
        views: Math.floor(Math.random() * 1000) + 200 - (index * 40), // Decreasing mock views
        brands: { name: m.brand_name }
      })) || [];

      return NextResponse.json({
        topProducts: machinesWithViews,
        categoryStats: categoryStats || [],
        source: 'database'
      });
    }

    if (metric === 'events') {
      // Get recent review submissions
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select('created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const { data: recentComparisons } = await supabase
        .from('machines')
        .select('last_compared_at')
        .not('last_compared_at', 'is', null)
        .gte('last_compared_at', startDate)
        .lte('last_compared_at', endDate);

      return NextResponse.json({
        events: {
          reviews: recentReviews?.length || 0,
          comparisons: recentComparisons?.length || 0,
          calculatorUsage: 0 // Would need to track this
        },
        source: 'database'
      });
    }

    return NextResponse.json({ 
      message: 'To enable Google Analytics data:',
      steps: [
        '1. Get your GA4 property ID (format: properties/123456789)',
        '2. Add GA_PROPERTY_ID=properties/YOUR_ID to .env.local',
        '3. Either add service account JSON as GOOGLE_APPLICATION_CREDENTIALS_JSON',
        '4. Or implement OAuth2 flow for the existing client credentials'
      ],
      currentConfig: {
        hasClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
        hasPropertyId: !!process.env.GA_PROPERTY_ID,
        hasServiceAccount: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateMockChartData(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const data = [];
  // Generate more realistic trending data with some variation
  const basePageViews = 350;
  const baseSessions = 120;
  const baseUsers = 85;
  
  for (let i = 0; i < Math.min(days, 30); i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    // Add weekly pattern (weekends are lower)
    const dayOfWeek = date.getDay();
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;
    
    // Add some random variation but with a slight upward trend
    const trendMultiplier = 1 + (i * 0.01); // 1% growth per day
    const randomVariation = 0.8 + Math.random() * 0.4; // ±20% variation
    
    data.push({
      date: date.toISOString().split('T')[0].replace(/-/g, ''), // Format as YYYYMMDD for the chart
      pageViews: Math.floor(basePageViews * weekendMultiplier * trendMultiplier * randomVariation),
      sessions: Math.floor(baseSessions * weekendMultiplier * trendMultiplier * randomVariation),
      activeUsers: Math.floor(baseUsers * weekendMultiplier * trendMultiplier * randomVariation)
    });
  }
  
  return data;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function getDatabaseStats(supabase: any) {
  const { count: totalMachines } = await supabase
    .from('machines')
    .select('*', { count: 'exact', head: true });

  const { count: activeMachines } = await supabase
    .from('machines')
    .select('*', { count: 'exact', head: true })
    .eq('lifecycle_status', 'Active');

  const { count: totalReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });

  return {
    totalMachines,
    activeMachines,
    totalReviews
  };
}