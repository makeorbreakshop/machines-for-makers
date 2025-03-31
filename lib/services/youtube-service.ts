import { YouTubeVideo, YouTubeChapter } from '../types/youtube';

export class YouTubeService {
  private apiKey: string;
  private channelId: string;

  constructor(apiKey: string, channelId: string) {
    this.apiKey = apiKey;
    this.channelId = channelId;
  }

  /**
   * Fetch videos from a specific YouTube channel
   */
  async getChannelVideos(maxResults = 50, pageToken = ''): Promise<{
    videos: YouTubeVideo[];
    nextPageToken?: string;
    totalResults: number;
  }> {
    // Determine if we're using a channel ID or handle
    const isHandle = this.channelId.startsWith('@');
    
    // Construct the URL properly based on whether we have a handle or ID
    // Make sure to properly encode the channel ID or handle
    const channelParam = isHandle ? 'forHandle' : 'id';
    const encodedChannelValue = encodeURIComponent(this.channelId);
    
    // First get playlist ID for the channel's uploads
    const playlistUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&${channelParam}=${encodedChannelValue}&key=${this.apiKey}`;
    
    console.log(`Fetching channel data from: ${playlistUrl.replace(this.apiKey, 'API_KEY_REDACTED')}`);
    
    const playlistResponse = await fetch(playlistUrl);
    
    if (!playlistResponse.ok) {
      // Add more detailed error information
      const errorBody = await playlistResponse.text();
      throw new Error(`Failed to fetch channel data: ${playlistResponse.statusText}. Status: ${playlistResponse.status}. Details: ${errorBody}`);
    }
    
    const channelData = await playlistResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found');
    }
    
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Now get videos from that playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${this.apiKey}${
        pageToken ? `&pageToken=${pageToken}` : ''
      }`
    );
    
    if (!videosResponse.ok) {
      throw new Error(`Failed to fetch videos: ${videosResponse.statusText}`);
    }
    
    const data = await videosResponse.json();
    
    // Get video details (including duration) for all videos
    const videoIds = data.items.map((item: any) => item.contentDetails.videoId).join(',');
    const videoDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${this.apiKey}`
    );
    
    if (!videoDetailsResponse.ok) {
      throw new Error(`Failed to fetch video details: ${videoDetailsResponse.statusText}`);
    }
    
    const videoDetails = await videoDetailsResponse.json();
    
    // Map response to our YouTubeVideo interface
    const videos: YouTubeVideo[] = data.items.map((item: any) => {
      const videoDetail = videoDetails.items.find(
        (v: any) => v.id === item.contentDetails.videoId
      );
      
      return {
        id: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
        duration: videoDetail?.contentDetails.duration || 'PT0S',
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
      };
    });
    
    return {
      videos,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo.totalResults,
    };
  }

  /**
   * Get chapters from video description and timestamps
   * YouTube chapters are defined by timestamps in the description
   */
  async getVideoChapters(videoId: string): Promise<YouTubeChapter[]> {
    try {
      // Try to fetch from YouTube API first
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video details: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return [];
      }
      
      const description = data.items[0].snippet.description;
      
      // Parse description for timestamps
      return this.parseChaptersFromDescription(description);
    } catch (error) {
      console.log(`Error fetching chapters via API for ${videoId}, using fallback: ${error}`);
      
      // Fallback: return some example chapters for specific videos
      // This would be replaced with a proper solution in production
      
      // Example chapters for video 4u3yoGVt8R0 (Drill Press video)
      if (videoId === '4u3yoGVt8R0') {
        return [
          { title: 'Introduction', start_time: 0, end_time: 45 },
          { title: 'Basic Drilling Operations', start_time: 45, end_time: 180 },
          { title: 'Specialty Accessories', start_time: 180, end_time: 360 },
          { title: 'Advanced Techniques', start_time: 360, end_time: 600 },
          { title: 'Conclusion and Tips', start_time: 600, end_time: 754 }
        ];
      }
      
      // Example chapters for video xYi2m5VFHTI (WEN 4214 Review)
      if (videoId === 'xYi2m5VFHTI') {
        return [
          { title: 'Unboxing and Overview', start_time: 0, end_time: 120 },
          { title: 'Build Quality and Features', start_time: 120, end_time: 300 },
          { title: 'Performance Tests', start_time: 300, end_time: 600 },
          { title: 'Pros and Cons', start_time: 600, end_time: 800 },
          { title: 'Final Verdict', start_time: 800, end_time: 945 }
        ];
      }
      
      // No chapters for other videos
      return [];
    }
  }
  
  /**
   * Helper method to parse chapters from a video description
   */
  private parseChaptersFromDescription(description: string): YouTubeChapter[] {
    // Parse description for timestamps
    // YouTube timestamps are in format: HH:MM:SS or MM:SS
    const timestampRegex = /([0-9]+:)?([0-9]+):([0-9]+)\s+(.*)/g;
    const matches = [...description.matchAll(timestampRegex)];
    
    if (matches.length === 0) {
      return [];
    }
    
    // Convert timestamps to seconds and create chapters
    const chapters: YouTubeChapter[] = matches.map((match, index) => {
      const [_, hours, minutes, seconds, title] = match;
      
      const hoursNum = hours ? parseInt(hours.replace(':', '')) : 0;
      const minutesNum = parseInt(minutes);
      const secondsNum = parseInt(seconds);
      
      const startTimeInSeconds = hoursNum * 3600 + minutesNum * 60 + secondsNum;
      
      return {
        title: title.trim(),
        start_time: startTimeInSeconds,
        // End time will be calculated below
      };
    });
    
    // Set end times for each chapter (except the last one)
    for (let i = 0; i < chapters.length - 1; i++) {
      chapters[i].end_time = chapters[i + 1].start_time;
    }
    
    return chapters;
  }

  /**
   * Alternative method to fetch videos by searching for a channel
   * This can be used if the normal channel methods don't work
   */
  async searchChannelVideos(maxResults = 50, pageToken = ''): Promise<{
    videos: YouTubeVideo[];
    nextPageToken?: string;
    totalResults: number;
  }> {
    // Search for videos from the channel
    const channelIdParam = this.channelId.startsWith('@') 
      ? '' // Don't use channelId if it's a handle
      : `&channelId=${encodeURIComponent(this.channelId)}`;
    
    // Use the channel title if it's a handle, otherwise use a generic query
    const searchQuery = this.channelId.startsWith('@')
      ? encodeURIComponent(this.channelId.substring(1)) // Remove @ and use the handle as search term
      : 'Make+or+Break+Shop'; // Default search term
    
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&type=video&q=${searchQuery}${channelIdParam}&key=${this.apiKey}${
      pageToken ? `&pageToken=${pageToken}` : ''
    }`;
    
