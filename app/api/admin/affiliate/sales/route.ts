import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    
    const programId = searchParams.get('program_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const machineId = searchParams.get('machine_id');
    
    // Build query - simplified to avoid join issues
    let query = supabase
      .from('affiliate_sales')
      .select('*')
      .order('order_date', { ascending: false });
    
    // Apply filters
    if (programId) {
      query = query.eq('program_id', programId);
    }
    
    if (startDate) {
      query = query.gte('order_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('order_date', endDate);
    }
    
    if (machineId) {
      query = query.eq('machine_id', machineId);
    }
    
    const { data: sales, error } = await query;
    
    if (error) {
      console.error('Error fetching affiliate sales:', error);
      return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
    }
    
    // Calculate aggregates
    const totalSales = sales?.reduce((sum, sale) => sum + (sale.total_sales || 0), 0) || 0;
    const totalCommission = sales?.reduce((sum, sale) => sum + (sale.commission_amount || 0), 0) || 0;
    const totalOrders = sales?.length || 0;
    
    // Group by machine
    const machineStats = new Map();
    sales?.forEach(sale => {
      if (sale.machine_id) {
        const stats = machineStats.get(sale.machine_id) || {
          machine_id: sale.machine_id,
          machine_name: 'Machine ' + sale.machine_id.substring(0, 8), // Temporary until we add joins back
          machine_price: 0,
          total_sales: 0,
          total_commission: 0,
          order_count: 0
        };
        
        stats.total_sales += sale.total_sales || 0;
        stats.total_commission += sale.commission_amount || 0;
        stats.order_count += 1;
        
        machineStats.set(sale.machine_id, stats);
      }
    });
    
    // Group by program
    const programStats = new Map();
    sales?.forEach(sale => {
      if (sale.program_id) {
        const stats = programStats.get(sale.program_id) || {
          program_id: sale.program_id,
          program_name: 'xTool Affiliate Program', // Temporary until we add joins back
          brand_name: 'xTool',
          commission_rate: 0.06,
          total_sales: 0,
          total_commission: 0,
          order_count: 0
        };
        
        stats.total_sales += sale.total_sales || 0;
        stats.total_commission += sale.commission_amount || 0;
        stats.order_count += 1;
        
        programStats.set(sale.program_id, stats);
      }
    });
    
    // Monthly breakdown
    const monthlyStats = new Map();
    sales?.forEach(sale => {
      if (sale.order_date) {
        const date = new Date(sale.order_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const stats = monthlyStats.get(monthKey) || {
          month: monthKey,
          total_sales: 0,
          total_commission: 0,
          order_count: 0
        };
        
        stats.total_sales += sale.total_sales || 0;
        stats.total_commission += sale.commission_amount || 0;
        stats.order_count += 1;
        
        monthlyStats.set(monthKey, stats);
      }
    });
    
    return NextResponse.json({
      sales: sales || [],
      aggregates: {
        total_sales: totalSales,
        total_commission: totalCommission,
        total_orders: totalOrders,
        average_order_value: totalOrders > 0 ? totalSales / totalOrders : 0
      },
      machine_stats: Array.from(machineStats.values()).sort((a, b) => b.total_sales - a.total_sales),
      program_stats: Array.from(programStats.values()).sort((a, b) => b.total_sales - a.total_sales),
      monthly_stats: Array.from(monthlyStats.values()).sort((a, b) => a.month.localeCompare(b.month))
    });
    
  } catch (error) {
    console.error('Error in affiliate sales API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}