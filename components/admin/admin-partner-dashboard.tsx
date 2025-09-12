'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Share2, Copy, Check, ExternalLink, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatViewCount } from '@/lib/services/video-metrics';

interface AdminPartnerDashboardProps {
  program: any;
  report: any;
  videoMetrics: any[];
  videoSummary: any;
}

export function AdminPartnerDashboard({ 
  program, 
  report, 
  videoMetrics, 
  videoSummary 
}: AdminPartnerDashboardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  // Get current year and quarter
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Generate period options for sharing
  const periodOptions = [
    { value: 'current', label: 'Current View' },
    { value: 'all', label: 'All Time' },
    { value: 'ytd', label: `Year to Date (${currentYear})` },
    { value: `${currentYear}-q1`, label: `Q1 ${currentYear}` },
    { value: `${currentYear}-q2`, label: `Q2 ${currentYear}` },
    { value: `${currentYear}-q3`, label: `Q3 ${currentYear}` },
    { value: `${currentYear}-q4`, label: `Q4 ${currentYear}` },
    { value: `${currentYear - 1}-q1`, label: `Q1 ${currentYear - 1}` },
    { value: `${currentYear - 1}-q2`, label: `Q2 ${currentYear - 1}` },
    { value: `${currentYear - 1}-q3`, label: `Q3 ${currentYear - 1}` },
    { value: `${currentYear - 1}-q4`, label: `Q4 ${currentYear - 1}` },
    { value: 'last-30', label: 'Last 30 Days' },
    { value: 'last-90', label: 'Last 90 Days' },
  ];

  // Calculate date range based on period selection for sharing
  const getShareDateRange = (period: string): { from: string | null; to: string | null } => {
    if (period === 'current') {
      return { from: fromDate, to: toDate };
    }
    
    const today = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (period) {
      case 'all':
        return { from: null, to: null };
      
      case 'ytd':
        start = new Date(currentYear, 0, 1);
        end = today;
        break;
      
      case 'last-30':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = today;
        break;
      
      case 'last-90':
        start = new Date(today);
        start.setDate(today.getDate() - 90);
        end = today;
        break;
      
      default:
        // Handle quarter periods (e.g., "2025-q1")
        const [year, quarter] = period.split('-');
        if (year && quarter?.startsWith('q')) {
          const yearNum = parseInt(year);
          const quarterNum = parseInt(quarter.substring(1));
          const quarterStart = (quarterNum - 1) * 3;
          start = new Date(yearNum, quarterStart, 1);
          end = new Date(yearNum, quarterStart + 3, 0);
        }
        break;
    }

    return {
      from: start ? start.toISOString().split('T')[0] : null,
      to: end ? end.toISOString().split('T')[0] : null,
    };
  };

  // Build shareable URL based on selected period
  const getShareableUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const { from, to } = getShareDateRange(selectedPeriod);
    
    let url = `${baseUrl}/partners/${program.brands.Slug}`;
    if (from && to) {
      url += `?from=${from}&to=${to}`;
    }
    
    return url;
  };

  const copyToClipboard = async () => {
    const url = getShareableUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied!',
        description: 'The shareable report link has been copied to your clipboard.',
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please select and copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const getPeriodLabel = () => {
    if (!fromDate && !toDate) {
      return 'All Time';
    }
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      
      const startMonth = start.getMonth();
      const endMonth = end.getMonth();
      const year = start.getFullYear();
      
      if (startMonth % 3 === 0 && endMonth === startMonth + 2) {
        const quarter = Math.floor(startMonth / 3) + 1;
        return `Q${quarter} ${year}`;
      }
      
      if (startMonth === 0 && endMonth === 11) {
        return year.toString();
      }
      
      return 'Custom Period';
    }
    return 'Custom Period';
  };

  // Handle date filter changes
  const handleDateFilterChange = (period: string) => {
    const { from, to } = getShareDateRange(period);
    const params = new URLSearchParams(searchParams);
    
    if (from && to) {
      params.set('from', from);
      params.set('to', to);
    } else {
      params.delete('from');
      params.delete('to');
    }
    
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="default" className="text-lg px-4 py-2">
            {getPeriodLabel()}
          </Badge>
          <Select 
            value={fromDate && toDate ? 'custom' : 'all'} 
            onValueChange={handleDateFilterChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value={`${currentYear}-q1`}>Q1 {currentYear}</SelectItem>
              <SelectItem value={`${currentYear}-q2`}>Q2 {currentYear}</SelectItem>
              <SelectItem value={`${currentYear}-q3`}>Q3 {currentYear}</SelectItem>
              <SelectItem value={`${currentYear}-q4`}>Q4 {currentYear}</SelectItem>
              <SelectItem value="last-30">Last 30 Days</SelectItem>
              <SelectItem value="last-90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Generate Share Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Generate Shareable Report Link</DialogTitle>
                <DialogDescription>
                  Create a public link to share with your partner. Choose the date range they should see.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Period Selection */}
                <div className="space-y-2">
                  <Label>Report Period</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The partner will see data for this specific period
                  </p>
                </div>

                {/* Preview URL */}
                <div className="space-y-2">
                  <Label>Shareable Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={getShareableUrl()}
                      readOnly
                      className="font-mono text-sm"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Preview Button */}
                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(getShareableUrl(), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview in New Tab
                  </Button>
                  <Button onClick={() => {
                    copyToClipboard();
                    setShareDialogOpen(false);
                  }}>
                    Copy Link & Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(report.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {(report.total_orders || 0).toLocaleString()} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(report.total_commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {program.commission_rate ? `${(program.commission_rate * 100).toFixed(1)}%` : 'N/A'} rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(report.total_orders || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Tracked sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(report.total_clicks || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Link interactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Video Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatViewCount(videoSummary.total_views)}
            </div>
            <p className="text-xs text-muted-foreground">
              YouTube reach
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Machine Performance */}
      {report.machine_metrics && report.machine_metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Machine Performance</CardTitle>
            <CardDescription>
              Sales breakdown by machine model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Avg Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.machine_metrics.map((metric: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {metric.machine_name}
                    </TableCell>
                    <TableCell className="text-right">
                      ${metric.total_sales.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.total_orders}
                    </TableCell>
                    <TableCell className="text-right">
                      ${metric.commission_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${metric.average_order_value.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Video Performance */}
      {videoMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Video Performance</CardTitle>
            <CardDescription>
              YouTube content metrics for machines in this report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {videoMetrics.map((metric: any, idx: number) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-semibold text-lg">{metric.machine_name}</h4>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{metric.video_count} videos</span>
                      <span>{formatViewCount(metric.total_views)} views</span>
                      <span>{metric.avg_engagement_rate.toFixed(2)}% engagement</span>
                    </div>
                  </div>
                  
                  {metric.top_videos && metric.top_videos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {metric.top_videos.slice(0, 3).map((video: any, vidIdx: number) => (
                        <a
                          key={vidIdx}
                          href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block space-y-2 hover:opacity-80 transition-opacity"
                        >
                          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                No thumbnail
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                              {formatViewCount(video.view_count)} views
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                              {video.title}
                            </p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>{video.like_count.toLocaleString()} likes</span>
                              <span>{video.comment_count.toLocaleString()} comments</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}