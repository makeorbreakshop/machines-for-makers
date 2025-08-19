'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TimeSeriesDataPoint {
  date: string;
  [source: string]: string | number;
}

interface TimeSeriesData {
  timeSeriesData: TimeSeriesDataPoint[];
  sources: string[];
  sourceMetadata: Record<string, { displayTitle: string; campaignType?: string }>;
}

interface SourceStats {
  source: string;
  displayName: string;
  totalClicks: number;
  totalLeads: number;
  conversionRate: number;
  selected: boolean;
  color: string;
  isTotal?: boolean;
}

interface TimeSeriesChartProps {
  dateRange: string;
}

// YouTube-style color palette
const CHART_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', 
  '#c2410c', '#0891b2', '#be185d'
];

export function TimeSeriesChart({ dateRange }: TimeSeriesChartProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TimeSeriesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metricType, setMetricType] = useState<'clicks' | 'leads' | 'conversion'>('clicks');
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);

  useEffect(() => {
    fetchTimeSeriesData();
  }, [dateRange]);

  useEffect(() => {
    if (data) {
      calculateSourceStats();
    }
  }, [data]);

  const fetchTimeSeriesData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both clicks and leads data
      const clicksParams = new URLSearchParams({
        dateRange,
        metricType: 'clicks'
      });
      
      const leadsParams = new URLSearchParams({
        dateRange,
        metricType: 'leads'
      });
      
      const [clicksResponse, leadsResponse] = await Promise.all([
        fetch(`/api/admin/analytics/attribution/time-series?${clicksParams}`),
        fetch(`/api/admin/analytics/attribution/time-series?${leadsParams}`)
      ]);
      
      if (!clicksResponse.ok || !leadsResponse.ok) {
        throw new Error('Failed to fetch time series data');
      }
      
      const [clicksData, leadsData] = await Promise.all([
        clicksResponse.json(),
        leadsResponse.json()
      ]);
      
      // Merge the data and calculate conversion rates
      const combinedData = {
        timeSeriesData: clicksData.timeSeriesData.map((clickPoint: any, index: number) => {
          const leadsPoint = leadsData.timeSeriesData[index] || {};
          const result: any = {
            date: clickPoint.date,
            ...clickPoint
          };
          
          // Add leads data
          Object.keys(leadsPoint).forEach(key => {
            if (key !== 'date') {
              result[`${key}_leads`] = leadsPoint[key] || 0;
            }
          });
          
          // Calculate conversion rates for each source for this specific day
          clicksData.sources.forEach((source: string) => {
            const dailyClicks = clickPoint[source] || 0;
            const dailyLeads = leadsPoint[source] || 0;
            
            // Calculate daily conversion rate
            result[`${source}_conversion`] = dailyClicks > 0 ? (dailyLeads / dailyClicks) * 100 : 0;
          });
          
          // Calculate totals for this day
          const totalClicks = clicksData.sources.reduce((sum: number, source: string) => sum + (clickPoint[source] || 0), 0);
          const totalLeads = clicksData.sources.reduce((sum: number, source: string) => sum + (leadsPoint[source] || 0), 0);
          
          result.total_clicks = totalClicks;
          result.total_leads = totalLeads;
          result.total_conversion = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
          
          return result;
        }),
        sources: clicksData.sources,
        sourceMetadata: clicksData.sourceMetadata
      };
      
      setData(combinedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateSourceStats = () => {
    if (!data) return;

    // Calculate individual source stats
    const individualStats: SourceStats[] = data.sources.map((source, index) => {
      const totalClicks = data.timeSeriesData.reduce((sum, point) => sum + (point[source] as number || 0), 0);
      const totalLeads = data.timeSeriesData.reduce((sum, point) => sum + (point[`${source}_leads`] as number || 0), 0);
      const conversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
      const metadata = data.sourceMetadata[source];
      
      return {
        source,
        displayName: metadata?.displayTitle || source,
        totalClicks,
        totalLeads,
        conversionRate,
        selected: false,
        color: CHART_COLORS[(index + 1) % CHART_COLORS.length],
        isTotal: false
      };
    });

    // Sort by total clicks
    individualStats.sort((a, b) => b.totalClicks - a.totalClicks);

    // Calculate totals
    const totalClicks = individualStats.reduce((sum, stat) => sum + stat.totalClicks, 0);
    const totalLeads = individualStats.reduce((sum, stat) => sum + stat.totalLeads, 0);
    const totalConversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;

    // Create total row
    const totalRow: SourceStats = {
      source: 'total',
      displayName: 'Total',
      totalClicks,
      totalLeads,
      conversionRate: totalConversionRate,
      selected: true, // Default to showing total
      color: CHART_COLORS[0],
      isTotal: true
    };

    // Combine with total row at top
    const allStats = [totalRow, ...individualStats];
    setSourceStats(allStats);
  };

  const toggleSourceSelection = (sourceKey: string) => {
    setSourceStats(prev => {
      const currentStat = prev.find(s => s.source === sourceKey);
      
      if (sourceKey === 'total') {
        if (currentStat?.selected) {
          // Deselecting total - select top 4 individual sources
          return prev.map((stat, index) => ({
            ...stat,
            selected: !stat.isTotal && index <= 4 && index > 0
          }));
        } else {
          // Selecting total - deselect all individual sources
          return prev.map(stat => ({
            ...stat,
            selected: stat.source === 'total'
          }));
        }
      } else {
        // Toggle individual source and deselect total
        return prev.map(stat => {
          if (stat.source === sourceKey) {
            return { ...stat, selected: !stat.selected };
          } else if (stat.isTotal) {
            return { ...stat, selected: false };
          } else {
            return stat;
          }
        });
      }
    });
  };

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Failed to load time series data'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const selectedSources = sourceStats.filter(stat => stat.selected);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {metricType === 'clicks' ? 'Clicks' : metricType === 'leads' ? 'Leads' : 'Conversion %'} Over Time
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={metricType === 'clicks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMetricType('clicks')}
              className="text-xs"
            >
              Clicks
            </Button>
            <Button
              variant={metricType === 'leads' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMetricType('leads')}
              className="text-xs"
            >
              Leads
            </Button>
            <Button
              variant={metricType === 'conversion' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMetricType('conversion')}
              className="text-xs"
            >
              Conversion %
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Chart */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data.timeSeriesData} 
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseISO(value), 'MM/dd')}
                stroke="#6b7280"
              />
              <YAxis 
                stroke="#6b7280" 
                tickFormatter={(value) => metricType === 'conversion' ? `${value}%` : value}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
                labelFormatter={(value) => format(parseISO(value as string), 'MMM d, yyyy')}
                formatter={(value: any, name: any) => {
                  // Handle total
                  if (name === 'total_clicks' || name === 'total_leads' || name === 'total_conversion') {
                    const label = 'Total';
                    if (metricType === 'conversion') {
                      return [`${Number(value).toFixed(1)}%`, label];
                    }
                    return [value, label];
                  }
                  
                  // Handle individual sources
                  const sourceName = name.replace(/_leads$|_conversion$/, '');
                  const stat = sourceStats.find(s => s.source === sourceName);
                  const label = stat?.displayName || sourceName;
                  
                  if (metricType === 'conversion') {
                    return [`${Number(value).toFixed(1)}%`, label];
                  }
                  return [value, label];
                }}
              />
              {selectedSources.map((stat) => {
                let dataKey: string;
                if (stat.isTotal) {
                  dataKey = metricType === 'clicks' ? 'total_clicks' :
                           metricType === 'leads' ? 'total_leads' : 'total_conversion';
                } else {
                  dataKey = metricType === 'clicks' ? stat.source :
                           metricType === 'leads' ? `${stat.source}_leads` :
                           `${stat.source}_conversion`;
                }
                
                return (
                  <Line
                    key={stat.source}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={stat.color}
                    strokeWidth={stat.isTotal ? 3 : 2}
                    dot={false}
                    activeDot={{ r: stat.isTotal ? 5 : 4, fill: stat.color }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Source Selection Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 border-b px-4 py-3">
            <div className="flex items-center text-sm font-medium text-muted-foreground">
              <div className="w-10"></div>
              <div className="flex-1">Source</div>
              <div className="w-20 text-right">Clicks</div>
              <div className="w-20 text-right">Leads</div>
              <div className="w-32 text-right">Conversion Rate</div>
              <div className="w-24 text-right">Last Seen</div>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {sourceStats.map((stat) => (
              <div 
                key={stat.source}
                className={`flex items-center px-4 py-3 hover:bg-muted/30 border-b last:border-b-0 ${
                  stat.selected ? 'bg-muted/20' : ''
                }`}
              >
                <div className="w-10">
                  <Checkbox
                    checked={stat.selected}
                    onCheckedChange={() => toggleSourceSelection(stat.source)}
                  />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: stat.color }}
                  />
                  <span className="text-sm truncate">{stat.displayName}</span>
                </div>
                <div className="w-20 text-right text-sm font-medium">
                  {stat.totalClicks.toLocaleString()}
                </div>
                <div className="w-20 text-right text-sm font-medium">
                  {stat.totalLeads.toLocaleString()}
                </div>
                <div className="w-32 text-right text-sm">
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    stat.conversionRate > 5 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stat.conversionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-24 text-right text-xs text-muted-foreground">
                  -
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground text-center">
          {selectedSources.length} of {sourceStats.length} sources selected
        </div>
      </CardContent>
    </Card>
  );
}