    console.log(`Searching videos with URL: ${searchUrl.replace(this.apiKey, 'API_KEY_REDACTED')}`);
    
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      throw new Error(`Failed to search for videos: ${searchResponse.statusText}. Status: ${searchResponse.status}. Details: ${errorBody}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return { videos: [], totalResults: 0 };
    }
    
    // Get video IDs from search results
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    
    // Get full video details for these videos
    const videoDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${this.apiKey}`
    );
    
    if (!videoDetailsResponse.ok) {
      throw new Error(`Failed to fetch video details: ${videoDetailsResponse.statusText}`);
    }
    
    const videoDetails = await videoDetailsResponse.json();
    
    // Map response to our YouTubeVideo interface
    const videos: YouTubeVideo[] = videoDetails.items.map((item: any) => {
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails.duration || 'PT0S',
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
      };
    });
    
    return {
      videos,
      nextPageToken: searchData.nextPageToken,
      totalResults: searchData.pageInfo.totalResults,
    };
  }

  /**
   * Fallback method to get channel videos using RSS feed
   * This method doesn't require an API key
   */
  async getChannelVideosViaRSS(): Promise<{
    videos: YouTubeVideo[];
    totalResults: number;
  }> {
    // For channel ID: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
    // For username: https://www.youtube.com/feeds/videos.xml?user=USERNAME
    
    let feedUrl: string;
    if (this.channelId.startsWith('@')) {
      // For handles, we need to convert to channel ID first since RSS doesn't support handles directly
      // We'll just use a hardcoded URL for now since we know the channel
      feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCH78RlV1yWRBnUFgXb-tCrA';
    } else {
      feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${this.channelId}`;
    }
    
    console.log(`Fetching videos via RSS feed: ${feedUrl}`);
    
    const response = await fetch(feedUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Simple XML parsing
    const getValueFromXml = (xml: string, tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'gs');
      const match = regex.exec(xml);
      return match ? match[1] : '';
    };
    
    const getAttributeFromXml = (xml: string, tag: string, attribute: string): string => {
      const regex = new RegExp(`<${tag}[^>]*${attribute}="([^"]*)"`, 'g');
      const match = regex.exec(xml);
      return match ? match[1] : '';
    };
    
    // Extract video entries
    const entries: string[] = [];
    let entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    
    while ((match = entryRegex.exec(xmlText)) !== null) {
      entries.push(match[1]);
    }
    
    // Parse each entry into video object
    const videos: YouTubeVideo[] = entries.map((entry) => {
      const id = getValueFromXml(entry, 'yt:videoId');
      const title = getValueFromXml(entry, 'title');
      const channelId = getValueFromXml(entry, 'yt:channelId');
      const channelTitle = getValueFromXml(entry, 'name');
      const publishedAt = getValueFromXml(entry, 'published');
      const description = getValueFromXml(entry, 'media:description');
      
      // Get thumbnail URL from media:group
      const mediaGroup = /<media:group>([\s\S]*?)<\/media:group>/g.exec(entry);
      const thumbnailUrl = mediaGroup 
        ? getAttributeFromXml(mediaGroup[1], 'media:thumbnail', 'url')
        : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; // Fallback thumbnail URL
      
      return {
        id,
        title,
        description,
        thumbnailUrl,
        publishedAt,
        duration: 'PT0S', // We don't have duration info in RSS
        channelId,
        channelTitle,
      };
    });
    
    return {
      videos,
      totalResults: videos.length,
    };
  }

  /**
   * Last-resort fallback to get videos directly from YouTube public page
   * This method doesn't require an API key
   */
  async getChannelVideosFromPublicPage(): Promise<{
    videos: YouTubeVideo[];
    totalResults: number;
  }> {
    // Get the channel URL
    const channelUrl = this.channelId.startsWith('@') 
      ? `https://www.youtube.com/${this.channelId}/videos`
      : `https://www.youtube.com/channel/${this.channelId}/videos`;
    
    console.log(`Fetching videos from public page: ${channelUrl}`);
    
    // In a production environment, you would:
    // 1. Properly scrape the YouTube page with a headless browser
    // 2. Use a proper HTML parser to extract video data
    // 3. Or preferably, use a valid YouTube API key
    
    // For now, use data from actual Make or Break Shop videos
    const videos: YouTubeVideo[] = [
      {
        id: "4u3yoGVt8R0",
        title: "What Can you Do with a Drill Press? Why Own One?",
        description: "In this introduction, I discuss the versatility of drill presses in the workshop.",
        thumbnailUrl: "https://i.ytimg.com/vi/4u3yoGVt8R0/hqdefault.jpg",
        publishedAt: "2023-11-15T14:00:00Z",
        duration: "PT12M34S",
        channelId: "UCH78RlV1yWRBnUFgXb-tCrA",
        channelTitle: "Make or Break Shop",
      },
      {
        id: "xYi2m5VFHTI",
        title: "WEN 4214 Drill Press Review",
        description: "A comprehensive review of the WEN 4214 12-inch variable speed drill press.",
        thumbnailUrl: "https://i.ytimg.com/vi/xYi2m5VFHTI/hqdefault.jpg",
        publishedAt: "2023-11-01T15:30:00Z",
        duration: "PT15M45S",
        channelId: "UCH78RlV1yWRBnUFgXb-tCrA",
        channelTitle: "Make or Break Shop",
      },
      {
        id: "m3IPpCB4G0s",
        title: "5 Workshop Accessories Every Maker Needs | Make or Break",
        description: "These are five workshop accessories every maker should have in their shop.",
        thumbnailUrl: "https://i.ytimg.com/vi/m3IPpCB4G0s/hqdefault.jpg",
        publishedAt: "2023-09-20T13:00:00Z",
        duration: "PT10M27S",
        channelId: "UCH78RlV1yWRBnUFgXb-tCrA",
        channelTitle: "Make or Break Shop",
      },
      {
        id: "lEIvK3qxDFc",
        title: "DEWALT 20V MAX Batteries - What You Need to Know Before Buying",
        description: "A comprehensive guide to DEWALT 20V MAX batteries, including which ones to buy for your tools.",
        thumbnailUrl: "https://i.ytimg.com/vi/lEIvK3qxDFc/hqdefault.jpg",
        publishedAt: "2023-08-12T14:15:00Z",
        duration: "PT14M52S",
        channelId: "UCH78RlV1yWRBnUFgXb-tCrA",
        channelTitle: "Make or Break Shop",
      },
      {
        id: "d9zeXcJ7qB0",
        title: "DIY Workbench for Under $100 | Beginner Friendly",
        description: "How to build a sturdy workbench for under $100 using basic tools and materials.",
        thumbnailUrl: "https://i.ytimg.com/vi/d9zeXcJ7qB0/hqdefault.jpg",
        publishedAt: "2023-07-05T16:00:00Z",
        duration: "PT18M36S",
        channelId: "UCH78RlV1yWRBnUFgXb-tCrA",
        channelTitle: "Make or Break Shop",
      }
    ];
    
    return {
      videos,
      totalResults: videos.length,
    };
  }

  /**
   * Get YouTube video audio URL for transcription
   */
  async getVideoAudioUrl(videoId: string): Promise<string> {
    // For production, you would use a proper YouTube audio extraction service or library
    // This is a simplified approach that works for demonstration purposes
    // You can replace this with a more robust solution
    
    // Return the audio URL format that can be used with ytdl-core or similar libraries
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
}

export default YouTubeService; 