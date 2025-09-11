'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2, AlertCircle, Mail, Users, MousePointer, ChevronUp, ChevronDown } from 'lucide-react';
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

type SortColumn = 'source' | 'campaignSource' | 'clicks' | 'leads' | 'conversionRate' | 'lastSeen';
type SortDirection = 'desc' | 'asc';

export function AttributionOverview({ dateRange }: AttributionOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttributionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('lastSeen');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchAttributionData = useCallback(async () => {
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
  }, [dateRange]);

  useEffect(() => {
    fetchAttributionData();
  }, [fetchAttributionData]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction: desc -> asc -> desc
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // New column, start with descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedSources = data?.sources ? [...data.sources].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortColumn) {
      case 'source':
        aValue = (a.displayTitle || a.source).toLowerCase();
        bValue = (b.displayTitle || b.source).toLowerCase();
        break;
      case 'campaignSource':
        aValue = (a.source || '').toLowerCase();
        bValue = (b.source || '').toLowerCase();
        break;
      case 'clicks':
        aValue = a.clicks;
        bValue = b.clicks;
        break;
      case 'leads':
        aValue = a.leads;
        bValue = b.leads;
        break;
      case 'conversionRate':
        aValue = a.conversionRate;
        bValue = b.conversionRate;
        break;
      case 'lastSeen':
        aValue = new Date(a.lastSeen).getTime();
        bValue = new Date(b.lastSeen).getTime();
        break;
      default:
        return 0;
    }

    if (sortDirection === 'desc') {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  }) : [];

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'desc' ? 
      <ChevronDown className="h-4 w-4 inline ml-1" /> : 
      <ChevronUp className="h-4 w-4 inline ml-1" />;
  };

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
                  <th className="text-left py-3 px-4">
                    <button 
                      onClick={() => handleSort('source')}
                      className="hover:text-primary transition-colors cursor-pointer flex items-center"
                    >
                      Source{getSortIcon('source')}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <button 
                      onClick={() => handleSort('campaignSource')}
                      className="hover:text-primary transition-colors cursor-pointer flex items-center"
                    >
                      Campaign Source{getSortIcon('campaignSource')}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button 
                      onClick={() => handleSort('clicks')}
                      className="hover:text-primary transition-colors cursor-pointer flex items-center justify-end w-full"
                    >
                      Clicks{getSortIcon('clicks')}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button 
                      onClick={() => handleSort('leads')}
                      className="hover:text-primary transition-colors cursor-pointer flex items-center justify-end w-full"
                    >
                      Leads{getSortIcon('leads')}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button 
                      onClick={() => handleSort('conversionRate')}
                      className="hover:text-primary transition-colors cursor-pointer flex items-center justify-end w-full"
                    >
                      Conversion Rate{getSortIcon('conversionRate')}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button 
                      onClick={() => handleSort('lastSeen')}
                      className="hover:text-primary transition-colors cursor-pointer flex items-center justify-end w-full"
                    >
                      Last Seen{getSortIcon('lastSeen')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSources.map((source, index) => {
                  // Clean up the title by removing YouTube IDs and long email IDs
                  let cleanTitle = source.displayTitle || source.source;
                  
                  // Remove YouTube video IDs (yt-XXXXXXXX pattern)
                  if (cleanTitle.startsWith('yt-')) {
                    cleanTitle = cleanTitle.replace(/^yt-[A-Za-z0-9_-]+\s*/, '');
                  }
                  
                  // Remove long email campaign IDs (numbers at the end)
                  cleanTitle = cleanTitle.replace(/\s*-\s*\d{8,}$/, '');
                  
                  // If title is still empty or just the campaign key, use a fallback
                  if (!cleanTitle || cleanTitle === source.campaign) {
                    cleanTitle = source.campaign || source.source;
                  }
                  
                  // Get campaign source with proper capitalization and icons
                  const getCampaignSourceDisplay = (src: string, campaignType?: string) => {
                    const sourceMap: Record<string, { label: string; icon: string }> = {
                      'youtube': { label: 'YouTube', icon: '📹' },
                      'convertkit': { label: 'Email', icon: '📧' },
                      'email': { label: 'Email', icon: '📧' },
                      'social': { label: 'Social', icon: '📱' },
                      'facebook': { label: 'Facebook', icon: '📘' },
                      'instagram': { label: 'Instagram', icon: '📸' },
                      'twitter': { label: 'Twitter', icon: '🐦' },
                      'linkedin': { label: 'LinkedIn', icon: '💼' },
                      'tiktok': { label: 'TikTok', icon: '🎵' },
                    };
                    
                    const sourceInfo = sourceMap[src.toLowerCase()] || { 
                      label: src.charAt(0).toUpperCase() + src.slice(1), 
                      icon: '🔗' 
                    };
                    
                    return `${sourceInfo.icon} ${sourceInfo.label}`;
                  };
                  
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium truncate max-w-xs" title={cleanTitle}>
                          {cleanTitle}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {getCampaignSourceDisplay(source.source, source.campaignType)}
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
                  );
                })}
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