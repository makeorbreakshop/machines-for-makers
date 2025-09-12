'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DateRangeFilter } from './date-range-filter';
import { ShareReportDialog } from './share-report-dialog';
import { formatViewCount } from '@/lib/services/video-metrics';

interface PartnerReportViewProps {
  report: any;
  videoMetrics: any[];
  videoSummary: any;
  programName: string;
  programSlug?: string;
}

export function PartnerReportView({ 
  report, 
  videoMetrics, 
  videoSummary,
  programName,
  programSlug 
}: PartnerReportViewProps) {
  const searchParams = useSearchParams();
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  // Filter data based on date range
  const filteredData = useMemo(() => {
    if (!fromDate && !toDate) {
      // No filtering, return all data
      return {
        machineMetrics: report.machine_metrics || [],
        trafficSources: report.traffic_sources || [],
        unmatchedProducts: report.unmatched_products || [],
        totalRevenue: report.total_revenue || 0,
        totalCommission: report.total_commission || 0,
        totalOrders: report.total_orders || 0,
        totalClicks: report.total_clicks || 0,
      };
    }

    // For now, we're returning the same data since filtering would need
    // to be done at the service level with actual sales data
    // This is a placeholder for the filtered logic
    return {
      machineMetrics: report.machine_metrics || [],
      trafficSources: report.traffic_sources || [],
      unmatchedProducts: report.unmatched_products || [],
      totalRevenue: report.total_revenue || 0,
      totalCommission: report.total_commission || 0,
      totalOrders: report.total_orders || 0,
      totalClicks: report.total_clicks || 0,
    };
  }, [report, fromDate, toDate]);

  const getPeriodLabel = () => {
    if (!fromDate && !toDate) {
      return 'All Time';
    }
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      
      // Check if it's a quarter
      const startMonth = start.getMonth();
      const endMonth = end.getMonth();
      const year = start.getFullYear();
      
      if (startMonth % 3 === 0 && endMonth === startMonth + 2) {
        const quarter = Math.floor(startMonth / 3) + 1;
        return `Q${quarter} ${year}`;
      }
      
      // Check if it's a full year
      if (startMonth === 0 && endMonth === 11) {
        return year.toString();
      }
      
      return 'Custom Period';
    }
    return 'Custom Period';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {programName} Partner Dashboard
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Performance metrics and analytics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="default" className="text-lg px-4 py-2">
                {getPeriodLabel()}
              </Badge>
              {programSlug && (
                <ShareReportDialog 
                  programSlug={programSlug} 
                  programName={programName}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Filter */}
        <DateRangeFilter />

        {/* Overview Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${filteredData.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                From {filteredData.totalOrders} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${filteredData.totalCommission.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {report.affiliate_programs?.commission_rate ? 
                  `${(report.affiliate_programs.commission_rate * 100).toFixed(1)}%` : 'N/A'} rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredData.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Tracked sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredData.totalClicks}</div>
              <p className="text-xs text-muted-foreground">
                Total interactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Video Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        {filteredData.machineMetrics.length > 0 && (
          <Card className="mb-8">
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
                  {filteredData.machineMetrics.map((metric: any, idx: number) => (
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
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Video Performance</CardTitle>
              <CardDescription>
                YouTube content driving awareness and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead className="text-right">Videos</TableHead>
                    <TableHead className="text-right">Total Views</TableHead>
                    <TableHead className="text-right">Total Engagement</TableHead>
                    <TableHead className="text-right">Engagement Rate</TableHead>
                    <TableHead>Top Video</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videoMetrics.map((metric: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {metric.machine_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {metric.video_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatViewCount(metric.total_views)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(metric.total_likes + metric.total_comments).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {metric.avg_engagement_rate.toFixed(2)}%
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {metric.top_videos?.[0]?.title || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Traffic Sources */}
        {filteredData.trafficSources.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>
                Click distribution by source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Medium</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.trafficSources.map((source: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {source.source || 'Direct'}
                      </TableCell>
                      <TableCell>
                        {source.utm_medium || 'None'}
                      </TableCell>
                      <TableCell className="text-right">
                        {source.total_clicks}
                      </TableCell>
                      <TableCell className="text-right">
                        ${source.total_sales.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {source.conversion_rate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Unmatched Products Summary */}
        {filteredData.unmatchedProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Other Products</CardTitle>
              <CardDescription>
                Accessories and add-ons not directly matched to machines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {filteredData.unmatchedProducts.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Product Types</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ${filteredData.unmatchedProducts.reduce((sum: number, p: any) => 
                      sum + p.total_sales, 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ${filteredData.unmatchedProducts.reduce((sum: number, p: any) => 
                      sum + p.commission, 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Commission</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center text-sm text-gray-600">
          <p>Report data last updated: {new Date(report.updated_at || report.created_at).toLocaleDateString()}</p>
          <p className="mt-2">
            © {new Date().getFullYear()} Machines for Makers. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}