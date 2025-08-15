'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, ComposedChart } from 'recharts';
import { format, parseISO } from 'date-fns';

interface FunnelTrendData {
  date: string;
  pageViews: number;
  signups: number;
  conversionRate: number;
}

interface FunnelTrendsProps {
  data: FunnelTrendData[];
  loading?: boolean;
  funnelName: string;
  currentPeriod: {
    pageViews: number;
    signups: number;
    conversionRate: number;
  };
  previousPeriod?: {
    pageViews: number;
    signups: number;
    conversionRate: number;
  };
}

export function FunnelTrends({ data, loading, funnelName, currentPeriod, previousPeriod }: FunnelTrendsProps) {
  const formatDate = (dateStr: string) => {
    try {
      // Handle GA date format (YYYYMMDD)
      if (dateStr.length === 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return format(new Date(`${year}-${month}-${day}`), 'MMM d');
      }
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous || previous === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getPercentageChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  const formatChange = (change: number | null) => {
    if (change === null) return '';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Trends</CardTitle>
          <CardDescription>{funnelName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Trends</CardTitle>
        <CardDescription>{funnelName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Comparison Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Conversion Rate */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{currentPeriod.conversionRate}%</p>
              {previousPeriod && (
                <>
                  {getTrendIcon(currentPeriod.conversionRate, previousPeriod.conversionRate)}
                  <Badge variant={currentPeriod.conversionRate > previousPeriod.conversionRate ? 'default' : 'secondary'}>
                    {formatChange(getPercentageChange(currentPeriod.conversionRate, previousPeriod.conversionRate))}
                  </Badge>
                </>
              )}
            </div>
            {previousPeriod && (
              <p className="text-xs text-muted-foreground">
                vs {previousPeriod.conversionRate}% last period
              </p>
            )}
          </div>

          {/* Total Signups */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Signups</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{currentPeriod.signups.toLocaleString()}</p>
              {previousPeriod && (
                <>
                  {getTrendIcon(currentPeriod.signups, previousPeriod.signups)}
                  <Badge variant={currentPeriod.signups > previousPeriod.signups ? 'default' : 'secondary'}>
                    {formatChange(getPercentageChange(currentPeriod.signups, previousPeriod.signups))}
                  </Badge>
                </>
              )}
            </div>
            {previousPeriod && (
              <p className="text-xs text-muted-foreground">
                vs {previousPeriod.signups.toLocaleString()} last period
              </p>
            )}
          </div>

          {/* Page Views */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Page Views</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{currentPeriod.pageViews.toLocaleString()}</p>
              {previousPeriod && (
                <>
                  {getTrendIcon(currentPeriod.pageViews, previousPeriod.pageViews)}
                  <Badge variant={currentPeriod.pageViews > previousPeriod.pageViews ? 'default' : 'secondary'}>
                    {formatChange(getPercentageChange(currentPeriod.pageViews, previousPeriod.pageViews))}
                  </Badge>
                </>
              )}
            </div>
            {previousPeriod && (
              <p className="text-xs text-muted-foreground">
                vs {previousPeriod.pageViews.toLocaleString()} last period
              </p>
            )}
          </div>
        </div>

        {/* Dual-Axis Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="signupsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis 
                yAxisId="left"
                className="text-xs"
                label={{ value: 'Signups', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                className="text-xs"
                label={{ value: 'Conversion Rate %', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'Signups') return [value.toLocaleString(), name];
                  if (name === 'Conversion Rate') return [`${value}%`, name];
                  return [value, name];
                }}
                labelFormatter={(label) => formatDate(label as string)}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="signups"
                stroke="#8884d8"
                fill="url(#signupsGradient)"
                strokeWidth={2}
                name="Signups"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversionRate"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Conversion Rate"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}