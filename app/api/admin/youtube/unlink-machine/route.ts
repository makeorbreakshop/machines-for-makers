export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { videoId, machineId } = body;

    if (!videoId || !machineId) {
      return NextResponse.json(
        { error: 'Invalid request: videoId and machineId required' },
        { status: 400 }
      );
    }

    // Check if this was the primary machine
    const { data: linkToDelete } = await supabase
      .from('machine_videos')
      .select('is_primary')
      .eq('youtube_video_id', videoId)
      .eq('machine_id', machineId)
      .single();

    // Delete the link
    const { error: deleteError } = await supabase
      .from('machine_videos')
      .delete()
      .eq('youtube_video_id', videoId)
      .eq('machine_id', machineId);

    if (deleteError) {
      console.error('Error unlinking machine:', deleteError);
      throw new Error('Failed to unlink machine');
    }

    // If this was the primary machine, assign a new primary
    if (linkToDelete?.is_primary) {
      const { data: remainingLinks } = await supabase
        .from('machine_videos')
        .select('machine_id')
        .eq('youtube_video_id', videoId)
        .limit(1);

      if (remainingLinks && remainingLinks.length > 0) {
        await supabase
          .from('machine_videos')
          .update({ is_primary: true })
          .eq('youtube_video_id', videoId)
          .eq('machine_id', remainingLinks[0].machine_id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Machine unlinked successfully'
    });

  } catch (error) {
    console.error('Unlink machine error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unlink machine' },
      { status: 500 }
    );
  }
}