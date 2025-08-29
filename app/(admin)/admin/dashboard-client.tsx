"use client"

import { useState, useEffect } from 'react';
import { 
  Youtube,
  MousePointerClick,
  Globe,
  Mail,
  ArrowUp,
  ArrowDown,
  Activity,
  Minus,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';

interface KPIMetric {
  label: string;
  value: string | number;
  change: number;
  changeLabel?: string;
  icon: React.ElementType;
  prefix?: string;
}


interface EmailStats {
  totalSubscribers: number;
  monthlySubscribers: number;
  weeklySubscribers: number;
  todaySubscribers: number;
  growthRate: string;
}

interface FunnelData {
  funnels: Array<{
    id: string;
    name: string;
    submissions: number;
    confirmed: number;
    pageViews: number;
    clicks: number;
  }>;
  totals?: {
    clicks: number;
    pageViews: number;
    submissions: number;
    confirmed: number;
  };
}


function KPICard({ metric }: { metric: KPIMetric }) {
  const Icon = metric.icon;
  const TrendIcon = metric.change > 0 ? ArrowUp : metric.change < 0 ? ArrowDown : Minus;
  
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Icon className="h-5 w-5 text-gray-500" />
          {metric.change !== 0 && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              metric.change > 0 ? "text-green-600" : 
              metric.change < 0 ? "text-red-600" : 
              "text-gray-500"
            )}>
              <TrendIcon className="h-3 w-3" />
              <span>{metric.change > 0 ? '+' : ''}{metric.change}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="text-2xl font-semibold">
            {metric.prefix}{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
          </p>
        </div>
        
        {metric.changeLabel && (
          <p className="text-xs text-muted-foreground mt-4">{metric.changeLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Custom tooltip for charts
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Calculate percentage change for sparkline data
function calculateSparklineChange(data: number[]): number {
  if (data.length < 2) return 0;
  
  // Compare first half vs second half of the period
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  if (firstAvg === 0) return secondAvg > 0 ? 100 : 0;
  
  return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
}

// Process email chart data into daily counts
function processEmailChartData(chartData: Array<{ created_at: string }>) {
  const dailyCounts: Record<string, number> = {};
  
  // Get last 30 days
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    dailyCounts[dateStr] = 0;
  }
  
  // Count signups per day
  chartData.forEach(item => {
    const dateStr = item.created_at.split('T')[0];
    if (dailyCounts.hasOwnProperty(dateStr)) {
      dailyCounts[dateStr]++;
    }
  });
  
  // Convert to chart format
  return Object.entries(dailyCounts).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    emails: count,
    clicks: 0, // Will be filled from funnel data
    traffic: 0 // Will be filled from funnel data
  }));
}


export default function DashboardClient() {
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [combinedChartData, setCombinedChartData] = useState<Array<{
    date: string;
    emails: number;
    clicks: number;
    traffic: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState('emails');
  const [hasTrafficData, setHasTrafficData] = useState(false);
  
  // Get current date info
  const now = new Date();

  // Process clicks chart data into daily counts
  function processClicksChartData(chartData: Array<{ clicked_at: string }>) {
    const dailyCounts: Record<string, number> = {};
    
    // Get last 30 days
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyCounts[dateStr] = 0;
    }
    
    // Count clicks per day
    chartData.forEach(item => {
      const dateStr = item.clicked_at.split('T')[0];
      if (dailyCounts.hasOwnProperty(dateStr)) {
        dailyCounts[dateStr]++;
      }
    });
    
    return dailyCounts;
  }

  // Fetch data from existing analytics endpoints
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch email stats and chart data
        const emailResponse = await fetch('/api/admin/analytics/email-signups?days=30');
        const emailData = emailResponse.ok ? await emailResponse.json() : null;
        
        if (emailData) {
          setEmailStats(emailData.stats);
        }

        // Fetch funnel data for lead clicks
        const funnelResponse = await fetch('/api/admin/analytics/funnels?days=30');
        const funnelDataRes = funnelResponse.ok ? await funnelResponse.json() : null;
        
        if (funnelDataRes) {
          setFunnelData(funnelDataRes);
        }

        // Fetch clicks chart data
        const clicksResponse = await fetch('/api/admin/analytics/clicks-chart?days=30');
        const clicksData = clicksResponse.ok ? await clicksResponse.json() : null;

        // Fetch traffic data from the same API as the analytics overview page
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        
        const trafficResponse = await fetch(`/api/admin/analytics?metric=overview&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
        const trafficData = trafficResponse.ok ? await trafficResponse.json() : null;
        
        // Process traffic chart data from GA
        const trafficByDate: Record<string, number> = {};
        if (trafficData?.chartData) {
          trafficData.chartData.forEach((item: { date: string; pageViews: number; sessions: number }) => {
            // Convert GA date format (YYYYMMDD) to standard format (YYYY-MM-DD)
            const gaDate = item.date;
            const formattedDate = `${gaDate.slice(0,4)}-${gaDate.slice(4,6)}-${gaDate.slice(6,8)}`;
            // Use sessions as it's more representative of actual web traffic
            trafficByDate[formattedDate] = item.sessions || item.pageViews;
          });
          setHasTrafficData(Object.keys(trafficByDate).length > 0);
        }

        // Combine all chart data
        const emailChartCounts = emailData?.chartData ? processEmailChartData(emailData.chartData) : [];
        const clickChartCounts = clicksData?.chartData ? processClicksChartData(clicksData.chartData) : {};
        
        // Merge email, click, and traffic data
        const combined = emailChartCounts.map((emailDay, index) => {
          // Get the actual date key for this day (30 days ago + index)
          const actualDate = new Date();
          actualDate.setDate(actualDate.getDate() - (29 - index));
          const dateKey = actualDate.toISOString().split('T')[0];
          
          return {
            ...emailDay,
            clicks: clickChartCounts[dateKey] || 0,
            traffic: trafficByDate[dateKey] || 0
          };
        });

        setCombinedChartData(combined);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <AdminPageWrapper
        title="Dashboard"
        description="Loading..."
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminPageWrapper>
    );
  }

  // Calculate totals
  const totalEmailSignups = emailStats?.totalSubscribers || 0;
  const totalLeadClicks = funnelData?.totals?.clicks || 0;
  const totalSubmissions = funnelData?.totals?.submissions || 0;
  const totalConfirmed = funnelData?.totals?.confirmed || 0;

  // Generate 7-day totals and percentage changes
  const last7Days = combinedChartData.slice(-7);
  const previous7Days = combinedChartData.slice(-14, -7);
  
  // Calculate 7-day totals
  const emails7DayTotal = last7Days.reduce((sum, day) => sum + day.emails, 0);
  const clicks7DayTotal = last7Days.reduce((sum, day) => sum + day.clicks, 0);
  const traffic7DayTotal = last7Days.reduce((sum, day) => sum + day.traffic, 0);
  
  // Calculate 7-day percentage changes
  const emailsPrev7Day = previous7Days.reduce((sum, day) => sum + day.emails, 0);
  const clicksPrev7Day = previous7Days.reduce((sum, day) => sum + day.clicks, 0);
  const trafficPrev7Day = previous7Days.reduce((sum, day) => sum + day.traffic, 0);
  
  const emailsChange = emailsPrev7Day > 0 ? Math.round(((emails7DayTotal - emailsPrev7Day) / emailsPrev7Day) * 100) : 0;
  const clicksChange = clicksPrev7Day > 0 ? Math.round(((clicks7DayTotal - clicksPrev7Day) / clicksPrev7Day) * 100) : 0;
  const trafficChange = trafficPrev7Day > 0 ? Math.round(((traffic7DayTotal - trafficPrev7Day) / trafficPrev7Day) * 100) : 0;
  
  // KPI Metrics - using real data with 7-day totals and changes
  const metrics: KPIMetric[] = [
    {
      label: "Email Signups Today",
      value: emailStats?.todaySubscribers || 0,
      change: emailsChange,
      changeLabel: `${emails7DayTotal} total last 7 days`,
      icon: Mail
    },
    {
      label: "Lead Clicks Today", 
      value: last7Days.length > 0 ? last7Days[last7Days.length - 1]?.clicks || 0 : 0, // Today's clicks
      change: clicksChange,
      changeLabel: `${clicks7DayTotal} total last 7 days`,
      icon: MousePointerClick
    },
    {
      label: "Conversion Rate",
      value: `${totalSubmissions > 0 ? Math.round((totalConfirmed / totalSubmissions) * 100) : 0}%`, // Overall conversion rate
      change: 0, // No change for conversion rate
      changeLabel: `${totalConfirmed} confirmed of ${totalSubmissions} total`,
      icon: Activity
    },
    {
      label: "Traffic Today",
      value: hasTrafficData && last7Days.length > 0 ? last7Days[last7Days.length - 1]?.traffic || 0 : "—",
      change: hasTrafficData ? trafficChange : 0,
      changeLabel: hasTrafficData ? `${traffic7DayTotal} total last 7 days` : "Not connected",
      icon: Globe
    },
    {
      label: "YouTube Views",
      value: "—",
      change: 0,
      changeLabel: "Not connected",
      icon: Youtube,
      sparklineData: []
    }
  ];

  // Use real chart data
  const chartData = combinedChartData.slice(-7); // Last 7 days

  return (
    <AdminPageWrapper
      title="Dashboard"
      description={now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    >

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <KPICard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Main Charts with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>7-Day Trend</CardTitle>
              <CardDescription>Track your key metrics over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeChartTab} onValueChange={setActiveChartTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="emails" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Signups
              </TabsTrigger>
              <TabsTrigger value="clicks" className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4" />
                Lead Clicks
              </TabsTrigger>
              <TabsTrigger value="traffic" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Web Traffic
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emails" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="emails" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Email Signups"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="clicks" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Lead Clicks"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="traffic" className="space-y-4">
              {hasTrafficData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="traffic" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      name="Sessions"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Globe className="h-12 w-12 mx-auto mb-4" />
                    <p>Google Analytics not connected</p>
                    <p className="text-sm">Connect GA4 to see daily traffic data</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Email Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold">{totalEmailSignups}</span>
              {emailStats?.growthRate && parseFloat(emailStats.growthRate) !== 0 && (
                <Badge variant="outline" className={parseFloat(emailStats.growthRate) > 0 ? "text-green-600" : "text-red-600"}>
                  {parseFloat(emailStats.growthRate) > 0 ? "+" : ""}{emailStats.growthRate}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Active subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Lead Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold">{totalLeadClicks}</span>
              <Badge variant="outline">
                All time
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              From all short links
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold">
                {totalLeadClicks > 0 ? `${((totalEmailSignups / totalLeadClicks) * 100).toFixed(1)}%` : "—"}
              </span>
              <Badge variant="outline">
                Clicks → Signups
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Lead magnet effectiveness
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminPageWrapper>
  );
}