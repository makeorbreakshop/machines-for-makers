'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, Eye, Clock, Loader2, Activity, Calendar, CheckCircle2, AlertCircle, Mail, PieChart, Table as TableIcon, Target, Link2, ChevronRight, Youtube, BookOpen, Tag, Gift, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, parseISO, startOfDay } from 'date-fns';
import { LeadSourcesChart } from '@/components/admin/analytics/lead-sources-chart';
import { UTMBuilder } from '@/components/admin/analytics/utm-builder';
import { AttributionOverview } from '@/components/admin/analytics/attribution-overview';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview?: {
    pageViews: number;
    activeUsers: number;
    engagementRate: number;
    avgSessionDuration: string;
    totalMachines?: number;
    activeMachines?: number;
    totalReviews?: number;
  };
  topPages?: Array<{
    path: string;
    views: number;
  }>;
  topProducts?: Array<{
    name: string;
    slug: string;
    views: number;
    brands?: { name: string };
  }>;
  chartData?: Array<{
    date: string;
    pageViews: number;
    sessions: number;
    activeUsers?: number;
  }>;
  categoryStats?: Array<{
    name: string;
    slug: string;
    machines: Array<{ count: number }>;
  }>;
  events?: {
    reviews: number;
    comparisons: number;
    calculatorUsage: number;
  };
  source?: string;
  databaseStats?: {
    totalMachines: number;
    activeMachines: number;
    totalReviews: number;
  };
  emailSignups?: {
    stats?: {
      totalSubscribers: number;
      monthlySubscribers: number;
      weeklySubscribers: number;
      todaySubscribers: number;
      growthRate: string;
    };
    chartData?: Array<{
      created_at: string;
      source: string;
    }>;
    sourceData?: Array<{
      source: string | null;
    }>;
    recentSignups?: Array<{
      id: string;
      email: string;
      source: string | null;
      tags: string[] | null;
      created_at: string;
      status: string | null;
    }>;
    leadMagnetLabels?: Record<string, string>;
  };
  funnels?: {
    funnels: Array<{
      id: string;
      name: string;
      slug: string;
      icon: string;
      color: string;
      landingPageUrl: string;
      clicks: number;
      pageViews: number;
      submissions: number;
      confirmed: number;
      // New separate metrics
      organicPageViews?: number;
      organicSubmissions?: number;
      organicConfirmed?: number;
      trackedClicks?: number;
      trackedPageViews?: number;
      trackedSubmissions?: number;
      trackedConfirmed?: number;
      clickToPageView: string;
      pageViewToSubmission: string;
      submissionToConfirmed: string;
      overallConversion: string;
      convertingLinks: Array<{
        slug: string;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        utm_content: string | null;
        metadata: Record<string, string | number | boolean> | null;
        conversions: number;
        clicks: number;
      }>;
    }>;
    trendData?: {
      materialLibrary: Array<{
        date: string;
        pageViews: number;
        signups: number;
        conversionRate: number;
      }>;
      dealAlerts: Array<{
        date: string;
        pageViews: number;
        signups: number;
        conversionRate: number;
      }>;
    };
    previousPeriod?: {
      materialLibrary: {
        pageViews: number;
        signups: number;
        conversionRate: number;
      };
      dealAlerts: {
        pageViews: number;
        signups: number;
        conversionRate: number;
      };
    };
    totals?: {
      clicks: number;
      pageViews: number;
      submissions: number;
      confirmed: number;
      clickToPageView: string;
      pageViewToSubmission: string;
      submissionToConfirmed: string;
      overallConversion: string;
    };
    gaConnected?: boolean;
  };
  leadSources?: {
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
  };
  campaigns?: {
    error?: string;
    campaigns: Array<{
      campaign: string;
      source: string;
      medium: string;
      sessions: number;
      pageViews: number;
      users: number;
    }>;
    sources: Array<{
      source: string;
      sessions: number;
      pageViews: number;
      users: number;
    }>;
    mediums: Array<{
      medium: string;
      sessions: number;
      pageViews: number;
      users: number;
    }>;
    sourceMedium: Array<{
      source: string;
      medium: string;
      sessions: number;
      pageViews: number;
      users: number;
    }>;
    totalSessions: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}

