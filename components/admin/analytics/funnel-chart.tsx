'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, Users, Mail, Link2 } from 'lucide-react';

interface FunnelData {
  name: string;
  clicks?: number;
  pageViews: number;
  submissions: number;
  confirmed: number;
}

interface FunnelChartProps {
  data: FunnelData;
  loading?: boolean;
}

export function FunnelChart({ data, loading }: FunnelChartProps) {
  const calculateConversionRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current / previous) * 100).toFixed(1);
  };

  const getStepColor = (rate: number) => {
    if (rate >= 20) return 'text-green-600';
    if (rate >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{data.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate conversion rates for each step
  const clickToPageRate = data.clicks ? parseFloat(calculateConversionRate(data.pageViews, data.clicks)) : 0;
  const pageToSignupRate = parseFloat(calculateConversionRate(data.submissions, data.pageViews));
  
  // Calculate overall conversion rate
  const overallConversionRate = data.clicks 
    ? calculateConversionRate(data.submissions, data.clicks)
    : calculateConversionRate(data.submissions, data.pageViews);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.name}</CardTitle>
        <CardDescription>
          {data.clicks ? 'Conversion funnel from link click to email signup' : 'Conversion funnel from page view to email signup'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clicks - only show if we have click data */}
        {data.clicks !== undefined && data.clicks > 0 && (
          <>
            <div className="relative">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Link Clicks</p>
                    <p className="text-2xl font-bold">{data.clicks.toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">100%</Badge>
              </div>
            </div>

            {/* Arrow and conversion rate */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <ArrowDown className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className={`text-sm font-medium mt-1 ${getStepColor(clickToPageRate)}`}>
                  {clickToPageRate}% to page view
                </p>
              </div>
            </div>
          </>
        )}

        {/* Page Views */}
        <div className="relative">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Page Views</p>
                <p className="text-2xl font-bold">{data.pageViews.toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {data.clicks ? `${clickToPageRate}%` : '100%'}
            </Badge>
          </div>
        </div>

        {/* Arrow and conversion rate */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <ArrowDown className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className={`text-sm font-medium mt-1 ${getStepColor(pageToSignupRate)}`}>
              {pageToSignupRate}% conversion
            </p>
          </div>
        </div>

        {/* Email Signups */}
        <div className="relative">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Email Signups</p>
                <p className="text-2xl font-bold">{data.submissions.toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {pageToSignupRate}%
            </Badge>
          </div>
          <Progress 
            value={pageToSignupRate} 
            className="mt-2"
          />
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Conversion Rate</span>
            <span className="font-medium">
              {overallConversionRate}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Signups</span>
            <span className="font-medium">{data.submissions.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}