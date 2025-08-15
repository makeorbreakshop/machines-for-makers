'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Youtube, Users, Link2, Mail, Globe, Hash } from 'lucide-react';

interface LeadSourceData {
  totalSubscribers: number;
  sources: { name: string; count: number }[];
  mediums: { name: string; count: number }[];
  campaigns: { name: string; count: number }[];
  detailedSources: {
    source: string;
    medium: string;
    count: number;
    campaigns: string[];
  }[];
}

interface LeadSourcesChartProps {
  data: LeadSourceData;
  loading?: boolean;
}

const getSourceIcon = (source: string) => {
  switch (source.toLowerCase()) {
    case 'youtube':
      return <Youtube className="h-4 w-4" />;
    case 'affiliate':
      return <Link2 className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'direct':
      return <Globe className="h-4 w-4" />;
    default:
      return <Hash className="h-4 w-4" />;
  }
};

const getSourceColor = (source: string) => {
  switch (source.toLowerCase()) {
    case 'youtube':
      return 'bg-red-500';
    case 'affiliate':
      return 'bg-purple-500';
    case 'email':
      return 'bg-blue-500';
    case 'direct':
      return 'bg-gray-500';
    default:
      return 'bg-green-500';
  }
};

export function LeadSourcesChart({ data, loading }: LeadSourcesChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
          <CardDescription>Where your email signups are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.sources.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
        <CardDescription>
          Tracking {data.totalSubscribers} signups with UTM parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sources" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="mediums">Mediums</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-4">
            <div className="space-y-3">
              {data.sources.slice(0, 10).map((source) => (
                <div key={source.name} className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getSourceColor(source.name)} bg-opacity-10`}>
                    <div className={`${getSourceColor(source.name)} bg-opacity-100 text-white rounded-full p-1`}>
                      {getSourceIcon(source.name)}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{source.name}</span>
                      <span className="text-sm text-muted-foreground">{source.count} signups</span>
                    </div>
                    <Progress value={(source.count / maxCount) * 100} className="h-2" />
                  </div>
                  <Badge variant="secondary">
                    {((source.count / data.totalSubscribers) * 100).toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mediums" className="space-y-4">
            <div className="space-y-3">
              {data.mediums.slice(0, 10).map((medium) => (
                <div key={medium.name} className="flex items-center justify-between py-2">
                  <span className="font-medium capitalize">{medium.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{medium.count}</span>
                    <Badge variant="outline">
                      {((medium.count / data.totalSubscribers) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            {data.campaigns.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No campaign data available yet. Add utm_campaign to your links to track campaigns.
              </p>
            ) : (
              <div className="space-y-3">
                {data.campaigns.slice(0, 10).map((campaign) => (
                  <div key={campaign.name} className="flex items-center justify-between py-2">
                    <span className="font-medium">{campaign.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{campaign.count}</span>
                      <Badge variant="outline">
                        {((campaign.count / data.totalSubscribers) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detailed breakdown */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3">Top Source + Medium Combinations</h4>
          <div className="space-y-2">
            {data.detailedSources.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.source} / {item.medium}
                  {item.campaigns.length > 0 && (
                    <span className="ml-2 text-xs">
                      ({item.campaigns.length} campaign{item.campaigns.length > 1 ? 's' : ''})
                    </span>
                  )}
                </span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}