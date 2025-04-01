import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import VideoDetails from './video-details';
import TranscriptPanel from './transcript-panel';
import TranscriptionStatus from './transcription-status';
import ReviewGeneration from './review-generation';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function YouTubeVideoPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  // Fetch video data
  const { data: video, error } = await supabase
    .from('youtube_videos')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !video) {
    return <div className="p-4">Error loading video: {error?.message || 'Video not found'}</div>;
  }

  // Check if transcript exists
  const { data: transcript } = await supabase
    .from('transcripts')
    .select('id')
    .eq('youtube_video_id', params.id)
    .single();

  const hasTranscript = !!transcript;

  // Fetch associated machines for the video
  const { data: associatedMachines } = await supabase
    .from('machine_videos')
    .select('machines!inner(*)')
    .eq('youtube_video_id', params.id);

  // Fetch all machines for dropdowns
  const { data: allMachines } = await supabase
    .from('machines')
    .select('id, "Machine Name"')
    .order('"Machine Name"', { ascending: true });

  const machineOptions = allMachines ? allMachines.map(machine => ({
    id: machine.id,
    name: machine["Machine Name"]
  })) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        <VideoDetails video={video} />
      </Suspense>

      <Tabs defaultValue="transcript" className="mt-6">
        <TabsList>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="ai-review">AI Review</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="p-4 border rounded-md mt-2">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <div className="mb-4">
              <TranscriptionStatus
                videoId={params.id}
                isTranscribing={false}
              />
            </div>
            <TranscriptPanel
              videoId={params.id}
              hasTranscript={hasTranscript}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="ai-review" className="p-4 border rounded-md mt-2">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ReviewGeneration
              videoId={params.id}
              hasTranscript={hasTranscript}
              machines={machineOptions}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="machines" className="p-4 border rounded-md mt-2">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <div>
              <h2 className="text-xl font-bold mb-4">Associated Machines</h2>
              
              {associatedMachines && associatedMachines.length > 0 ? (
                <ul className="space-y-2">
                  {associatedMachines.map((item) => (
                    <li key={item.machines.id} className="p-3 bg-slate-50 rounded-md">
                      {item.machines["Machine Name"]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">No machines associated with this video yet.</p>
              )}
            </div>
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
} 