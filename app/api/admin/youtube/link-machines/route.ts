export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { videoId, machineIds } = body;

    if (!videoId || !machineIds || !Array.isArray(machineIds)) {
      return NextResponse.json(
        { error: 'Invalid request: videoId and machineIds array required' },
        { status: 400 }
      );
    }

    // First, get existing machine links for this video
    const { data: existingLinks } = await supabase
      .from('machine_videos')
      .select('machine_id')
      .eq('youtube_video_id', videoId);

    const existingMachineIds = existingLinks?.map(link => link.machine_id) || [];
    
    // Determine which machines to add and which to remove
    const machinesToAdd = machineIds.filter(id => !existingMachineIds.includes(id));
    const machinesToRemove = existingMachineIds.filter(id => !machineIds.includes(id));

    // Remove machines that are no longer selected
    if (machinesToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('machine_videos')
        .delete()
        .eq('youtube_video_id', videoId)
        .in('machine_id', machinesToRemove);

      if (deleteError) {
        console.error('Error removing machine links:', deleteError);
        throw new Error('Failed to remove machine links');
      }
    }

    // Add new machine links
    if (machinesToAdd.length > 0) {
      const newLinks = machinesToAdd.map(machineId => ({
        youtube_video_id: videoId,
        machine_id: machineId,
        created_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('machine_videos')
        .insert(newLinks);

      if (insertError) {
        console.error('Error adding machine links:', insertError);
        throw new Error('Failed to add machine links');
      }
    }

    // Update the primary flag for machines if needed
    // Set the first machine as primary if no primary exists
    if (machineIds.length > 0) {
      const { data: primaryCheck } = await supabase
        .from('machine_videos')
        .select('machine_id')
        .eq('youtube_video_id', videoId)
        .eq('is_primary', true)
        .single();

      if (!primaryCheck) {
        await supabase
          .from('machine_videos')
          .update({ is_primary: true })
          .eq('youtube_video_id', videoId)
          .eq('machine_id', machineIds[0]);
      }
    }

    return NextResponse.json({
      success: true,
      added: machinesToAdd.length,
      removed: machinesToRemove.length,
      message: `Successfully updated machine associations`
    });

  } catch (error) {
    console.error('Link machines error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to link machines' },
      { status: 500 }
    );
  }
}