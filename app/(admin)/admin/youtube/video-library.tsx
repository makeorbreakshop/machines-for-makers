'use client';

import { useState, useEffect } from 'react';
import { Video, ExternalLink, Calendar, Clock, Plus, X, Search, Eye, ThumbsUp, MessageCircle, TrendingUp, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Convert ISO 8601 duration to readable format
function formatDuration(isoDuration: string | null): string {
  if (!isoDuration) return 'N/A';
  
  // Parse ISO 8601 duration (e.g., PT17M46S, PT1H2M3S, PT30S)
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  
  return parts.length > 0 ? parts.join(' ') : '0s';
}

// Format view count with K/M suffix
function formatViewCount(count: number | null | undefined): string {
  if (!count && count !== 0) return '—';
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

interface VideoLibraryProps {
  videos: any[];
  stats: {
    totalVideos: number;
    linkedVideos: number;
    unlinkedVideos: number;
  };
}

export function VideoLibrary({ videos, stats }: VideoLibraryProps) {
  const { toast } = useToast();
  const [allMachines, setAllMachines] = useState<any[]>([]);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [selectedMachines, setSelectedMachines] = useState<{ [key: string]: string[] }>({});
  const [savingVideo, setSavingVideo] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});

  // Fetch all machines on component mount
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await fetch('/api/admin/machines/list');
        const data = await response.json();
        if (data.machines) {
          setAllMachines(data.machines);
        }
      } catch (error) {
        console.error('Failed to fetch machines:', error);
      }
    };
    fetchMachines();
  }, []);

  // Initialize selected machines from existing data
  useEffect(() => {
    const initialSelections: { [key: string]: string[] } = {};
    videos.forEach(video => {
      if (video.machine_videos && video.machine_videos.length > 0) {
        initialSelections[video.id] = video.machine_videos.map((mv: any) => mv.machine_id || mv.machines?.id);
      }
    });
    setSelectedMachines(initialSelections);
  }, [videos]);

  const handleSaveMachines = async (videoId: string) => {
    setSavingVideo(videoId);
    try {
      const machineIds = selectedMachines[videoId] || [];
      
      const response = await fetch('/api/admin/youtube/link-machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          machineIds,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Machines Updated',
          description: `Successfully updated machine associations`,
        });
        setOpenPopoverId(null);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to update machines');
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update machines',
        variant: 'destructive',
      });
    } finally {
      setSavingVideo(null);
    }
  };

  const addMachine = (videoId: string, machineId: string) => {
    setSelectedMachines(prev => {
      const current = prev[videoId] || [];
      if (!current.includes(machineId)) {
        return {
          ...prev,
          [videoId]: [...current, machineId]
        };
      }
      return prev;
    });
    // Clear search after adding
    setSearchTerms(prev => ({ ...prev, [videoId]: '' }));
  };

  const removeMachine = (videoId: string, machineId: string) => {
    setSelectedMachines(prev => ({
      ...prev,
      [videoId]: (prev[videoId] || []).filter(id => id !== machineId)
    }));
  };

  const getFilteredMachines = (videoId: string) => {
    const searchTerm = searchTerms[videoId] || '';
    const selected = selectedMachines[videoId] || [];
    
    if (!searchTerm) return [];
    
    return allMachines
      .filter(machine => 
        !selected.includes(machine.id) && (
          machine["Machine Name"].toLowerCase().includes(searchTerm.toLowerCase()) ||
          (machine.Company && machine.Company.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      )
      .slice(0, 5); // Show max 5 results
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVideos}</div>
            <p className="text-xs text-muted-foreground">
              In your library
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Linked to Machines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.linkedVideos}</div>
            <p className="text-xs text-muted-foreground">
              Associated with products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unlinked Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unlinkedVideos}</div>
            <p className="text-xs text-muted-foreground">
              Need machine associations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Videos Table */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>All Videos</CardTitle>
          <CardDescription>
            Videos imported from your YouTube channel
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {videos.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="w-full max-w-[1600px] mx-auto">
                <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="w-[120px]">Thumbnail</TableHead>
                  <TableHead className="min-w-[280px] max-w-[400px]">Title</TableHead>
                  <TableHead className="w-[200px]">Machines</TableHead>
                  <TableHead className="w-[110px]">Published</TableHead>
                  <TableHead className="w-[80px] text-right">Views</TableHead>
                  <TableHead className="w-[80px] text-right">Likes</TableHead>
                  <TableHead className="w-[80px] text-right">Comments</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="py-2 px-3">
                      {video.thumbnail_url && (
                        <div className="relative overflow-hidden rounded">
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            className="w-24 h-14 object-cover"
                          />
                          {video.duration && (
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                              {formatDuration(video.duration)}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="font-medium text-sm line-clamp-2" title={video.title}>
                        {video.title}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Popover 
                        open={openPopoverId === video.id} 
                        onOpenChange={(open) => {
                          if (open) {
                            setOpenPopoverId(video.id);
                            // Initialize selection for this video if not already done
                            if (!selectedMachines[video.id]) {
                              const currentMachineIds = video.machine_videos?.map((mv: any) => 
                                mv.machine_id || mv.machines?.id
                              ) || [];
                              setSelectedMachines(prev => ({
                                ...prev,
                                [video.id]: currentMachineIds
                              }));
                            }
                            // Clear search when opening
                            setSearchTerms(prev => ({ ...prev, [video.id]: '' }));
                          } else {
                            setOpenPopoverId(null);
                            // Clear search when closing
                            setSearchTerms(prev => ({ ...prev, [video.id]: '' }));
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-auto p-1 w-full justify-start text-xs">
                            {video.machine_videos && video.machine_videos.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {video.machine_videos.slice(0, 1).map((mv: any) => (
                                  <Badge key={mv.machine_id || mv.machines?.id} variant="secondary" className="text-xs">
                                    {mv.machines?.["Machine Name"] || 'Unknown'}
                                  </Badge>
                                ))}
                                {video.machine_videos.length > 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{video.machine_videos.length - 1}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">+ Add</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-4" align="start">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2">Select Machines</h4>
                              
                              {/* Selected Machines */}
                              {selectedMachines[video.id] && selectedMachines[video.id].length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {selectedMachines[video.id].map(machineId => {
                                    const machine = allMachines.find(m => m.id === machineId);
                                    if (!machine) return null;
                                    return (
                                      <Badge 
                                        key={machineId} 
                                        variant="secondary" 
                                        className="text-xs pr-1"
                                      >
                                        {machine["Machine Name"]}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                          onClick={() => removeMachine(video.id, machineId)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Search Input */}
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search for machines..."
                                  value={searchTerms[video.id] || ''}
                                  onChange={(e) => setSearchTerms(prev => ({
                                    ...prev,
                                    [video.id]: e.target.value
                                  }))}
                                  className="pl-9"
                                  autoFocus
                                />
                              </div>
                              
                              {/* Search Results */}
                              {searchTerms[video.id] && getFilteredMachines(video.id).length > 0 && (
                                <div className="border rounded-md divide-y">
                                  {getFilteredMachines(video.id).map(machine => (
                                    <button
                                      key={machine.id}
                                      className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between group"
                                      onClick={() => addMachine(video.id, machine.id)}
                                    >
                                      <div>
                                        <div className="text-sm font-medium">{machine["Machine Name"]}</div>
                                        {machine.Company && (
                                          <div className="text-xs text-muted-foreground">{machine.Company}</div>
                                        )}
                                      </div>
                                      <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              {/* No results message */}
                              {searchTerms[video.id] && getFilteredMachines(video.id).length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  No machines found matching "{searchTerms[video.id]}"
                                </p>
                              )}
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setOpenPopoverId(null);
                                  setSearchTerms(prev => ({ ...prev, [video.id]: '' }));
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleSaveMachines(video.id)}
                                disabled={savingVideo === video.id}
                              >
                                {savingVideo === video.id ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-sm text-muted-foreground whitespace-nowrap">
                      {video.published_at 
                        ? new Date(video.published_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : '—'
                      }
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right text-sm font-medium">
                      {formatViewCount(video.view_count)}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right text-sm text-muted-foreground">
                      {video.like_count ? formatViewCount(video.like_count) : '—'}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right text-sm text-muted-foreground">
                      {video.comment_count ? formatViewCount(video.comment_count) : '—'}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge 
                        variant={video.status === 'synced' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {video.status || 'new'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <Link 
                        href={`https://youtube.com/watch?v=${video.youtube_id}`}
                        target="_blank"
                      >
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
              <p className="text-sm text-muted-foreground">
                Use the Sync tab to import videos from your YouTube channel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}