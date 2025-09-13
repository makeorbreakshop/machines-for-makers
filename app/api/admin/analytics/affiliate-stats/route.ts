export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Get total sales
    const { data: allSales, count: totalSales } = await supabase
      .from('affiliate_sales')
      .select('*', { count: 'exact' });

    // Calculate total revenue and commissions
    const totalRevenue = allSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const totalCommissions = allSales?.reduce((sum, sale) => sum + (sale.commission_amount || 0), 0) || 0;

    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todaySales } = await supabase
      .from('affiliate_sales')
      .select('*')
      .gte('created_at', today.toISOString());

    const todayRevenue = todaySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const todayCommissions = todaySales?.reduce((sum, sale) => sum + (sale.commission_amount || 0), 0) || 0;

    // Get last 7 days sales
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: last7DaysSales } = await supabase
      .from('affiliate_sales')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString());

    const last7DaysRevenue = last7DaysSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const last7DaysCommissions = last7DaysSales?.reduce((sum, sale) => sum + (sale.commission_amount || 0), 0) || 0;

    // Get previous 7 days for comparison
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const { data: prev7DaysSales } = await supabase
      .from('affiliate_sales')
      .select('*')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString());

    const prev7DaysRevenue = prev7DaysSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    
    // Calculate percentage change
    const revenueChange = prev7DaysRevenue > 0 
      ? Math.round(((last7DaysRevenue - prev7DaysRevenue) / prev7DaysRevenue) * 100)
      : 0;

    // Create daily revenue data for chart
    const dailyRevenue: Record<string, number> = {};
    const dailyCommissions: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyRevenue[dateStr] = 0;
      dailyCommissions[dateStr] = 0;
    }

    // Fill in actual data
    if (last7DaysSales) {
      last7DaysSales.forEach(sale => {
        const dateStr = sale.created_at.split('T')[0];
        if (dailyRevenue.hasOwnProperty(dateStr)) {
          dailyRevenue[dateStr] += sale.total_amount || 0;
          dailyCommissions[dateStr] += sale.commission_amount || 0;
        }
      });
    }

    return NextResponse.json({
      stats: {
        totalSales: totalSales || 0,
        totalRevenue: totalRevenue,
        totalCommissions: totalCommissions,
        todayRevenue: todayRevenue,
        todayCommissions: todayCommissions,
        todaySales: todaySales?.length || 0,
        last7DaysRevenue: last7DaysRevenue,
        last7DaysCommissions: last7DaysCommissions,
        last7DaysSales: last7DaysSales?.length || 0,
        revenueChange: revenueChange
      },
      chartData: Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        revenue,
        commissions: dailyCommissions[date] || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliate statistics' },
      { status: 500 }
    );
  }
}