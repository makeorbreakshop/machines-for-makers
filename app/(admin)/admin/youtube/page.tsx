'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import Image from 'next/image';
import { YouTubeVideoDatabase } from '@/lib/types/youtube';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function YouTubePage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string | undefined>(undefined);

  // Fetch videos
  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['youtube-videos', page, pageSize, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (status) params.append('status', status);

      const response = await fetch(`/api/admin/youtube/videos?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      return response.json();
    },
  });

  // Sync videos mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/youtube/sync', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to sync videos');
      }
      return response.json();
    },
    onSuccess: (data: { syncedVideos: number }) => {
      toast.success(`Synced ${data.syncedVideos} videos successfully`);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Format duration from ISO 8601 format
  const formatDuration = (duration: string) => {
    // Handle PT#H#M#S format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const [_, hours, minutes, seconds] = match;
    let result = '';
    if (hours) result += `${hours}:`;
    result += `${minutes || '0'}:`;
    result += `${seconds?.padStart(2, '0') || '00'}`;

    return result;
  };

  // Get status badge color
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">YouTube Videos</h1>
        <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
          {syncMutation.isPending ? 'Syncing...' : 'Sync Videos'}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Videos from Make or Break Shop</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={status || 'all'}
              onValueChange={(value) => setStatus(value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="transcribed">Transcribed</SelectItem>
                <SelectItem value="review_generated">Review Generated</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xl text-muted-foreground">Loading...</p>
            </div>
          ) : data?.videos.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xl text-muted-foreground">No videos found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thumbnail</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.videos.map((video: YouTubeVideoDatabase) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div className="relative w-32 h-20 overflow-hidden rounded">
                          <Image
                            src={video.thumbnail_url}
                            alt={video.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {video.title}
                      </TableCell>
                      <TableCell>
                        {new Date(video.published_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{formatDuration(video.duration)}</TableCell>
                      <TableCell>{getStatusBadge(video.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/youtube/${video.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data?.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      {page > 1 && (
                        <PaginationItem>
                          <PaginationLink onClick={() => setPage(page - 1)}>
                            Previous
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      
                      {Array.from({ length: Math.min(5, data.pagination.totalPages) }).map((_, i) => {
                        const pageNumber = page > 3 ? page - 3 + i + 1 : i + 1;
                        if (pageNumber <= data.pagination.totalPages) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                isActive={page === pageNumber}
                                onClick={() => setPage(pageNumber)}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      {page < data.pagination.totalPages && (
                        <PaginationItem>
                          <PaginationLink onClick={() => setPage(page + 1)}>
                            Next
                          </PaginationLink>
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 