// Email signup chart component
function EmailSignupsChart({ data }: { data: Array<{ created_at: string; source: string }> }) {
  // Group data by date
  const groupedData = data.reduce((acc, item) => {
    const date = format(startOfDay(parseISO(item.created_at)), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date]++;
    return acc;
  }, {} as Record<string, number>);

  // Convert to array format for recharts
  const chartData = Object.entries(groupedData)
    .map(([date, count]) => ({
      date,
      signups: count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Only show last 30 days

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), 'MM/dd')}
            stroke="#6b7280"
          />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}
            labelFormatter={(value) => format(parseISO(value as string), 'MMM d, yyyy')}
          />
          <Area
            type="monotone"
            dataKey="signups"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorSignups)"
            name="Signups"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Source breakdown component
function SourceBreakdown({ data, leadMagnetLabels = {} }: { 
  data: Array<{ source: string | null }>,
  leadMagnetLabels?: Record<string, string>
}) {
  // Count by source
  const sourceCounts = data.reduce((acc, item) => {
    const source = item.source || 'other';
    if (!acc[source]) {
      acc[source] = 0;
    }
    acc[source]++;
    return acc;
  }, {} as Record<string, number>);

  // Convert to array format and sort by count
  const sortedSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      label: leadMagnetLabels[source] || source.charAt(0).toUpperCase() + source.slice(1).replace(/-/g, ' '),
      count,
      percentage: ((count / data.length) * 100).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count);

  // Color mapping for sources
  const sourceColors = {
    'laser-material-library': 'blue',
    'deal-alerts': 'purple',
    'other': 'gray'
  };

  return (
    <div className="space-y-3">
      {sortedSources.map(({ source, label, count, percentage }) => {
        const color = sourceColors[source] || 'gray';
        return (
          <div key={source} className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/40 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg bg-${color}-100 dark:bg-${color}-900/20 flex items-center justify-center`}>
                <span className="text-sm font-bold">{percentage}%</span>
              </div>
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{count} signups</p>
              </div>
            </div>
            <Progress value={parseFloat(percentage)} className="w-24 h-2" />
          </div>
        );
      })}
    </div>
  );
}

// Helper function to get source label
function getSourceLabel(source: string | null, leadMagnetLabels: Record<string, string> = {}): string {
  if (!source) return 'Unknown';
  return leadMagnetLabels[source] || source.charAt(0).toUpperCase() + source.slice(1).replace(/-/g, ' ');
}

// Helper functions for funnels
const iconMap: Record<string, React.ReactNode> = {
  'book-open': <BookOpen className="h-4 w-4" />,
  'tag': <Tag className="h-4 w-4" />,
  'gift': <Gift className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
};

const sourceIconMap: Record<string, React.ReactNode> = {
  'youtube': <Youtube className="h-4 w-4" />,
  'email': <Mail className="h-4 w-4" />,
  'social': <Users className="h-4 w-4" />,
  'direct': <Link2 className="h-4 w-4" />,
};

function getHumanReadableSource(link: {
  slug: string;
  utm_source?: string | null;
  utm_campaign?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
}): string {
  // Check metadata for human-readable titles
  if (link.metadata) {
    if (link.metadata.video_title) {
      return `YouTube: ${link.metadata.video_title}`;
    }
    if (link.metadata.description) {
      return link.metadata.description;
    }
    if (link.metadata.campaign_name) {
      return link.metadata.campaign_name;
    }
  }
  
  // Fall back to campaign name if available
  if (link.utm_campaign) {
    // Clean up YouTube campaign IDs
    if (link.utm_source === 'youtube' && link.utm_campaign.startsWith('yt-')) {
      const videoId = link.utm_campaign.replace('yt-', '');
      return `YouTube Video (${videoId})`;
    }
    
    // Clean up email campaigns
    if (link.utm_source === 'email') {
      return `Email: ${link.utm_campaign.replace(/-/g, ' ')}`;
    }
    
    return link.utm_campaign.replace(/-/g, ' ');
  }
  
  // Last resort: use slug
  return link.slug;
}


export default function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('attribution');
  const [expandedFunnels, setExpandedFunnels] = useState<Set<string>>(new Set());

  const fetchAnalytics = useCallback(async (metric: string = 'overview') => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      if (metric === 'email-signups') {
        const response = await fetch(`/api/admin/analytics/email-signups?days=${days}`);
        const result = await response.json();
        setData(prevData => ({ ...prevData, emailSignups: result }));
      } else if (metric === 'funnels') {
        const response = await fetch(`/api/admin/analytics/funnels?days=${days}`);
        const result = await response.json();
        setData(prevData => ({ ...prevData, funnels: result }));
      } else if (metric === 'lead-sources') {
        const response = await fetch(`/api/admin/analytics/lead-sources?days=${days}`);
        const result = await response.json();
        setData(prevData => ({ ...prevData, leadSources: result }));
      } else if (metric === 'campaigns') {
        const response = await fetch(`/api/admin/analytics/campaigns?days=${days}`);
        const result = await response.json();
        setData(prevData => ({ ...prevData, campaigns: result }));
      } else {
        const response = await fetch(`/api/admin/analytics?metric=${metric}&startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();
        console.log('Analytics API response:', result);
        console.log('Chart data:', result.chartData);
        setData(prevData => ({ ...prevData, ...result }));
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics(activeTab);
  }, [activeTab, fetchAnalytics]);


  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track visitor behavior and site performance
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Unified header stats that change based on active tab */}
      {(activeTab === 'overview' || activeTab === 'email-signups') && (
        loading ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            {activeTab === 'overview' ? (
            <>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {data.overview ? formatNumber(data.overview.pageViews) : '0'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Page Views</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {data.overview ? formatNumber(data.overview.activeUsers) : '0'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Active Users</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {data.overview?.avgSessionDuration || '0:00'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Avg Duration</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {data.overview ? `${(data.overview.engagementRate * 100).toFixed(0)}%` : '0%'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Engagement Rate</p>
                </CardContent>
              </Card>
            </>
          ) : activeTab === 'email-signups' ? (
            <>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {data.emailSignups?.stats ? formatNumber(data.emailSignups.stats.totalSubscribers) : '0'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Total Subscribers</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    <span className="text-green-600">+{data.emailSignups?.stats?.growthRate || '0'}%</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Growth Rate</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {data.emailSignups?.stats ? formatNumber(data.emailSignups.stats.weeklySubscribers) : '0'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">This Week</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {data.emailSignups?.stats ? formatNumber(data.emailSignups.stats.todaySubscribers) : '0'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Today</p>
                </CardContent>
              </Card>
            </>
          ) : null}
          </div>
        )
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="attribution" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Attribution</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="email-signups" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="funnels" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Funnels</span>
            </TabsTrigger>
            <TabsTrigger value="lead-sources" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Lead Sources</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Campaigns</span>
            </TabsTrigger>
            <TabsTrigger value="utm-builder" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">UTM Builder</span>
            </TabsTrigger>
            <TabsTrigger value="ga-live" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              {data.source === 'google_analytics' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
            </TabsTrigger>
          </TabsList>
          {data.source === 'google_analytics' && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              GA Connected
            </Badge>
          )}
        </div>

        <TabsContent value="attribution" className="space-y-4">
          <AttributionOverview dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{data.source === 'google_analytics' ? 'Top Pages' : 'Top Viewed Machines'}</CardTitle>
                  <CardDescription>
                    {data.source === 'google_analytics' ? 'Most visited pages on your site' : 'Most popular machines based on database views'}
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {data.source === 'google_analytics' ? 'Live Data' : 'Database'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {data.source === 'google_analytics' && data.topPages ? (
                    data.topPages.map((page, index) => (
                      <div key={page.path} className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium leading-none">{page.path}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatNumber(page.views)} views
                          </span>
                          <Progress value={(page.views / (data.topPages[0]?.views || 1)) * 100} className="w-24 h-2" />
                        </div>
                      </div>
                    ))
                  ) : (
                    data.topProducts?.map((product, index) => (
                      <div key={product.slug} className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium leading-none">{product.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {product.brands?.name || 'Unknown Brand'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatNumber(product.views || 0)} views
                          </span>
                          <Progress value={(product.views / (data.topProducts[0]?.views || 1)) * 100} className="w-24 h-2" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Traffic Trend</CardTitle>
              <CardDescription>
                {data.source === 'google_analytics' ? 'Page views from Google Analytics' : 'Using database statistics'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : data.chartData && data.chartData.length > 0 ? (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorActiveUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => {
                          const dateStr = date.toString();
                          const month = dateStr.substring(4, 6);
                          const day = dateStr.substring(6, 8);
                          return `${parseInt(month)}/${parseInt(day)}`;
                        }}
                        stroke="#6b7280"
                      />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px'
                        }}
                        labelFormatter={(date) => {
                          const dateStr = date.toString();
                          const year = dateStr.substring(0, 4);
                          const month = dateStr.substring(4, 6);
                          const day = dateStr.substring(6, 8);
                          return `${month}/${day}/${year}`;
                        }}
                      />
                      <Legend iconType="line" />
                      <Area
                        type="monotone"
                        dataKey="pageViews"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorPageViews)"
                        name="Page Views"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="sessions"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorSessions)"
                        name="Sessions"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="activeUsers"
                        stroke="#a855f7"
                        fillOpacity={1}
                        fill="url(#colorActiveUsers)"
                        name="Active Users"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p>Loading chart data...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ga-live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Analytics Setup Status</CardTitle>
              <CardDescription>
                {data.source === 'google_analytics' 
                  ? '✓ Successfully connected to Google Analytics' 
                  : 'Configure Google Analytics for real-time data'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.source === 'google_analytics' ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-800">✓ Google Analytics Connected</p>
                      <p className="text-sm text-green-700 mt-1">Your analytics data is now being pulled from Google Analytics API.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Connection Details:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Property ID: {process.env.GA_PROPERTY_ID || 'properties/471918428'}</li>
                        <li>Service Account: ga-analytics-reader</li>
                        <li>Date Range: Last {dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">
                      To enable Google Analytics data, complete these steps:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>✓ Create service account in Google Cloud Console</li>
                      <li>✓ Enable Google Analytics Data API</li>
                      <li>✓ Grant service account access to GA4 property</li>
                      <li>✓ Add service account JSON to .env.local</li>
                      <li>✓ Restart your development server</li>
                    </ol>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                      <p className="text-sm font-medium text-amber-800">Note: Analytics may be configured but not loading</p>
                      <p className="text-sm text-amber-700 mt-1">Check your terminal for any API errors.</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-signups" className="space-y-4">
          {/* Email Signup Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Signup Trend</CardTitle>
              <CardDescription>Daily email signups over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : data.emailSignups?.chartData && data.emailSignups.chartData.length > 0 ? (
                <EmailSignupsChart data={data.emailSignups.chartData} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4" />
                    <p>No signup data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Source Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Source Breakdown</CardTitle>
                <CardDescription>Where your signups come from</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : data.emailSignups?.sourceData && data.emailSignups.sourceData.length > 0 ? (
                  <SourceBreakdown 
                    data={data.emailSignups.sourceData} 
                    leadMagnetLabels={data.emailSignups.leadMagnetLabels || {}}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-4" />
                    <p>No source data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Signups */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Signups</CardTitle>
                <CardDescription>Latest email subscribers</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : data.emailSignups?.recentSignups && data.emailSignups.recentSignups.length > 0 ? (
                  <div className="space-y-2">
                    {data.emailSignups.recentSignups.slice(0, 5).map((signup) => (
                      <div key={signup.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{signup.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(signup.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {getSourceLabel(signup.source, data.emailSignups?.leadMagnetLabels || {})}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TableIcon className="h-12 w-12 mx-auto mb-4" />
                    <p>No signups yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnels" className="space-y-4">
          {/* GA Connection Warning */}
          {!loading && data.funnels?.gaConnected === false && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Google Analytics is not connected. Page view data may be incomplete.
              </AlertDescription>
            </Alert>
          )}

          {/* Two-Funnel Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Organic/Direct Traffic Funnel */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Organic/Direct Traffic
                </CardTitle>
                <CardDescription className="text-sm ml-11">
                  Visitors who found you through search or direct visits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 w-full">
                    <div className="text-center flex-1">
                      <div className="text-2xl font-bold tabular-nums">{data.funnels?.organic?.pageViews?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Page Views</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                    <div className="text-center flex-1">
                      <div className="text-2xl font-bold tabular-nums">{data.funnels?.organic?.signups?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Signups</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{data.funnels?.organic?.viewToSignup || '0'}%</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                    <div className="text-center flex-1">
                      <div className="text-2xl font-bold tabular-nums text-green-600">{data.funnels?.organic?.confirmed?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Confirmed</div>
                      <div className="text-xs text-green-600 font-medium tabular-nums">{data.funnels?.organic?.signupToConfirmed || '0'}%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracked Campaigns Funnel */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Link2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Tracked Campaigns
                </CardTitle>
                <CardDescription className="text-sm ml-11">
                  Visitors from your tracked short links and campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 w-full">
                    <div className="text-center flex-1">
                      <div className="text-2xl font-bold tabular-nums">{data.funnels?.tracked?.clicks?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Clicks</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                    <div className="text-center flex-1">
                      <div className="text-2xl font-bold tabular-nums">{data.funnels?.tracked?.pageViews?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Views</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{data.funnels?.tracked?.clickToView || '0'}%</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                    <div className="text-center flex-1">
                      <div className="text-2xl font-bold tabular-nums">{data.funnels?.tracked?.signups?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Signups</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{data.funnels?.tracked?.viewToSignup || '0'}%</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                    <div className="text-center flex-1">
                      <div className="text-2xl font-bold tabular-nums text-green-600">{data.funnels?.tracked?.confirmed?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Confirmed</div>
                      <div className="text-xs text-green-600 font-medium tabular-nums">{data.funnels?.tracked?.signupToConfirmed || '0'}%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Lead Magnets */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Magnet Performance</CardTitle>
              <CardDescription>
                Performance breakdown by lead magnet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : data.funnels?.funnels && data.funnels.funnels.length > 0 ? (
                data.funnels.funnels.map((funnel) => (
                  <div key={funnel.id}>
                    <Collapsible
                      open={expandedFunnels.has(funnel.id)}
                      onOpenChange={(open) => {
                        const newExpanded = new Set(expandedFunnels);
                        if (open) {
                          newExpanded.add(funnel.id);
                        } else {
                          newExpanded.delete(funnel.id);
                        }
                        setExpandedFunnels(newExpanded);
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="p-4 hover:bg-muted/30 cursor-pointer transition-colors rounded-lg border group">
                          <div className="flex items-center justify-between gap-4">
                            {/* Left side: Icon and name */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <ChevronRight className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                                expandedFunnels.has(funnel.id) && "rotate-90"
                              )} />
                              <div 
                                className="p-2 rounded-lg shrink-0"
                                style={{ backgroundColor: `${funnel.color}20` }}
                              >
                                <div style={{ color: funnel.color }}>
                                  {iconMap[funnel.icon] || <Gift className="h-4 w-4" />}
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">{funnel.name}</p>
                                <p className="text-xs text-muted-foreground">{funnel.landingPageUrl}</p>
                              </div>
                            </div>
                            
                            {/* Right side: Metrics */}
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-center w-[90px]">
                                <div className="font-semibold text-lg tabular-nums">{funnel.pageViews.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Views</div>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                              <div className="text-center w-[90px]">
                                <div className="font-semibold text-lg tabular-nums">{funnel.submissions.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Signups</div>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                              <div className="text-center w-[90px]">
                                <div className="font-semibold text-lg tabular-nums text-green-600">{funnel.confirmed.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Confirmed</div>
                              </div>
                              <Badge 
                                variant={parseFloat(funnel.pageViewToSubmission) > 5 ? "default" : "secondary"}
                                className="ml-3 w-[75px] justify-center tabular-nums"
                              >
                                {funnel.pageViewToSubmission}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-2">
                          {/* Two-Funnel Summary for this Lead Magnet */}
                          <div className="grid gap-3 md:grid-cols-2 mb-4">
                            {/* Organic Traffic for this Lead Magnet */}
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                              <div className="flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">Organic/Direct Traffic</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-center flex-1">
                                  <div className="text-lg font-bold tabular-nums">{(funnel.organicPageViews || funnel.pageViews || 0).toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground mt-1">Page Views</div>
                                </div>
                                <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                                <div className="text-center flex-1">
                                  <div className="text-lg font-bold tabular-nums">
                                    {(funnel.organicSubmissions || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">Signups</div>
                                </div>
                                <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                                <div className="text-center flex-1">
                                  <div className="text-lg font-bold tabular-nums text-green-600">
                                    {(funnel.organicConfirmed || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">Confirmed</div>
                                  <div className="text-xs text-green-600 font-medium tabular-nums">
                                    {funnel.organicSubmissions > 0 ? ((funnel.organicConfirmed / funnel.organicSubmissions) * 100).toFixed(0) : '0'}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tracked Campaigns for this Lead Magnet */}
                            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                              <div className="flex items-center gap-2 mb-3">
                                <Link2 className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium">Campaign Source</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-center flex-1">
                                  <div className="text-lg font-bold tabular-nums">{(funnel.trackedClicks || funnel.clicks || 0).toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground mt-1">Clicks</div>
                                </div>
                                <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                                <div className="text-center flex-1">
                                  <div className="text-lg font-bold tabular-nums">{(funnel.trackedPageViews || Math.round((funnel.trackedClicks || funnel.clicks || 0) * 0.8)).toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground mt-1">Views</div>
                                  <div className="text-xs text-muted-foreground tabular-nums">
                                    {funnel.trackedClicks > 0 ? (((funnel.trackedPageViews || 0) / funnel.trackedClicks) * 100).toFixed(0) : '0'}%
                                  </div>
                                </div>
                                <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                                <div className="text-center flex-1">
                                  <div className="text-lg font-bold tabular-nums">
                                    {(funnel.trackedSubmissions || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">Signups</div>
                                </div>
                                <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                                <div className="text-center flex-1">
                                  <div className="text-lg font-bold tabular-nums text-green-600">
                                    {(funnel.trackedConfirmed || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">Confirmed</div>
                                  <div className="text-xs text-green-600 font-medium tabular-nums">
                                    {funnel.trackedSubmissions > 0 ? ((funnel.trackedConfirmed / funnel.trackedSubmissions) * 100).toFixed(0) : '0'}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Campaign Performance Table */}
                          <Card className="border-0 bg-muted/10">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                Campaign Performance
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                            {!funnel.convertingLinks || funnel.convertingLinks.length === 0 ? (
                              <div className="text-center py-8 text-sm text-muted-foreground">
                                No conversions tracked yet for this funnel
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b">
                                      <TableHead className="font-medium w-[35%]">Campaign Source</TableHead>
                                      <TableHead className="font-medium w-[15%]">Channel</TableHead>
                                      <TableHead className="font-medium text-center w-[12%]">Clicks</TableHead>
                                      <TableHead className="font-medium text-center w-[12%]">Conversions</TableHead>
                                      <TableHead className="font-medium text-center w-[10%]">Rate</TableHead>
                                      <TableHead className="font-medium text-right w-[16%]">Link</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                  {funnel.convertingLinks.map((link) => {
                                    const conversionRate = link.clicks > 0 
                                      ? ((link.conversions / link.clicks) * 100).toFixed(1)
                                      : '0.0';
                                    
                                    return (
                                      <TableRow key={link.slug} className="hover:bg-muted/30 border-b last:border-0">
                                        <TableCell className="py-3">
                                          <div className="flex items-center gap-2">
                                            {sourceIconMap[link.utm_source || 'direct'] || <Link2 className="h-4 w-4 text-muted-foreground" />}
                                            <div className="min-w-0">
                                              <p className="font-medium text-sm">
                                                {getHumanReadableSource(link)}
                                              </p>
                                              {link.utm_content && (
                                                <p className="text-xs text-muted-foreground">
                                                  {link.utm_content}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                          <Badge variant="secondary" className="text-xs">
                                            {link.utm_medium || 'direct'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums py-3">
                                          {link.clicks}
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums py-3">
                                          <span className="font-semibold text-green-600">
                                            {link.conversions}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-center py-3">
                                          <Badge 
                                            variant={parseFloat(conversionRate) > 5 ? 'default' : 'secondary'}
                                            className="text-xs tabular-nums min-w-[60px] inline-flex justify-center"
                                          >
                                            {conversionRate}%
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-3">
                                          <a
                                            href={`/go/${link.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                          >
                                            /go/{link.slug.slice(-12)}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                            </CardContent>
                          </Card>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active lead magnets found. Create a lead magnet to start tracking conversions.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead-sources" className="space-y-4">
          {/* Lead Sources Information */}
          <div className="mb-4">
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Link2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">UTM Parameter Tracking</p>
                    <p className="text-sm text-muted-foreground">
                      Track where your email signups come from using UTM parameters. Add these to your links:
                    </p>
                    <div className="bg-background rounded-md p-3 mt-2 font-mono text-xs">
                      <p className="text-muted-foreground mb-1">Example for YouTube:</p>
                      <p className="break-all">?utm_source=youtube&utm_medium=video&utm_campaign=laser-basics</p>
                      <p className="text-muted-foreground mt-2 mb-1">Example for Affiliates:</p>
                      <p className="break-all">?utm_source=affiliate&utm_medium=referral&utm_campaign=partner-name</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Loading lead source data...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 animate-pulse">
                  <div className="h-8 bg-muted rounded w-3/4" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ) : data.leadSources ? (
            <LeadSourcesChart data={data.leadSources} loading={false} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No lead source data available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start tracking by adding UTM parameters to your marketing links
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="flex items-start gap-3 p-6">
                <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Campaign Performance</p>
                  <p className="text-sm text-muted-foreground">
                    View link clicks and sessions from your UTM-tagged campaigns in Google Analytics.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 p-6">
                <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Traffic Sources</p>
                  <p className="text-sm text-muted-foreground">
                    See which sources (youtube, affiliate, etc.) drive the most traffic to your site.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 p-6">
                <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Live Sessions</p>
                  <p className="text-sm text-muted-foreground">
                    Track real-time visitor sessions and page views from your marketing campaigns.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-[400px]" />
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[300px]" />
              </div>
            </div>
          ) : data.campaigns?.error ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {data.campaigns.error === 'Google Analytics not configured' ? (
                  <>
                    Google Analytics is not configured. Campaign tracking requires Google Analytics to be set up.
                    Check the Configuration tab for setup instructions.
                  </>
                ) : (
                  <>Failed to load campaign data: {data.campaigns.error}</>
                )}
              </AlertDescription>
            </Alert>
          ) : data.campaigns ? (
            <div className="space-y-6">
              {/* Campaign Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Overview</CardTitle>
                  <CardDescription>
                    Total sessions with UTM parameters in the last {dateRange === '1d' ? '24 hours' : dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-4">
                    {formatNumber(data.campaigns.totalSessions || 0)} sessions
                  </div>
                  
                  {/* Campaigns Table */}
                  {data.campaigns.campaigns && data.campaigns.campaigns.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Active Campaigns</h4>
                      <div className="space-y-2">
                        {data.campaigns.campaigns.slice(0, 10).map((campaign, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{campaign.campaign}</p>
                              <p className="text-xs text-muted-foreground">
                                {campaign.source} / {campaign.medium}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatNumber(campaign.sessions)}</p>
                              <p className="text-xs text-muted-foreground">{formatNumber(campaign.pageViews)} views</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                      <p>No UTM campaign data found</p>
                      <p className="text-sm mt-2">
                        Use the UTM Builder tab to create tracked links for your campaigns
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sources and Mediums */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Sources */}
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Sources</CardTitle>
                    <CardDescription>Where your UTM traffic comes from</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.campaigns.sources && data.campaigns.sources.length > 0 ? (
                      <div className="space-y-3">
                        {data.campaigns.sources.slice(0, 5).map((source, index) => {
                          const percentage = data.campaigns.totalSessions > 0 
                            ? (source.sessions / data.campaigns.totalSessions * 100).toFixed(1)
                            : '0';
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{source.source}</span>
                                <span className="text-muted-foreground">{formatNumber(source.sessions)} ({percentage}%)</span>
                              </div>
                              <Progress value={parseFloat(percentage)} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No source data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Mediums */}
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Mediums</CardTitle>
                    <CardDescription>How visitors find you</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.campaigns.mediums && data.campaigns.mediums.length > 0 ? (
                      <div className="space-y-3">
                        {data.campaigns.mediums.slice(0, 5).map((medium, index) => {
                          const percentage = data.campaigns.totalSessions > 0 
                            ? (medium.sessions / data.campaigns.totalSessions * 100).toFixed(1)
                            : '0';
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{medium.medium}</span>
                                <span className="text-muted-foreground">{formatNumber(medium.sessions)} ({percentage}%)</span>
                              </div>
                              <Progress value={parseFloat(percentage)} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No medium data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No campaign data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="utm-builder" className="space-y-4">
          <UTMBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}