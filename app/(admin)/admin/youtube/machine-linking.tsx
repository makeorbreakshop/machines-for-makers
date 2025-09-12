'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link2, X, Search, Video, Filter, Eye, ThumbsUp, MessageSquare, Calendar, ExternalLink, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MachineLinkingProps {
  videos: any[];
  machines: any[];
}

export function MachineLinking({ videos, machines }: MachineLinkingProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [videoMachines, setVideoMachines] = useState<{[key: string]: string[]}>({});
  const [savingVideo, setSavingVideo] = useState<string | null>(null);
  const [machineSearch, setMachineSearch] = useState<{[key: string]: string}>({});

  // Initialize video machines from props
  useState(() => {
    const initial: {[key: string]: string[]} = {};
    videos.forEach(video => {
      initial[video.id] = video.machine_videos?.map((mv: any) => mv.machine_id || mv.machines?.id) || [];
    });
    setVideoMachines(initial);
  });

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
    const linkedCount = videoMachines[video.id]?.length || 0;
    const matchesFilter = 
      filterBy === 'all' ? true :
      filterBy === 'linked' ? linkedCount > 0 :
      filterBy === 'unlinked' ? linkedCount === 0 : true;
    return matchesSearch && matchesFilter;
  });

  const handleSaveMachines = async (videoId: string) => {
    setSavingVideo(videoId);
    try {
      const response = await fetch('/api/admin/youtube/link-machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          machineIds: videoMachines[videoId] || [],
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Machines Updated',
          description: `Successfully updated machine associations`,
        });
        setOpenPopoverId(null);
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

  const toggleMachine = (videoId: string, machineId: string) => {
    setVideoMachines(prev => {
      const current = prev[videoId] || [];
      const updated = current.includes(machineId)
        ? current.filter(id => id !== machineId)
        : [...current, machineId];
      return { ...prev, [videoId]: updated };
    });
  };

  const removeMachine = (videoId: string, machineId: string) => {
    setVideoMachines(prev => {
      const current = prev[videoId] || [];
      const updated = current.filter(id => id !== machineId);
      return { ...prev, [videoId]: updated };
    });
    // Auto-save when removing
    setTimeout(() => {
      handleSaveMachines(videoId);
    }, 100);
  };

  const getFilteredMachines = (videoId: string) => {
    const search = machineSearch[videoId]?.toLowerCase() || '';
    if (!search) return machines.slice(0, 10);
    
    return machines.filter(machine => 
      machine["Machine Name"].toLowerCase().includes(search) ||
      machine.Company?.toLowerCase().includes(search)
    ).slice(0, 20);
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (!num && num !== 0) return '0';
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    return `${(num / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Link Videos to Machines</CardTitle>
              <CardDescription>
                Associate your YouTube videos with specific machines for better organization
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredVideos.length} videos
              </Badge>
              <Badge variant="outline">
                {filteredVideos.filter(v => videoMachines[v.id]?.length > 0).length} linked
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search videos by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterBy} onValueChange={(v: any) => setFilterBy(v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter videos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Videos</SelectItem>
                <SelectItem value="linked">Linked Only</SelectItem>
                <SelectItem value="unlinked">Unlinked Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Videos Grid - 5 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filteredVideos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            {/* Larger Thumbnail */}
            <div className="relative aspect-video">
              {video.thumbnail_url && (
                <img 
                  src={video.thumbnail_url} 
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              )}
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                  {video.duration}
                </div>
              )}
              {/* External Link */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
                onClick={() => window.open(`https://youtube.com/watch?v=${video.youtube_id}`, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5 text-white" />
              </Button>
            </div>

            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm line-clamp-2" title={video.title}>
                {video.title}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {video.published_at 
                    ? new Date(video.published_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'No date'
                  }
                </span>
              </div>
              {/* Stats Row */}
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{formatNumber(video.view_count)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                  <span>{formatNumber(video.like_count)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span>{formatNumber(video.comment_count)}</span>
                </span>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Current Machine Links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Linked Machines:</p>
                  <Popover 
                    open={openPopoverId === video.id} 
                    onOpenChange={(open) => {
                      setOpenPopoverId(open ? video.id : null);
                      if (!open) {
                        setMachineSearch(prev => ({ ...prev, [video.id]: '' }));
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <div className="p-3 border-b">
                        <h4 className="font-medium text-sm">Add Machines</h4>
                      </div>
                      
                      <div className="p-3 space-y-3">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                          <Input
                            placeholder="Search machines..."
                            value={machineSearch[video.id] || ''}
                            onChange={(e) => setMachineSearch(prev => ({ 
                              ...prev, 
                              [video.id]: e.target.value 
                            }))}
                            className="h-8 pl-7 text-xs"
                            autoFocus
                          />
                        </div>
                        
                        {/* Machine List */}
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                          {getFilteredMachines(video.id).map((machine) => {
                            const isSelected = videoMachines[video.id]?.includes(machine.id);
                            return (
                              <button
                                key={machine.id}
                                className={cn(
                                  "w-full px-2 py-2 text-left hover:bg-muted/50 rounded text-xs flex items-center justify-between",
                                  isSelected && "bg-muted"
                                )}
                                onClick={() => {
                                  toggleMachine(video.id, machine.id);
                                  if (!isSelected) {
                                    // Auto-save when adding
                                    setTimeout(() => {
                                      handleSaveMachines(video.id);
                                      setOpenPopoverId(null);
                                    }, 100);
                                  }
                                }}
                                disabled={isSelected}
                              >
                                <div>
                                  <div className="font-medium">{machine["Machine Name"]}</div>
                                  {machine.Company && (
                                    <div className="text-[10px] text-muted-foreground">
                                      {machine.Company}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <Badge variant="secondary" className="text-[10px]">Added</Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {videoMachines[video.id]?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {machines
                      .filter(m => videoMachines[video.id]?.includes(m.id))
                      .map((machine) => (
                        <Badge 
                          key={machine.id} 
                          variant="secondary" 
                          className="text-xs gap-1 pr-1"
                        >
                          {machine["Machine Name"]}
                          <button
                            onClick={() => removeMachine(video.id, machine.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    }
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No machines linked</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No videos found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'No videos match your filter'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}