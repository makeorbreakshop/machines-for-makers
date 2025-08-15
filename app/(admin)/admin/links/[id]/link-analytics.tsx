'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Edit,
  BarChart3,
  Users,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Link as LinkIcon,
} from 'lucide-react';
import { formatDistanceToNow, format, subDays, startOfDay } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

interface LinkClick {
  id: string;
  short_link_id: string;
  clicked_at: string;
  ip_hash?: string;
  user_agent?: string;
  referer?: string;
  is_bot: boolean;
  country?: string;
  city?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface LinkStats {
  short_link_id: string;
  total_clicks: number;
  unique_visitors: number;
  bot_clicks: number;
  human_clicks: number;
  top_country?: string;
  top_referer?: string;
  last_click_at?: string;
}

interface LinkAnalyticsProps {
  link: any;
  clicks: LinkClick[];
  stats: LinkStats | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function LinkAnalytics({ link, clicks, stats }: LinkAnalyticsProps) {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState(7); // days

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getShortUrl = (slug: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://machinesformakers.com';
    return `${baseUrl}/go/${slug}`;
  };

  // Prepare data for charts
  const clicksByDay = () => {
    const days = Array.from({ length: timeRange }, (_, i) => {
      const date = subDays(new Date(), i);
      return {
        date: format(startOfDay(date), 'MMM dd'),
        clicks: 0,
      };
    }).reverse();

    const recentClicks = clicks.filter(click => {
      const clickDate = new Date(click.clicked_at);
      const cutoffDate = subDays(new Date(), timeRange);
      return clickDate >= cutoffDate;
    });

    recentClicks.forEach(click => {
      const clickDate = format(new Date(click.clicked_at), 'MMM dd');
      const dayIndex = days.findIndex(day => day.date === clickDate);
      if (dayIndex !== -1) {
        days[dayIndex].clicks++;
      }
    });

    return days;
  };

  const clicksBySource = () => {
    const sources: Record<string, number> = {};
    clicks.forEach(click => {
      const source = click.utm_source || 'Direct';
      sources[source] = (sources[source] || 0) + 1;
    });

    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const clicksByCountry = () => {
    const countries: Record<string, number> = {};
    clicks.forEach(click => {
      if (click.country) {
        countries[click.country] = (countries[click.country] || 0) + 1;
      }
    });

    return Object.entries(countries)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const deviceStats = () => {
    let mobile = 0;
    let desktop = 0;
    let bot = 0;

    clicks.forEach(click => {
      if (click.is_bot) {
        bot++;
      } else if (click.user_agent?.toLowerCase().includes('mobile')) {
        mobile++;
      } else {
        desktop++;
      }
    });

    return [
      { name: 'Desktop', value: desktop },
      { name: 'Mobile', value: mobile },
      { name: 'Bot', value: bot },
    ].filter(item => item.value > 0);
  };

  const recentClicks = clicks.slice(0, 10);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/admin/links" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Links
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LinkIcon className="h-8 w-8" />
            {link.slug}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={link.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {link.active ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-gray-600">
              Created {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => copyToClipboard(getShortUrl(link.slug))}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy URL
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/links/${link.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* URL Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Link Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Short URL</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {getShortUrl(link.slug)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(getShortUrl(link.slug))}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Destination</p>
              <div className="flex items-center gap-2">
                <span className="text-sm">{link.destination_url}</span>
                <a
                  href={link.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            {link.campaign && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Campaign</p>
                <p className="text-sm">{link.campaign}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Clicks</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              {stats?.total_clicks || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unique Visitors</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              {stats?.unique_visitors || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Last Click</CardDescription>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              {stats?.last_click_at 
                ? formatDistanceToNow(new Date(stats.last_click_at), { addSuffix: true })
                : 'Never'
              }
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Top Country</CardDescription>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-400" />
              {stats?.top_country || 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="recent">Recent Clicks</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Click Timeline</CardTitle>
              <CardDescription>Clicks over the last {timeRange} days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clicksByDay()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Where your clicks are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clicksBySource()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Clicks by country</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clicksByCountry()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={entry => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {clicksByCountry().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Device Types</CardTitle>
              <CardDescription>Breakdown by device category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceStats()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={entry => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deviceStats().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Clicks</CardTitle>
              <CardDescription>Last 10 clicks on this link</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentClicks.map((click) => (
                      <TableRow key={click.id}>
                        <TableCell>
                          {formatDistanceToNow(new Date(click.clicked_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          {click.utm_source || 'Direct'}
                        </TableCell>
                        <TableCell>
                          {click.country || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {click.is_bot ? (
                            <Badge variant="outline">Bot</Badge>
                          ) : click.user_agent?.toLowerCase().includes('mobile') ? (
                            <div className="flex items-center gap-1">
                              <Smartphone className="h-3 w-3" />
                              Mobile
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              Desktop
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={click.is_bot ? 'secondary' : 'default'}>
                            {click.is_bot ? 'Bot' : 'Human'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentClicks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No clicks yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}