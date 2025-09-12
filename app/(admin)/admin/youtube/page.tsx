export const runtime = 'nodejs';

import { createServiceClient } from '@/lib/supabase/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoLibrary } from './video-library';
import { VideoSync } from './video-sync';
import { MachineLinking } from './machine-linking';

export default async function YouTubePage() {
  const supabase = createServiceClient();
  
  // Fetch all videos without complex joins
  const { data: videos, error } = await supabase
    .from('youtube_videos')
    .select('*')
    .order('published_at', { ascending: false });

  // Log any errors
  if (error) {
    console.error('Error fetching YouTube videos:', error);
  }

  // Fetch machine_videos associations separately
  let videosWithMachines = videos || [];
  if (videos && videos.length > 0) {
    const videoIds = videos.map(v => v.id);
    
    // Get machine associations
    const { data: associations } = await supabase
      .from('machine_videos')
      .select(`
        youtube_video_id,
        machine_id,
        is_primary,
        relevance_score
      `)
      .in('youtube_video_id', videoIds);
    
    if (associations && associations.length > 0) {
      // Get machine details
      const machineIds = [...new Set(associations.map(a => a.machine_id))];
      const { data: machineDetails } = await supabase
        .from('machines')
        .select('id, "Machine Name", Company')
        .in('id', machineIds);
      
      // Combine the data
      videosWithMachines = videos.map(video => {
        const videoAssocs = associations.filter(a => a.youtube_video_id === video.id);
        const machinesForVideo = videoAssocs.map(assoc => {
          const machine = machineDetails?.find(m => m.id === assoc.machine_id);
          return {
            machine_id: assoc.machine_id,
            machines: {
              id: assoc.machine_id,
              "Machine Name": machine?.["Machine Name"] || 'Unknown',
              Company: machine?.Company || 'Unknown'
            }
          };
        });
        
        return {
          ...video,
          machine_videos: machinesForVideo
        };
      });
    } else {
      // No associations, add empty array
      videosWithMachines = videos.map(v => ({
        ...v,
        machine_videos: []
      }));
    }
  }

  // Fetch all machines for linking
  const { data: machines } = await supabase
    .from('machines')
    .select('id, "Machine Name", Company')
    .order('"Machine Name"');

  // Get video statistics
  const totalVideos = videosWithMachines.length;
  const linkedVideos = videosWithMachines.filter(v => v.machine_videos && v.machine_videos.length > 0).length;
  const unlinkedVideos = totalVideos - linkedVideos;
  
  console.log('YouTube Page Debug:', {
    videosCount: videosWithMachines.length,
    hasError: !!error,
    firstVideo: videosWithMachines[0]?.title
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6">
        <h1 className="text-2xl font-bold">YouTube Video Management</h1>
        <p className="text-muted-foreground">Manage your YouTube video library and machine associations</p>
      </div>
      
      <div className="px-6 pb-6 flex-1">
        <Tabs defaultValue="library" className="space-y-4">
          <TabsList>
            <TabsTrigger value="library">Video Library</TabsTrigger>
            <TabsTrigger value="sync">Sync Videos</TabsTrigger>
            <TabsTrigger value="linking">Machine Linking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="library" className="space-y-4">
            <VideoLibrary 
              videos={videosWithMachines} 
              stats={{
                totalVideos,
                linkedVideos,
                unlinkedVideos
              }}
            />
          </TabsContent>
          
          <TabsContent value="sync" className="space-y-4">
            <VideoSync />
          </TabsContent>
          
          <TabsContent value="linking" className="space-y-4">
            <MachineLinking 
              videos={videosWithMachines} 
              machines={machines || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}