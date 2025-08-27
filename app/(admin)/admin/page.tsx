import { requireAdminAuth } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase/server";
import { 
  Package, 
  Building2, 
  Tag, 
  MessageSquare,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Mail
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

interface StatCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
  icon: React.ElementType;
  href?: string;
}

function MetricCard({ stat }: { stat: StatCard }) {
  const Icon = stat.icon;
  const TrendIcon = stat.change?.trend === 'up' ? ArrowUp : ArrowDown;
  
  const content = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {stat.title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
        {stat.change && (
          <div className={cn(
            "flex items-center gap-1 text-xs mt-1",
            stat.change.trend === 'up' 
              ? "text-green-600 dark:text-green-500" 
              : "text-red-600 dark:text-red-500"
          )}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(stat.change.value)}%</span>
            <span className="text-gray-500 dark:text-gray-400">vs last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (stat.href) {
    return <Link href={stat.href}>{content}</Link>;
  }
  
  return content;
}

export default async function AdminDashboard() {
  // Check authentication
  await requireAdminAuth();
  
  const supabase = await createServerClient();

  // Fetch all counts in parallel
  const [machinesResult, brandsResult, categoriesResult, reviewsResult] = await Promise.allSettled([
    supabase.from("machines").select("id", { count: "exact", head: true }),
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
  ]);
  
  const machinesCount = machinesResult.status === 'fulfilled' ? (machinesResult.value.count || 0) : 0;
  const brandsCount = brandsResult.status === 'fulfilled' ? (brandsResult.value.count || 0) : 0;
  const categoriesCount = categoriesResult.status === 'fulfilled' ? (categoriesResult.value.count || 0) : 0;
  const reviewsCount = reviewsResult.status === 'fulfilled' ? (reviewsResult.value.count || 0) : 0;

  // Get real email subscriber stats FIRST (before using in stats array)
  let emailStats = {
    total: 0,
    monthly: 0,
    weekly: 0,
    today: 0,
    growthRate: 0
  };
  
  try {
    const { data: subscribers } = await supabase
      .from('email_subscribers')
      .select('created_at, status')
      .or('status.neq.unsubscribed,status.is.null');
    
    if (subscribers) {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      emailStats.total = subscribers.length;
      emailStats.today = subscribers.filter(s => new Date(s.created_at) >= dayAgo).length;
      emailStats.weekly = subscribers.filter(s => new Date(s.created_at) >= weekAgo).length;
      emailStats.monthly = subscribers.filter(s => new Date(s.created_at) >= monthAgo).length;
      
      // Calculate growth rate (current month vs previous month)
      const lastMonthCount = subscribers.filter(s => {
        const created = new Date(s.created_at);
        return created >= twoMonthsAgo && created < monthAgo;
      }).length;
      
      if (lastMonthCount > 0) {
        emailStats.growthRate = Math.round(((emailStats.monthly - lastMonthCount) / lastMonthCount) * 100);
      } else {
        emailStats.growthRate = emailStats.monthly > 0 ? 100 : 0;
      }
    }
  } catch (error) {
    console.error("Error fetching email stats:", error);
  }

  // Get week-over-week changes
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  let weeklyMachinesCount = 0;
  let weeklyReviewsCount = 0;
  
  try {
    const [machinesWeek, reviewsWeek] = await Promise.all([
      supabase
        .from("machines")
        .select("id", { count: "exact", head: true })
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .gte('created_at', oneWeekAgo.toISOString())
    ]);
    
    weeklyMachinesCount = machinesWeek.count || 0;
    weeklyReviewsCount = reviewsWeek.count || 0;
  } catch (error) {
    console.error("Error fetching weekly counts:", error);
  }

  // Now create stats array with emailStats available
  const stats: StatCard[] = [
    {
      title: "Total Machines",
      value: machinesCount,
      change: weeklyMachinesCount > 0 ? {
        value: Math.round((weeklyMachinesCount / Math.max(1, machinesCount)) * 100),
        trend: 'up'
      } : undefined,
      icon: Package,
      href: "/admin/machines"
    },
    {
      title: "Email Subscribers",
      value: emailStats.total,
      change: emailStats.growthRate !== 0 ? {
        value: Math.abs(emailStats.growthRate),
        trend: emailStats.growthRate > 0 ? 'up' : 'down'
      } : undefined,
      icon: Mail,
      href: "/admin/email-signups"
    },
    {
      title: "User Reviews",
      value: reviewsCount,
      change: weeklyReviewsCount > 0 ? {
        value: Math.round((weeklyReviewsCount / Math.max(1, reviewsCount)) * 100),
        trend: 'up'
      } : undefined,
      icon: MessageSquare,
      href: "/admin/machines?tab=reviews"
    },
    {
      title: "Active Brands",
      value: brandsCount,
      icon: Building2,
      href: "/admin/machines?tab=brands"
    },
  ];

  // Get real click stats from short links
  let totalClicks = 0;
  let humanClicks = 0;
  try {
    const { data: linkStats } = await supabase
      .from('short_links_stats')
      .select('total_clicks, human_clicks')
      .eq('active', true);
    
    if (linkStats) {
      totalClicks = linkStats.reduce((sum, stat) => sum + (Number(stat.total_clicks) || 0), 0);
      humanClicks = linkStats.reduce((sum, stat) => sum + (Number(stat.human_clicks) || 0), 0);
    }
  } catch (error) {
    console.error("Error fetching link stats:", error);
  }

  // Get recent machines for activity feed
  const recentActivity: any[] = [];
  try {
    const { data: recentMachines } = await supabase
      .from('machines')
      .select('machine_name, created_at')
      .order('created_at', { ascending: false })
      .limit(2);
    
    const { data: recentReviews } = await supabase
      .from('reviews')
      .select('rating, created_at, machines!inner(machine_name)')
      .order('created_at', { ascending: false })
      .limit(2);

    // Format recent activities
    if (recentMachines) {
      recentMachines.forEach((machine, i) => {
        const createdDate = new Date(machine.created_at);
        const hoursAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);
        
        recentActivity.push({
          id: `machine-${i}`,
          type: 'machine',
          action: 'New machine added',
          item: machine.machine_name,
          time: daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago` : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
        });
      });
    }

    if (recentReviews) {
      recentReviews.forEach((review: any, i) => {
        const createdDate = new Date(review.created_at);
        const hoursAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);
        
        recentActivity.push({
          id: `review-${i}`,
          type: 'review',
          action: 'Review submitted',
          item: `${review.rating}-star for ${review.machines?.machine_name || 'Unknown'}`,
          time: daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago` : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
        });
      });
    }
  } catch (error) {
    console.error("Error fetching recent activity:", error);
  }

  // Add placeholder if no real activity
  if (recentActivity.length === 0) {
    recentActivity.push(
      { id: 1, type: 'machine', action: 'No recent activity', item: 'Add your first machine', time: 'Get started' }
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Monitor your content and track performance metrics.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard key={stat.title} stat={stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across your platform</CardDescription>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className={cn(
                    "mt-0.5 rounded-full p-1",
                    activity.type === 'machine' && "bg-blue-100 dark:bg-blue-900/20",
                    activity.type === 'review' && "bg-amber-100 dark:bg-amber-900/20",
                    activity.type === 'user' && "bg-green-100 dark:bg-green-900/20",
                    activity.type === 'brand' && "bg-purple-100 dark:bg-purple-900/20"
                  )}>
                    {activity.type === 'machine' && <Package className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
                    {activity.type === 'review' && <MessageSquare className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
                    {activity.type === 'user' && <Users className="h-3 w-3 text-green-600 dark:text-green-400" />}
                    {activity.type === 'brand' && <Building2 className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.item}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.time}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Performance</CardTitle>
              <CardDescription>Link clicks and engagement metrics</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/admin/analytics">View detailed analytics</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Total Link Clicks</p>
                  <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">All time</p>
                </div>
                {totalClicks > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Human Clicks</p>
                  <p className="text-2xl font-bold">{humanClicks.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Filtered bot traffic</p>
                </div>
                {humanClicks > 0 && totalClicks > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-500">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {Math.round((humanClicks / totalClicks) * 100)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email Subscribers</p>
                  <p className="text-2xl font-bold">{emailStats.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    {emailStats.today > 0 ? `+${emailStats.today} today` : 'Active subscribers'}
                  </p>
                </div>
                {emailStats.growthRate !== 0 && (
                  <div className={cn(
                    "flex items-center gap-1",
                    emailStats.growthRate > 0 
                      ? "text-green-600 dark:text-green-500" 
                      : "text-red-600 dark:text-red-500"
                  )}>
                    {emailStats.growthRate > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {Math.abs(emailStats.growthRate)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/machines/new">
                <Package className="mr-2 h-4 w-4" />
                Add Machine
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/discovery-unified">
                <Activity className="mr-2 h-4 w-4" />
                Review Discoveries
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/email-signups">
                <Users className="mr-2 h-4 w-4" />
                Email Signups
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/tools/price-tracker">
                <DollarSign className="mr-2 h-4 w-4" />
                Update Prices
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}