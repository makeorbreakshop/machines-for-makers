export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '5');
    
    // Fetch recent videos
    const { data: videos, error } = await supabase
      .from('youtube_videos')
      .select(`
        id,
        youtube_id,
        title,
        description,
        thumbnail_url,
        duration,
        published_at,
        view_count,
        like_count,
        comment_count,
        status,
        machine_videos (
          machine_id
        )
      `)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching videos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format duration for display
    const formattedVideos = (videos || []).map(video => ({
      ...video,
      duration: formatDuration(video.duration)
    }));

    return NextResponse.json({ videos: formattedVideos });
  } catch (error) {
    console.error('Videos API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatDuration(isoDuration: string | null): string {
  if (!isoDuration) return '';
  
  // Parse ISO 8601 duration format (e.g., PT4M33S)
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}