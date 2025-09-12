import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = getAdminCookie(request);
    if (!adminCookie || !validateAdminCookie(adminCookie)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createServiceClient();
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
    
    // Fetch machine names
    const machineIds = [...new Set(sales?.map(s => s.machine_id).filter(Boolean))];
    let machineNames: Record<string, string> = {};
    
    if (machineIds.length > 0) {
      const { data: machines } = await supabase
        .from('machines')
        .select('id, "Machine Name"')
        .in('id', machineIds);
      
      machineNames = machines?.reduce((acc, m) => {
        acc[m.id] = m['Machine Name'];
        return acc;
      }, {} as Record<string, string>) || {};
    }
    
    // Fetch program names
    const programIds = [...new Set(sales?.map(s => s.program_id).filter(Boolean))];
    let programInfo: Record<string, any> = {};
    
    if (programIds.length > 0) {
      const { data: programs } = await supabase
        .from('affiliate_programs')
        .select('id, name, commission_rate, brands("Name")')
        .in('id', programIds);
      
      programInfo = programs?.reduce((acc, p) => {
        acc[p.id] = {
          name: p.name,
          commission_rate: p.commission_rate,
          brand_name: p.brands?.Name || 'Unknown'
        };
        return acc;
      }, {} as Record<string, any>) || {};
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
          machine_name: machineNames[sale.machine_id] || `Machine ${sale.machine_id.substring(0, 8)}`,
          machine_price: sale.unit_price || 0,
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
        const pInfo = programInfo[sale.program_id];
        const stats = programStats.get(sale.program_id) || {
          program_id: sale.program_id,
          program_name: pInfo?.name || 'Unknown Program',
          brand_name: pInfo?.brand_name || 'Unknown',
          commission_rate: pInfo?.commission_rate || 0,
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
    
    // Add machine names to individual sales
    const salesWithMachineNames = sales?.map(sale => ({
      ...sale,
      machine_name: sale.machine_id ? machineNames[sale.machine_id] || null : null
    })) || [];
    
    return NextResponse.json({
      sales: salesWithMachineNames,
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