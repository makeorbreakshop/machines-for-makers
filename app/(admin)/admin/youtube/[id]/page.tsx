'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function YouTubeVideoPage({ params }: { params: { id: string } }) {
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
    queryKey: ['youtube-video', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/youtube/videos/${params.id}`);
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
      const response = await fetch(`/api/admin/youtube/videos/${params.id}/associate`, {
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
                  <Button variant="outline" disabled={video?.status !== 'new'}>
                    {video?.status === 'transcribed' ? 'Refresh Transcript' : 'Generate Transcript'}
                  </Button>
                </CardHeader>
                <CardContent>
                  {transcript ? (
                    <div className="whitespace-pre-line bg-slate-50 p-4 rounded-md max-h-[500px] overflow-y-auto">
                      {transcript}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-muted-foreground">No transcript available</p>
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
                <Button className="w-full" disabled={!transcript}>
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