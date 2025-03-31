'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Image from 'next/image';
import { ArrowLeft, Play, Trash } from 'lucide-react';

export default function YouTubeVideoPage() {
  // Use the useParams hook to get the id parameter
  const params = useParams<{ id: string }>();
  const videoId = params?.id;
  
  const router = useRouter();
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [machines, setMachines] = useState<any[]>([]);
  const [associatedMachines, setAssociatedMachines] = useState<any[]>([]);
  
  // Fetch video details
  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['youtube-video', videoId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/youtube/videos/${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video details');
      }
      return response.json();
    },
  });

  // Fetch all machines for dropdown
  const { data: machinesData } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const response = await fetch('/api/admin/machines?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch machines');
      }
      return response.json();
    },
  });

  // Associate machine mutation
  const associateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/youtube/videos/${videoId}/associate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ machineId: selectedMachineId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to associate machine');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Machine associated successfully');
      setAssociatedMachines(data.machines);
      setSelectedMachineId('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update the transcribe mutation to provide better feedback
  const transcribeMutation = useMutation({
    mutationFn: async () => {
      toast.info("Starting transcription process. This may take a few minutes...", {
        duration: 5000,
      });
      
      const response = await fetch(`/api/admin/youtube/videos/${videoId}/transcribe`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to transcribe video');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Video transcribed successfully!');
      refetch(); // Refresh the data to show the new transcript
    },
    onError: (error: Error) => {
      toast.error(`Transcription failed: ${error.message}`);
    },
  });

  // Update machines list when data changes
  useEffect(() => {
    if (machinesData?.machines) {
      setMachines(machinesData.machines);
    }
  }, [machinesData]);

  // Update associated machines when data changes
  useEffect(() => {
    if (data?.machines) {
      setAssociatedMachines(data.machines);
    }
  }, [data]);

  // Format duration from ISO 8601 format
  const formatDuration = (duration: string) => {
    // Handle PT#H#M#S format
    const match = duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const [_, hours, minutes, seconds] = match;
    let result = '';
    if (hours) result += `${hours}:`;
    result += `${minutes || '0'}:`;
    result += `${seconds?.padStart(2, '0') || '00'}`;

    return result;
  };

  // Format published date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline">New</Badge>;
      case 'transcribed':
        return <Badge variant="secondary">Transcribed</Badge>;
      case 'review_generated':
        return <Badge variant="default">Review Generated</Badge>;
      case 'published':
        return <Badge variant="success" className="bg-green-500 text-white">Published</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-xl text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const { video, transcript } = data || {};

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push('/admin/youtube')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Videos
        </Button>
        <h1 className="text-3xl font-bold">{video?.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Video Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-0 pb-[56.25%] overflow-hidden rounded-md mb-4">
                <iframe
                  src={`https://www.youtube.com/embed/${video?.youtube_id}`}
                  className="absolute top-0 left-0 w-full h-full"
                  allowFullScreen
                  title={video?.title}
                ></iframe>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Published</h3>
                  <p>{formatDate(video?.published_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                  <p>{formatDuration(video?.duration)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div className="mt-1">{getStatusBadge(video?.status)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Video ID</h3>
                  <p className="font-mono text-sm">{video?.youtube_id}</p>
                </div>
              </div>

              {video?.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <div className="whitespace-pre-line text-sm bg-slate-50 p-4 rounded-md max-h-60 overflow-y-auto">
                    {video.description}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="machines" className="mt-6">
            <TabsList>
              <TabsTrigger value="machines">Associated Machines</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="chapters">Chapters</TabsTrigger>
            </TabsList>

            <TabsContent value="machines" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Associated Machines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-4 mb-6">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium mb-2">Associate with Machine</h3>
                      <Select
                        value={selectedMachineId}
                        onValueChange={setSelectedMachineId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a machine" />
                        </SelectTrigger>
                        <SelectContent>
                          {machines?.map((machine) => (
                            <SelectItem key={machine.id} value={machine.id}>
                              {machine['Machine Name']}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => associateMutation.mutate()} 
                      disabled={!selectedMachineId || associateMutation.isPending}
                    >
                      Associate
                    </Button>
                  </div>

                  {associatedMachines?.length > 0 ? (
                    <div className="space-y-2">
                      {associatedMachines.map((machine) => (
                        <div key={machine.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                          <span>{machine.name}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => router.push(`/admin/machines/${machine.id}`)}>
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20">
                      <p className="text-muted-foreground">No machines associated</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transcript" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Transcript</CardTitle>
                  {!transcript && (
                    <Button 
                      onClick={() => transcribeMutation.mutate()} 
                      disabled={transcribeMutation.isPending}
                      className="gap-2"
                    >
                      {transcribeMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Transcribing...
                        </>
                      ) : "Transcribe Video"}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {transcript ? (
                    <div className="whitespace-pre-line bg-slate-50 p-4 rounded-md max-h-96 overflow-y-auto">
                      {transcript}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      {transcribeMutation.isPending ? (
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
                          </div>
                          <p>Transcribing video... This may take a few minutes.</p>
                          <p className="text-sm">We're downloading the audio and sending it to OpenAI for processing.</p>
                        </div>
                      ) : (
                        <p>No transcript available. Click the Transcribe button to generate one.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chapters" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chapters</CardTitle>
                </CardHeader>
                <CardContent>
                  {video?.chapters?.length > 0 ? (
                    <div className="space-y-2">
                      {video.chapters.map((chapter: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                          <div>
                            <span className="font-medium">{chapter.title}</span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {Math.floor(chapter.start_time / 60)}:{(chapter.start_time % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-muted-foreground">No chapters available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button 
                  className="w-full" 
                  disabled={!transcript}
                  onClick={() => {
                    toast.info('Review generation will be implemented in the next phase', {
                      duration: 3000,
                    });
                  }}
                >
                  Generate Review
                </Button>
              </div>
              <div>
                <Button variant="outline" className="w-full" disabled={true}>
                  Capture Screenshots
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 