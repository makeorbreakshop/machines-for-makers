export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Test 1: Simple query without joins
    const { data: simpleVideos, error: simpleError } = await supabase
      .from('youtube_videos')
      .select('*')
      .limit(5);
    
    // Test 2: Count total videos
    const { count } = await supabase
      .from('youtube_videos')
      .select('*', { count: 'exact', head: true });
    
    // Test 3: Try to get machine_videos separately
    const { data: machineVideos, error: mvError } = await supabase
      .from('machine_videos')
      .select('*')
      .limit(5);
    
    // Test 4: Try a manual join approach
    let videosWithMachines = null;
    let joinError = null;
    
    if (simpleVideos && simpleVideos.length > 0) {
      // Get video IDs
      const videoIds = simpleVideos.map(v => v.id);
      
      // Get machine associations for these videos
      const { data: associations, error: assocError } = await supabase
        .from('machine_videos')
        .select(`
          youtube_video_id,
          machine_id,
          is_primary,
          relevance_score
        `)
        .in('youtube_video_id', videoIds);
      
      if (associations && !assocError) {
        // Get machine details
        const machineIds = [...new Set(associations.map(a => a.machine_id))];
        const { data: machines } = await supabase
          .from('machines')
          .select('id, "Machine Name", Company')
          .in('id', machineIds);
        
        // Combine the data
        videosWithMachines = simpleVideos.map(video => {
          const videoAssocs = associations.filter(a => a.youtube_video_id === video.id);
          const machinesForVideo = videoAssocs.map(assoc => {
            const machine = machines?.find(m => m.id === assoc.machine_id);
            return {
              machine_id: assoc.machine_id,
              machine_name: machine?.["Machine Name"] || 'Unknown',
              company: machine?.Company || 'Unknown',
              is_primary: assoc.is_primary,
              relevance_score: assoc.relevance_score
            };
          });
          
          return {
            ...video,
            linked_machines: machinesForVideo
          };
        });
      } else {
        joinError = assocError;
      }
    }
    
    // Test 5: Check table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_columns', { 
        table_name: 'machine_videos',
        schema_name: 'public'
      })
      .select('*');
    
    return NextResponse.json({
      success: true,
      tests: {
        simple_query: {
          success: !simpleError,
          error: simpleError,
          data_count: simpleVideos?.length || 0,
          sample: simpleVideos?.[0] || null
        },
        total_count: {
          count: count || 0
        },
        machine_videos_table: {
          success: !mvError,
          error: mvError,
          data_count: machineVideos?.length || 0,
          sample: machineVideos?.[0] || null
        },
        manual_join: {
          success: !joinError && videosWithMachines !== null,
          error: joinError,
          data_count: videosWithMachines?.length || 0,
          sample: videosWithMachines?.[0] || null
        },
        table_structure: {
          error: columnsError,
          columns: columns || 'RPC function may not exist'
        }
      },
      videos_with_machines: videosWithMachines
    });
    
  } catch (error: any) {
    console.error('Test API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Internal server error',
      details: error
    }, { status: 500 });
  }
}