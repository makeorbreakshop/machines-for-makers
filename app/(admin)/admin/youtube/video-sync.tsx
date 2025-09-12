'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Youtube, RefreshCw, Info, CheckCircle, AlertCircle, Clock, Eye, ThumbsUp, MessageSquare, Video, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export function VideoSync() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStats, setSyncStats] = useState<{
    totalVideos: number;
    newVideos: number;
    updatedVideos: number;
    totalViews: number;
    totalLikes: number;
  } | null>(null);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);

  // Load recent videos on mount
  useEffect(() => {
    fetchRecentVideos();
  }, []);

  const fetchRecentVideos = async () => {
    try {
      const response = await fetch('/api/admin/youtube/videos?limit=5');
      if (response.ok) {
        const data = await response.json();
        setRecentVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent videos:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(20);
    try {
      const response = await fetch('/api/admin/youtube/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channelId || undefined,
        }),
      });

      setSyncProgress(60);
      const data = await response.json();
      
      if (response.ok) {
        setSyncProgress(100);
        setSyncStats({
          totalVideos: data.totalVideos || 0,
          newVideos: data.newVideos || 0,
          updatedVideos: data.updatedVideos || 0,
          totalViews: data.totalViews || 0,
          totalLikes: data.totalLikes || 0,
        });
        toast({
          title: 'Sync Successful',
          description: `Synced ${data.newVideos} new videos, ${data.updatedVideos} updated`,
        });
        setLastSync(new Date());
        fetchRecentVideos(); // Refresh the recent videos list
      } else {
        throw new Error(data.error || 'Failed to sync videos');
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync videos',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncProgress(0), 1000);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Sync Controls */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              Sync YouTube Channel
            </CardTitle>
            <CardDescription>
              Import and update all videos from your channel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                Syncs metadata, view counts, likes, and comments for all videos
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="channel-id">Channel ID (Optional)</Label>
              <Input
                id="channel-id"
                placeholder="Use default channel"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                disabled={isSyncing}
                className="h-9"
              />
            </div>

            {syncProgress > 0 && (
              <div className="space-y-2">
                <Progress value={syncProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {syncProgress < 100 ? 'Syncing...' : 'Complete!'}
                </p>
              </div>
            )}

            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="w-full"
              size="lg"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Videos...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync All Videos
                </>
              )}
            </Button>

            {lastSync && (
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">Last synced</p>
                <p className="text-sm font-medium">{lastSync.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Stats */}
        {syncStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Last Sync Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New Videos</span>
                <Badge variant="default">{syncStats.newVideos}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Updated</span>
                <Badge variant="secondary">{syncStats.updatedVideos}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Videos</span>
                <span className="font-medium">{syncStats.totalVideos}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Recent Videos Preview */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Videos</CardTitle>
              <Badge variant="outline" className="gap-1">
                <Video className="h-3 w-3" />
                {recentVideos.length} shown
              </Badge>
            </div>
            <CardDescription>
              Your most recent YouTube videos with current stats
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentVideos.length > 0 ? (
              <div className="space-y-4">
                {recentVideos.map((video) => (
                  <div key={video.id} className="flex gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    {/* Larger Thumbnail */}
                    <div className="relative flex-shrink-0">
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title}
                        className="w-40 h-24 object-cover rounded"
                      />
                      {video.duration && (
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                          {video.duration}
                        </div>
                      )}
                    </div>
                    
                    {/* Video Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Published {new Date(video.published_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{formatNumber(video.view_count || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                          <span>{formatNumber(video.like_count || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span>{formatNumber(video.comment_count || 0)}</span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {video.status === 'synced' ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Synced
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Pending
                          </Badge>
                        )}
                        {video.machine_videos?.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {video.machine_videos.length} machines
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No videos synced yet</p>
                <p className="text-xs mt-1">Click "Sync All Videos" to import your content</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How Sync Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Fetches Metadata</p>
                    <p className="text-xs text-muted-foreground">Title, description, thumbnail, duration</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Updates Statistics</p>
                    <p className="text-xs text-muted-foreground">Views, likes, comments in real-time</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Prevents Duplicates</p>
                    <p className="text-xs text-muted-foreground">Matches by YouTube video ID</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Preserves Data</p>
                    <p className="text-xs text-muted-foreground">Keeps machine associations intact</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}