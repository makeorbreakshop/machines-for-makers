'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ChevronDown, Loader2, Youtube, Link } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
  description?: string;
}

interface YouTubeVideoSelectorEnhancedProps {
  value: string;
  onValueChange: (value: string) => void;
  onVideoSelect?: (video: YouTubeVideo) => void;
  label?: string;
}

export function YouTubeVideoSelectorEnhanced({ 
  value, 
  onValueChange, 
  onVideoSelect,
  label = 'YouTube Video'
}: YouTubeVideoSelectorEnhancedProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'browse' | 'url'>('browse');
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Manual URL input states
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*&v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Fetch videos from API
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

  // Try to fetch metadata when URL is entered
  useEffect(() => {
    if (mode !== 'url') return;
    
    const videoId = extractVideoId(manualUrl);
    if (!videoId) {
      setManualTitle('');
      return;
    }

    // Try to fetch metadata using oEmbed
    const fetchMetadata = async () => {
      setFetchingMetadata(true);
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setManualTitle(data.title || '');
        } else {
          // Video is private/unlisted - user needs to enter title manually
          setManualTitle('');
        }
      } catch (error) {
        console.error('Error fetching video metadata:', error);
        setManualTitle('');
      } finally {
        setFetchingMetadata(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (videoId) {
        fetchMetadata();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [manualUrl, mode]);

  // Initial load
  useEffect(() => {
    if (open && mode === 'browse' && videos.length === 0) {
      fetchVideos();
    }
  }, [open, mode]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore || mode !== 'browse') return;

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
  }, [nextPageToken, hasMore, loadingMore, mode]);

  // Handle search
  const handleSearch = useCallback(() => {
    setVideos([]);
    setNextPageToken(null);
    fetchVideos();
  }, [search]);

  // Handle video selection from browse mode
  const handleSelect = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    onValueChange(video.id);
    if (onVideoSelect) onVideoSelect(video);
    setOpen(false);
  };

  // Handle manual URL submission
  const handleManualSubmit = () => {
    const videoId = extractVideoId(manualUrl);
    if (!videoId) {
      return;
    }

    if (!manualTitle.trim()) {
      return;
    }

    const video: YouTubeVideo = {
      id: videoId,
      title: manualTitle,
      publishedAt: new Date().toISOString(),
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    };

    setSelectedVideo(video);
    onValueChange(video.id);
    if (onVideoSelect) onVideoSelect(video);
    setOpen(false);
    
    // Reset manual fields
    setManualUrl('');
    setManualTitle('');
  };

  const isValidYouTubeUrl = extractVideoId(manualUrl) !== null;
  const canSubmitManual = isValidYouTubeUrl && manualTitle.trim() !== '';

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
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
                {selectedVideo.thumbnail && (
                  <Image
                    src={selectedVideo.thumbnail}
                    alt={selectedVideo.title}
                    width={80}
                    height={45}
                    className="rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-1">{selectedVideo.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Video ID: {selectedVideo.id}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Choose a video or enter URL</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] p-0" align="start">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'browse' | 'url')} className="w-full">
            <div className="border-b">
              <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
                <TabsTrigger 
                  value="browse" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Browse Videos
                </TabsTrigger>
                <TabsTrigger 
                  value="url"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Enter URL
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="browse" className="m-0">
              <div className="p-4 border-b">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search your videos..."
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
                      <p className="text-sm mt-2">Try searching or use the "Enter URL" tab for unpublished videos</p>
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
                            src={video.thumbnail || ''}
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
            </TabsContent>

            <TabsContent value="url" className="m-0">
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-600" />
                    YouTube URL
                  </Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="font-mono"
                  />
                  {manualUrl && !isValidYouTubeUrl && (
                    <p className="text-sm text-red-600">Please enter a valid YouTube URL</p>
                  )}
                  {isValidYouTubeUrl && (
                    <p className="text-sm text-green-600">✓ Valid YouTube URL detected</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Video Title
                    {fetchingMetadata && (
                      <span className="text-xs text-muted-foreground">(Fetching...)</span>
                    )}
                  </Label>
                  <Input
                    placeholder="Enter video title (required for private/unlisted videos)"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                  />
                  {!manualTitle && isValidYouTubeUrl && !fetchingMetadata && (
                    <p className="text-sm text-amber-600">
                      Could not fetch title automatically. Please enter it manually.
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 Use this tab for unpublished, private, or unlisted videos. 
                    The title will be fetched automatically for public videos.
                  </p>
                </div>

                <Button 
                  onClick={handleManualSubmit}
                  disabled={!canSubmitManual}
                  className="w-full"
                >
                  Use This Video
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}