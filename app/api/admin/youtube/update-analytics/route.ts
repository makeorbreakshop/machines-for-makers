export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { videoIds } = body; // Optional: specific video IDs to update

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    // Initialize YouTube API
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });

    let videosToUpdate: any[] = [];

    if (videoIds && Array.isArray(videoIds)) {
      // Update specific videos
      const { data: videos } = await supabase
        .from('youtube_videos')
        .select('id, youtube_id')
        .in('id', videoIds);
      
      videosToUpdate = videos || [];
    } else {
      // Update all videos (or those not updated recently)
      // Update videos that haven't been updated in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: videos } = await supabase
        .from('youtube_videos')
        .select('id, youtube_id')
        .or(`analytics_last_updated.is.null,analytics_last_updated.lt.${oneDayAgo.toISOString()}`)
        .limit(50); // Limit to 50 to avoid API quota issues
      
      videosToUpdate = videos || [];
    }

    if (videosToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos to update',
        updated: 0
      });
    }

    // Get YouTube IDs
    const youtubeIds = videosToUpdate.map(v => v.youtube_id).filter(Boolean);
    
    // Fetch updated statistics from YouTube
    const videosResponse = await youtube.videos.list({
      part: ['statistics', 'snippet'],
      id: youtubeIds
    });

    const videoDetails = videosResponse.data.items || [];
    let updatedCount = 0;

    // Update each video in the database
    for (const videoDetail of videoDetails) {
      const statistics = videoDetail.statistics || {};
      const snippet = videoDetail.snippet || {};
      
      const updateData = {
        view_count: parseInt(statistics.viewCount || '0'),
        like_count: parseInt(statistics.likeCount || '0'),
        comment_count: parseInt(statistics.commentCount || '0'),
        favorite_count: parseInt(statistics.favoriteCount || '0'),
        tags: snippet.tags || [],
        category_id: snippet.categoryId || null,
        analytics_last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('youtube_videos')
        .update(updateData)
        .eq('youtube_id', videoDetail.id);

      if (!error) {
        updatedCount++;
      } else {
        console.error(`Error updating analytics for video ${videoDetail.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      message: `Updated analytics for ${updatedCount} videos`
    });

  } catch (error) {
    console.error('Update analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update analytics' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current analytics for display
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');

    if (!videoId) {
      // Return overall analytics
      const { data: analytics } = await supabase
        .from('youtube_videos')
        .select('view_count, like_count, comment_count')
        .not('view_count', 'is', null);

      const totals = analytics?.reduce(
        (acc, video) => ({
          totalViews: acc.totalViews + (video.view_count || 0),
          totalLikes: acc.totalLikes + (video.like_count || 0),
          totalComments: acc.totalComments + (video.comment_count || 0)
        }),
        { totalViews: 0, totalLikes: 0, totalComments: 0 }
      ) || { totalViews: 0, totalLikes: 0, totalComments: 0 };

      const avgEngagementRate = analytics?.length 
        ? analytics.reduce((sum, v) => {
            const rate = v.view_count > 0 
              ? ((v.like_count + v.comment_count) / v.view_count) * 100
              : 0;
            return sum + rate;
          }, 0) / analytics.length
        : 0;

      return NextResponse.json({
        ...totals,
        videoCount: analytics?.length || 0,
        avgEngagementRate: avgEngagementRate.toFixed(2)
      });
    } else {
      // Return specific video analytics
      const { data: video } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(video);
    }
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get analytics' },
      { status: 500 }
    );
  }
}