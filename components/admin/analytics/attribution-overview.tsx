'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2, AlertCircle, Mail, Users, MousePointer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { TimeSeriesChart } from './time-series-chart';

interface AttributionData {
  overview: {
    totalVisitors: number;
    totalClicks: number;
    totalLeads: number;
    visitorToClickRate: number;
    clickToLeadRate: number;
    overallConversionRate: number;
  };
  sources: Array<{
    source: string;
    medium?: string;
    campaign?: string;
    displayTitle?: string;
    campaignType?: string;
    visitors: number;
    clicks: number;
    leads: number;
    clickRate: number;
    conversionRate: number;
    lastSeen: string;
  }>;
  topPaths: Array<{
    path: string;
    count: number;
    conversions: number;
  }>;
  recentJourneys: Array<{
    id: string;
    source: string;
    campaign?: string;
    steps: Array<{
      type: 'visit' | 'click' | 'lead';
      timestamp: string;
      details: string;
    }>;
  }>;
}

interface AttributionOverviewProps {
  dateRange: string;
}

export function AttributionOverview({ dateRange }: AttributionOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttributionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttributionData();
  }, [dateRange]);

  const fetchAttributionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        dateRange
      });
      
      const response = await fetch(`/api/admin/analytics/attribution?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attribution data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Failed to load attribution data'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">

      {/* Source Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Source Performance</CardTitle>
          <CardDescription>
            Detailed breakdown by traffic source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-right py-3 px-4">Clicks</th>
                  <th className="text-right py-3 px-4">Leads</th>
                  <th className="text-right py-3 px-4">Conversion Rate</th>
                  <th className="text-right py-3 px-4">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((source, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">
                          {source.displayTitle || source.source}
                        </div>
                        {source.campaign && source.displayTitle !== source.campaign && (
                          <div className="text-xs text-muted-foreground">{source.campaign}</div>
                        )}
                        {source.campaignType && (
                          <div className="text-xs text-blue-600">
                            {source.campaignType === 'youtube' && '📹 '}
                            {source.campaignType === 'email' && '📧 '}
                            {source.campaignType === 'social' && '📱 '}
                            {source.campaignType}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">{formatNumber(source.clicks)}</td>
                    <td className="text-right py-3 px-4">{formatNumber(source.leads)}</td>
                    <td className="text-right py-3 px-4">
                      <Badge variant={source.conversionRate > 0.05 ? "default" : "secondary"}>
                        {formatPercentage(source.conversionRate)}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(source.lastSeen), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Time Series Chart - Full Width */}
      <TimeSeriesChart dateRange={dateRange} />
    </div>
  );
}