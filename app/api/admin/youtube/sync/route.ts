import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import YouTubeService from '@/lib/services/youtube-service';
import YouTubeDbService from '@/lib/services/youtube-db-service';

// Try using the handle instead of ID 
const MAKE_OR_BREAK_SHOP_CHANNEL_ID = '@MakeorBreakShop';
// Fallback to channel ID if handle doesn't work
const MAKE_OR_BREAK_SHOP_CHANNEL_ID_FALLBACK = 'UCH78RlV1yWRBnUFgXb-tCrA';

export const dynamic = 'force-dynamic';

async function fetchAllVideos(youtubeService: YouTubeService): Promise<{
  videos: any[];
  totalResults: number;
}> {
  let allVideos: any[] = [];
  let nextPageToken: string | undefined = undefined;
  let totalResults = 0;
  
  console.log("Fetching all videos from YouTube channel (this may take a moment)...");
  
  do {
    const result = await youtubeService.getChannelVideos(50, nextPageToken);
    allVideos = [...allVideos, ...result.videos];
    totalResults = result.totalResults;
    nextPageToken = result.nextPageToken;
    
    console.log(`Fetched page of videos. Total so far: ${allVideos.length}`);
    
    // If we have more pages, continue fetching
    if (nextPageToken) {
      console.log(`More videos available. Fetching next page with token: ${nextPageToken}`);
    }
    
  } while (nextPageToken);
  
  console.log(`Completed fetching all ${allVideos.length} videos from channel`);
  
  return {
    videos: allVideos,
    totalResults: totalResults,
  };
}

async function fetchAllVideosWithFallbacks(apiKey: string): Promise<{
  videos: any[];
  totalResults: number;
}> {
  // Create the primary service with channel handle
  const primaryService = new YouTubeService(apiKey, MAKE_OR_BREAK_SHOP_CHANNEL_ID);
  
  try {
    console.log("Attempting to fetch all videos using channel handle...");
    // Try primary approach - channel handle with pagination
    const result = await fetchAllVideos(primaryService);
    return result;
  } catch (error) {
    console.error("Error fetching with handle, trying fallback method:", error);
    
    // Try the fallback method - direct channel ID with pagination
    const fallbackService = new YouTubeService(apiKey, MAKE_OR_BREAK_SHOP_CHANNEL_ID_FALLBACK);
    
    try {
      console.log("Attempting to fetch all videos using channel ID...");
      const result = await fetchAllVideos(fallbackService);
      return result;
    } catch (secondError) {
      console.error("Error with channel ID, trying search method:", secondError);
      
      try {
        // Try the search method with pagination
        console.log("Attempting to fetch videos using search method...");
        
        // For search, we implement pagination manually
        let allVideos: any[] = [];
        let nextPageToken: string | undefined = undefined;
        let totalResults = 0;
        
        do {
          const result = await fallbackService.searchChannelVideos(50, nextPageToken);
          allVideos = [...allVideos, ...result.videos];
          totalResults = result.totalResults;
          nextPageToken = result.nextPageToken;
          
          console.log(`Fetched page of videos via search. Total so far: ${allVideos.length}`);
        } while (nextPageToken);
        
        console.log(`Successfully fetched ${allVideos.length} videos using search method`);
        return { videos: allVideos, totalResults };
      } catch (thirdError) {
        console.error("Error with search method, trying RSS feed method:", thirdError);
        
        try {
          // Last resort - try the RSS feed method which doesn't require an API key
          console.log("Attempting to fetch videos using RSS feed...");
          const result = await fallbackService.getChannelVideosViaRSS();
          console.log(`Successfully fetched ${result.videos.length} videos using RSS feed`);
          return result;
        } catch (fourthError) {
          console.error("Error with RSS feed method, trying public page method:", fourthError);
          
          // Absolute last resort - hardcoded videos from public page
          console.log("Attempting to fetch videos from public page...");
          const result = await fallbackService.getChannelVideosFromPublicPage();
          console.log(`Successfully fetched ${result.videos.length} videos using public page method`);
          return result;
        }
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    // Check admin authentication
    const adminAuth = await requireAdminAuth();
    if (!adminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug: Check if API key is loaded correctly
    const apiKey = process.env.YOUTUBE_API_KEY;
    console.log("YouTube API key length:", apiKey ? apiKey.length : 0);
    console.log("YouTube API key first 5 chars:", apiKey ? apiKey.substring(0, 5) : "not defined");
    
    if (!apiKey) {
      throw new Error("YouTube API key is not defined in environment variables");
    }

    const dbService = new YouTubeDbService();

    // Fetch all videos with fallbacks if needed
    const { videos, totalResults } = await fetchAllVideosWithFallbacks(apiKey);
    
    if (videos.length === 0) {
      throw new Error("Failed to fetch any videos using all available methods");
    }

    // Save videos to database
    const savedVideos = await dbService.saveVideos(videos);

    // For each video, also fetch and save chapters if available
    for (const video of savedVideos) {
      try {
        // Create a service instance for chapter fetching
        const youtubeService = new YouTubeService(apiKey, MAKE_OR_BREAK_SHOP_CHANNEL_ID);
        const chapters = await youtubeService.getVideoChapters(video.youtube_id);
        if (chapters.length > 0) {
          await dbService.saveChapters(video.id, chapters);
        }
      } catch (error) {
        console.error(`Error fetching chapters for video ${video.youtube_id}:`, error);
        // Continue with other videos even if one fails
      }
    }

    return NextResponse.json({
      message: `Successfully synced ${savedVideos.length} videos`,
      totalVideos: totalResults,
      syncedVideos: savedVideos.length,
    });
  } catch (error: any) {
    console.error('Error syncing YouTube videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync YouTube videos' },
      { status: 500 }
    );
  }
} 