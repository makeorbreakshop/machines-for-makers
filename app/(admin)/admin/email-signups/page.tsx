export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailSignupsChart } from './email-signups-chart';
import { SourceBreakdownChart } from './source-breakdown-chart';
import { RecentSignupsTable } from './recent-signups-table';
import { Users, TrendingUp, Calendar, Mail } from 'lucide-react';

export default async function EmailSignupsPage() {
  const supabase = createServerClient();
  
  // Get total subscribers
  const { count: totalSubscribers } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true });
  
  // Get subscribers from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count: monthlySubscribers } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString());
  
  // Get subscribers from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { count: weeklySubscribers } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString());
  
  // Get today's subscribers
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: todaySubscribers } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());
  
  // Calculate growth rate (last 30 days vs previous 30 days)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const { count: previousMonthSubscribers } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());
  
  const growthRate = previousMonthSubscribers && previousMonthSubscribers > 0
    ? ((monthlySubscribers! - previousMonthSubscribers) / previousMonthSubscribers * 100).toFixed(1)
    : '0';
  
  // Get chart data
  const { data: chartData } = await supabase
    .from('email_subscribers')
    .select('created_at, source')
    .order('created_at', { ascending: true });
  
  // Get source breakdown
  const { data: sourceData } = await supabase
    .from('email_subscribers')
    .select('source');
  
  // Get recent signups
  const { data: recentSignups } = await supabase
    .from('email_subscribers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Signups</h1>
        <p className="text-muted-foreground mt-2">
          Track and analyze your email signup performance across different sources
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{growthRate}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days vs previous 30</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklySubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">New signups today</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Signup Trend</CardTitle>
            <CardDescription>Daily email signups over time</CardDescription>
          </CardHeader>
          <CardContent>
            <EmailSignupsChart data={chartData || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Breakdown</CardTitle>
            <CardDescription>Where your signups come from</CardDescription>
          </CardHeader>
          <CardContent>
            <SourceBreakdownChart data={sourceData || []} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
          <CardDescription>Latest email subscribers</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentSignupsTable signups={recentSignups || []} />
        </CardContent>
      </Card>
    </div>
  );
}