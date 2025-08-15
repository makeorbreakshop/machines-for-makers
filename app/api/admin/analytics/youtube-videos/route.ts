export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search query and pagination
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') || '';
    const pageToken = url.searchParams.get('pageToken') || '';

    // Check if YouTube API is configured
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_;
    if (!apiKey) {
      return NextResponse.json({ 
        videos: [],
        error: 'YouTube API key not configured' 
      });
    }

    // Initialize YouTube API
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });

    // Get channel ID from environment
    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    try {
      // Search videos - prioritize channel videos
      const searchParams: any = {
        part: ['snippet'],
        type: ['video'],
        order: 'date', // This orders by upload date (newest first)
        maxResults: 20, // Always fetch 20 for better scrolling experience
      };
      
      // If we have a channel ID and no search query, show only channel videos
      if (channelId && !searchQuery) {
        searchParams.channelId = channelId;
      } else if (searchQuery) {
        // If there's a search query, search within the channel if available
        searchParams.q = searchQuery;
        if (channelId) {
          searchParams.channelId = channelId;
        }
      } else {
        // Fallback if no channel ID and no search
        searchParams.q = 'machines for makers';
      }
      
      // Add page token for pagination
      if (pageToken) {
        searchParams.pageToken = pageToken;
      }
      
      const response = await youtube.search.list(searchParams);

      const videos = response.data.items?.map(item => ({
        id: item.id?.videoId || '',
        title: item.snippet?.title || '',
        publishedAt: item.snippet?.publishedAt || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        description: item.snippet?.description || '',
      })) || [];

      return NextResponse.json({ 
        videos,
        nextPageToken: response.data.nextPageToken || null,
        totalResults: response.data.pageInfo?.totalResults || 0
      });

    } catch (youtubeError: any) {
      console.error('YouTube API error:', youtubeError);
      
      // Return empty array instead of error to gracefully handle
      return NextResponse.json({ 
        videos: [],
        error: 'Failed to fetch YouTube videos' 
      });
    }

  } catch (error) {
    console.error('YouTube videos API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}