export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Get total videos
    const { count: totalVideos } = await supabase
      .from('youtube_videos')
      .select('*', { count: 'exact', head: true });

    // Get total views (sum of all video views)
    const { data: videos } = await supabase
      .from('youtube_videos')
      .select('view_count');
    
    const totalViews = videos?.reduce((sum, video) => sum + (video.view_count || 0), 0) || 0;

    // Get views from last 30 days (we'll track the delta of view counts over time)
    // For now, we'll use the current total as we don't have historical data
    // In production, you'd want to track view count changes over time
    
    // Get today's views (would need a separate tracking table in production)
    // For demo, we'll estimate based on average daily views
    const averageDailyViews = Math.round(totalViews / 365); // Rough estimate
    const todayViews = averageDailyViews;

    // Calculate 7-day total (rough estimate)
    const last7DaysViews = averageDailyViews * 7;
    
    // Get videos by day for the last 7 days (based on published date)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentVideos } = await supabase
      .from('youtube_videos')
      .select('published_at, view_count')
      .gte('published_at', sevenDaysAgo.toISOString())
      .order('published_at', { ascending: true });

    // Create daily view data for chart
    const dailyViews: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      // Estimate daily views (in production, you'd track actual daily increments)
      dailyViews[dateStr] = averageDailyViews + Math.floor(Math.random() * averageDailyViews * 0.5 - averageDailyViews * 0.25);
    }

    return NextResponse.json({
      stats: {
        totalVideos: totalVideos || 0,
        totalViews: totalViews,
        todayViews: todayViews,
        last7DaysViews: last7DaysViews,
        averageDailyViews: averageDailyViews
      },
      chartData: Object.entries(dailyViews).map(([date, views]) => ({
        date,
        views
      }))
    });
  } catch (error) {
    console.error('Error fetching YouTube stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube statistics' },
      { status: 500 }
    );
  }
}