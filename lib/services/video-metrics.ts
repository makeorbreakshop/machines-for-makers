import { createServiceClient } from '@/lib/supabase/server';

export interface VideoMetric {
  machine_id: string;
  machine_name: string;
  video_count: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  avg_engagement_rate: number;
  top_videos: {
    title: string;
    youtube_id: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    published_at: string;
    thumbnail_url: string;
  }[];
}

export interface VideoSummaryStats {
  total_videos: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  machines_with_videos: number;
  avg_engagement_rate: number;
}

export async function getVideoMetricsForMachines(
  machineIds: string[]
): Promise<{ metrics: VideoMetric[], summary: VideoSummaryStats }> {
  const supabase = createServiceClient();

  // First, get machine names
  const { data: machines } = await supabase
    .from('machines')
    .select('id, "Machine Name"')
    .in('id', machineIds);
  
  const machineMap = new Map(machines?.map(m => [m.id, m['Machine Name']]) || []);

  // Then fetch videos with simpler query - handle >1000 rows with pagination
  const allVideoData: any[] = [];
  let hasMore = true;
  let offset = 0;
  const limit = 1000;
  
  while (hasMore) {
    const { data: videoData, error } = await supabase
      .from('machine_videos')
      .select(`
        machine_id,
        youtube_video_id,
        youtube_videos!machine_videos_youtube_video_id_fkey(*)
      `)
      .in('machine_id', machineIds)
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching video metrics:', error);
      break;
    }
    
    if (videoData) {
      allVideoData.push(...videoData);
      hasMore = videoData.length === limit;
      offset += limit;
    } else {
      hasMore = false;
    }
  }

  // Process video data by machine
  const videoMetricsMap = new Map<string, VideoMetric>();
  
  for (const video of allVideoData) {
    if (!video.machine_id || !video.youtube_videos) continue;
    
    const key = video.machine_id;
    const machineName = machineMap.get(video.machine_id) || 'Unknown Machine';
    
    const existing = videoMetricsMap.get(key) || {
      machine_id: video.machine_id,
      machine_name: machineName,
      video_count: 0,
      total_views: 0,
      total_likes: 0,
      total_comments: 0,
      avg_engagement_rate: 0,
      top_videos: [],
    };

    existing.video_count += 1;
    existing.total_views += video.youtube_videos.view_count || 0;
    existing.total_likes += video.youtube_videos.like_count || 0;
    existing.total_comments += video.youtube_videos.comment_count || 0;
    
    // Add to top videos list
    existing.top_videos.push({
      title: video.youtube_videos.title || '',
      youtube_id: video.youtube_videos.youtube_id || '',
      view_count: video.youtube_videos.view_count || 0,
      like_count: video.youtube_videos.like_count || 0,
      comment_count: video.youtube_videos.comment_count || 0,
      published_at: video.youtube_videos.published_at || '',
      thumbnail_url: video.youtube_videos.thumbnail_url || '',
    });
    
    videoMetricsMap.set(key, existing);
  }

  // Calculate engagement rates and sort top videos
  const videoMetrics = Array.from(videoMetricsMap.values()).map(metric => {
    // Sort top videos by view count and keep top 3
    metric.top_videos.sort((a, b) => b.view_count - a.view_count);
    metric.top_videos = metric.top_videos.slice(0, 3);
    
    // Calculate average engagement rate
    if (metric.total_views > 0) {
      metric.avg_engagement_rate = ((metric.total_likes + metric.total_comments) / metric.total_views) * 100;
    }
    
    return metric;
  });

  // Sort video metrics by total views
  videoMetrics.sort((a, b) => b.total_views - a.total_views);

  // Calculate summary statistics
  const summary: VideoSummaryStats = {
    total_videos: videoMetrics.reduce((sum, m) => sum + m.video_count, 0),
    total_views: videoMetrics.reduce((sum, m) => sum + m.total_views, 0),
    total_likes: videoMetrics.reduce((sum, m) => sum + m.total_likes, 0),
    total_comments: videoMetrics.reduce((sum, m) => sum + m.total_comments, 0),
    machines_with_videos: videoMetrics.length,
    avg_engagement_rate: videoMetrics.length > 0 
      ? videoMetrics.reduce((sum, m) => sum + m.avg_engagement_rate, 0) / videoMetrics.length
      : 0,
  };

  return { metrics: videoMetrics, summary };
}

export async function getVideoMetricsForPeriod(
  machineIds: string[],
  startDate: string,
  endDate: string
): Promise<{ metrics: VideoMetric[], summary: VideoSummaryStats }> {
  // For now, just return all-time metrics
  // TODO: Implement period filtering when needed
  return getVideoMetricsForMachines(machineIds);
}

function getEmptySummary(): VideoSummaryStats {
  return {
    total_videos: 0,
    total_views: 0,
    total_likes: 0,
    total_comments: 0,
    machines_with_videos: 0,
    avg_engagement_rate: 0,
  };
}

export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}