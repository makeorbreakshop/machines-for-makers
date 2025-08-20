export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Check authentication using cookie-based auth
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    // Get days parameter from query
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    // Get total subscribers
    const { count: totalSubscribers } = await supabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true });
    
    // Get subscribers from specified date range
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - days);
    
    const { count: rangeSubscribers } = await supabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', rangeStart.toISOString());
    
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
    
    // Calculate growth rate (current period vs previous period)
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
    
    const { count: previousPeriodSubscribers } = await supabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', rangeStart.toISOString());
    
    const growthRate = previousPeriodSubscribers && previousPeriodSubscribers > 0
      ? ((rangeSubscribers! - previousPeriodSubscribers) / previousPeriodSubscribers * 100).toFixed(1)
      : '0';
    
    // Get chart data for specified date range
    const { data: chartData } = await supabase
      .from('email_subscribers')
      .select('created_at, source')
      .gte('created_at', rangeStart.toISOString())
      .order('created_at', { ascending: true });
    
    // Get source breakdown for specified date range
    const { data: sourceData } = await supabase
      .from('email_subscribers')
      .select('source')
      .gte('created_at', rangeStart.toISOString());
    
    // Get recent signups (last 10)
    const { data: recentSignups } = await supabase
      .from('email_subscribers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get lead magnet mappings for proper labels
    const { data: leadMagnets } = await supabase
      .from('lead_magnets')
      .select('slug, name');
    
    // Create a mapping of slugs to names
    const leadMagnetLabels = leadMagnets?.reduce((acc, lm) => {
      acc[lm.slug] = lm.name;
      return acc;
    }, {} as Record<string, string>) || {};

    return NextResponse.json({
      stats: {
        totalSubscribers,
        monthlySubscribers: rangeSubscribers,
        weeklySubscribers,
        todaySubscribers,
        growthRate
      },
      chartData,
      sourceData,
      recentSignups,
      leadMagnetLabels
    });

  } catch (error) {
    console.error('Email signups API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}