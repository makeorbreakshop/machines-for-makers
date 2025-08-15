'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  description?: string;
}

interface YouTubeVideoSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  onVideoSelect?: (video: YouTubeVideo) => void;
}

export function YouTubeVideoSelector({ value, onValueChange, onVideoSelect }: YouTubeVideoSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch videos
  const fetchVideos = async (pageToken: string | null = null, append = false) => {
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        search: search,
        ...(pageToken && { pageToken })
      });
      
      const response = await fetch(`/api/admin/analytics/youtube-videos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      
      const data = await response.json();
      
      if (append) {
        setVideos(prev => [...prev, ...(data.videos || [])]);
      } else {
        setVideos(data.videos || []);
      }
      
      setNextPageToken(data.nextPageToken || null);
      setHasMore(!!data.nextPageToken);
      
      // If value is set and this is the first load, find the selected video
      if (value && !append && data.videos) {
        const video = data.videos.find((v: YouTubeVideo) => v.id === value);
        if (video) setSelectedVideo(video);
      }
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (open && videos.length === 0) {
      fetchVideos();
    }
  }, [open]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPageToken) {
          fetchVideos(nextPageToken, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [nextPageToken, hasMore, loadingMore]);

  // Handle search
  const handleSearch = useCallback(() => {
    setVideos([]);
    setNextPageToken(null);
    fetchVideos();
  }, [search]);

  // Handle video selection
  const handleSelect = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    onValueChange(video.id);
    if (onVideoSelect) onVideoSelect(video);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>Select Video</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[2.5rem] py-2"
          >
            {selectedVideo ? (
              <div className="flex items-center gap-3 text-left">
                <Image
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  width={80}
                  height={45}
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-1">{selectedVideo.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedVideo.publishedAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Choose a video</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] p-0" align="start">
          <div className="p-4 border-b">
            <div className="flex gap-2">
              <Input
                placeholder="Search videos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleSearch}
                disabled={loading}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[400px]" ref={scrollAreaRef}>
            <div className="p-2">
              {loading && videos.length === 0 ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 p-2">
                      <Skeleton className="w-[120px] h-[67px] rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No videos found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {videos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => handleSelect(video)}
                      className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        width={120}
                        height={67}
                        className="rounded shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-2 text-sm">{video.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(video.publishedAt), 'MMM d, yyyy')}
                        </p>
                        {video.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {video.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                  
                  {/* Load more trigger */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="py-4 text-center">
                      {loadingMore && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading more videos...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}