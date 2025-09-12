export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { channelId: customChannelId } = body;

    // Use custom channel ID or fall back to environment variable
    const channelId = customChannelId || process.env.YOUTUBE_CHANNEL_ID;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'YouTube channel ID not provided' },
        { status: 400 }
      );
    }

    // Initialize YouTube API
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });

    // Fetch channel's uploaded videos playlist
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId]
    });

    const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { error: 'Could not find uploads playlist for channel' },
        { status: 404 }
      );
    }

    // Fetch all videos from uploads playlist (with pagination)
    let allVideos: any[] = [];
    let nextPageToken: string | undefined = undefined;
    const maxResults = 50; // Max allowed by YouTube API
    const maxPages = 10; // Limit to 500 videos total
    let pageCount = 0;

    do {
      const playlistResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults,
        pageToken: nextPageToken
      });

      if (playlistResponse.data.items) {
        allVideos = allVideos.concat(playlistResponse.data.items);
      }

      nextPageToken = playlistResponse.data.nextPageToken || undefined;
      pageCount++;
    } while (nextPageToken && pageCount < maxPages);

    // Get video IDs for fetching statistics
    const videoIds = allVideos.map(item => item.contentDetails?.videoId).filter(Boolean);
    
    // Fetch video statistics and additional details in batches of 50
    const videoDetails: any[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const videosResponse = await youtube.videos.list({
        part: ['statistics', 'contentDetails', 'snippet'],
        id: batch
      });
      
      if (videosResponse.data.items) {
        videoDetails.push(...videosResponse.data.items);
      }
    }

    // Create a map for quick lookup
    const videoDetailsMap = new Map(
      videoDetails.map(video => [video.id, video])
    );

    // Process and upsert videos
    let newVideos = 0;
    let updatedVideos = 0;

    for (const item of allVideos) {
      const videoId = item.contentDetails?.videoId;
      if (!videoId) continue;

      const details = videoDetailsMap.get(videoId);
      const snippet = item.snippet;
      const statistics = details?.statistics || {};
      const contentDetails = details?.contentDetails || {};
      const fullSnippet = details?.snippet || snippet;

      const videoData = {
        youtube_id: videoId,
        title: snippet?.title || '',
        description: snippet?.description || '',
        thumbnail_url: snippet?.thumbnails?.maxres?.url || 
                      snippet?.thumbnails?.high?.url || 
                      snippet?.thumbnails?.medium?.url || 
                      snippet?.thumbnails?.default?.url || '',
        published_at: snippet?.publishedAt || null,
        channel_id: snippet?.channelId || channelId,
        duration: contentDetails?.duration || null,
        view_count: parseInt(statistics.viewCount || '0'),
        like_count: parseInt(statistics.likeCount || '0'),
        comment_count: parseInt(statistics.commentCount || '0'),
        favorite_count: parseInt(statistics.favoriteCount || '0'),
        tags: fullSnippet?.tags || [],
        category_id: fullSnippet?.categoryId || null,
        live_broadcast_content: fullSnippet?.liveBroadcastContent || null,
        default_language: fullSnippet?.defaultLanguage || null,
        default_audio_language: fullSnippet?.defaultAudioLanguage || null,
        analytics_last_updated: new Date().toISOString(),
        status: 'synced',
        updated_at: new Date().toISOString()
      };

      // Check if video exists
      const { data: existingVideo } = await supabase
        .from('youtube_videos')
        .select('id')
        .eq('youtube_id', videoId)
        .single();

      if (existingVideo) {
        // Update existing video
        const { error: updateError } = await supabase
          .from('youtube_videos')
          .update(videoData)
          .eq('youtube_id', videoId);

        if (!updateError) {
          updatedVideos++;
        } else {
          console.error(`Error updating video ${videoId}:`, updateError);
        }
      } else {
        // Insert new video
        const { error: insertError } = await supabase
          .from('youtube_videos')
          .insert({
            ...videoData,
            created_at: new Date().toISOString()
          });

        if (!insertError) {
          newVideos++;
        } else {
          console.error(`Error inserting video ${videoId}:`, insertError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      newVideos,
      updatedVideos,
      totalProcessed: allVideos.length,
      message: `Synced ${newVideos} new videos and updated ${updatedVideos} existing videos`
    });

  } catch (error) {
    console.error('YouTube sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync YouTube videos' },
      { status: 500 }
    );
  }
}