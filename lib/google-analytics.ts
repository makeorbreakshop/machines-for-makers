import { google } from 'googleapis';

export async function getGoogleAnalyticsData(dateRange: string) {
  try {
    // Check if Google Analytics credentials are configured
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.log('Google Analytics not configured - using fallback data');
      return {
        sourceData: [],
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
        sourceData: [],
        isConnected: false,
      };
    }

    // Calculate date range
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // Get source/medium data from Google Analytics
    const response = await analyticsDataClient.properties.runReport({
      property: propertyId,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ],
        dimensions: [
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'sessionCampaignName' }
        ],
        orderBys: [
          {
            metric: {
              metricName: 'totalUsers'
            },
            desc: true
          }
        ],
        limit: 100
      },
    });

    // Process the data into the expected format
    const sourceData = response.data.rows?.map(row => ({
      source: row.dimensionValues?.[0]?.value || 'direct',
      medium: row.dimensionValues?.[1]?.value || '',
      campaign: row.dimensionValues?.[2]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
    })) || [];

    return {
      sourceData,
      isConnected: true,
    };

  } catch (error) {
    console.error('Google Analytics error:', error);
    // Return fallback data if GA fails
    return {
      sourceData: [],
      isConnected: false,
    };
  }
}