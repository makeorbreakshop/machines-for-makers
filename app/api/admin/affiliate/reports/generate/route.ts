export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import * as z from 'zod';

const generateReportSchema = z.object({
  program_id: z.string().uuid(),
  period_type: z.enum(['quarter', 'month', 'custom']),
  period_value: z.string().min(1),
  include_unmatched: z.boolean().default(true),
  include_drafts: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = generateReportSchema.parse(body);
    
    const supabase = createServiceClient();
    
    // Verify the program exists
    const { data: program, error: programError } = await supabase
      .from('affiliate_programs')
      .select(`
        *,
        brands(Name, Slug)
      `)
      .eq('id', validatedData.program_id)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { message: 'Invalid affiliate program' },
        { status: 400 }
      );
    }

    // Parse period to get date range
    const dateRange = parsePeriod(validatedData.period_type, validatedData.period_value);
    if (!dateRange) {
      return NextResponse.json(
        { message: 'Invalid period format' },
        { status: 400 }
      );
    }

    // Build status filter
    const statusFilter = validatedData.include_drafts 
      ? ['pending', 'approved', 'paid']
      : ['approved', 'paid'];

    // Fetch sales data for the period
    const { data: salesData, error: salesError } = await supabase
      .from('affiliate_sales')
      .select(`
        *,
        machines(name, slug, image_url),
        affiliate_programs(
          name,
          commission_rate,
          brands(name, slug)
        )
      `)
      .eq('program_id', validatedData.program_id)
      .gte('order_date', dateRange.start)
      .lte('order_date', dateRange.end)
      .in('status', statusFilter)
      .order('order_date', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales data:', salesError);
      return NextResponse.json(
        { message: 'Failed to fetch sales data' },
        { status: 500 }
      );
    }

    // Process the data to generate report metrics
    const reportData = processReportData(salesData || [], validatedData.include_unmatched);

    // Create a simple report URL (for now, just return the data)
    // In a full implementation, you'd save this to a reports table and generate a public URL
    const reportSlug = generateReportSlug(program.brands.Slug, validatedData.period_value);
    
    // For demo purposes, return the processed data
    // In production, you'd save this and return a public URL
    return NextResponse.json({
      message: 'Report generated successfully',
      report_url: `/partners/${program.brands.Slug}/${reportSlug}`,
      report_data: reportData,
      period: {
        type: validatedData.period_type,
        value: validatedData.period_value,
        start: dateRange.start,
        end: dateRange.end,
      },
      program: {
        id: program.id,
        name: program.name,
        brand: program.brands.Name,
        commission_rate: program.commission_rate,
      },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function parsePeriod(type: string, value: string): { start: string; end: string } | null {
  try {
    if (type === 'quarter') {
      // Format: Q1-2024, Q2-2024, etc.
      const match = value.match(/Q(\d)-(\d{4})/);
      if (!match) return null;
      
      const quarter = parseInt(match[1]);
      const year = parseInt(match[2]);
      
      const quarterMap = {
        1: { start: `${year}-01-01`, end: `${year}-03-31` },
        2: { start: `${year}-04-01`, end: `${year}-06-30` },
        3: { start: `${year}-07-01`, end: `${year}-09-30` },
        4: { start: `${year}-10-01`, end: `${year}-12-31` },
      };
      
      return quarterMap[quarter as keyof typeof quarterMap] || null;
      
    } else if (type === 'month') {
      // Format: 2024-01, 2024-02, etc.
      const match = value.match(/(\d{4})-(\d{2})/);
      if (!match) return null;
      
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

function processReportData(salesData: any[], includeUnmatched: boolean) {
  // Separate matched and unmatched sales
  const matchedSales = salesData.filter(sale => sale.machine_id);
  const unmatchedSales = salesData.filter(sale => !sale.machine_id);
  
  // Calculate totals
  const totalRevenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.total_sales), 0);
  const totalCommission = salesData.reduce((sum, sale) => sum + parseFloat(sale.commission_amount), 0);
  const totalOrders = salesData.length;
  
  // Group by machine for matched sales
  const machineMetrics = matchedSales.reduce((acc: any, sale) => {
    const machineId = sale.machine_id;
    const machineName = sale.machines?.name || 'Unknown Machine';
    
    if (!acc[machineId]) {
      acc[machineId] = {
        machine_id: machineId,
        machine_name: machineName,
        machine_slug: sale.machines?.slug || '',
        machine_image: sale.machines?.image_url || '',
        orders: 0,
        revenue: 0,
        commission: 0,
        avg_order_value: 0,
      };
    }
    
    acc[machineId].orders += 1;
    acc[machineId].revenue += parseFloat(sale.total_sales);
    acc[machineId].commission += parseFloat(sale.commission_amount);
    
    return acc;
  }, {});
  
  // Calculate average order values
  Object.values(machineMetrics).forEach((machine: any) => {
    machine.avg_order_value = machine.orders > 0 ? machine.revenue / machine.orders : 0;
  });
  
  // Sort machines by revenue
  const topMachines = Object.values(machineMetrics)
    .sort((a: any, b: any) => b.revenue - a.revenue);
  
  // Unmatched products summary
  const unmatchedMetrics = includeUnmatched ? {
    orders: unmatchedSales.length,
    revenue: unmatchedSales.reduce((sum, sale) => sum + parseFloat(sale.total_sales), 0),
    commission: unmatchedSales.reduce((sum, sale) => sum + parseFloat(sale.commission_amount), 0),
    products: [...new Set(unmatchedSales.map(sale => sale.raw_product_string).filter(Boolean))],
  } : null;
  
  return {
    summary: {
      total_revenue: totalRevenue,
      total_commission: totalCommission,
      total_orders: totalOrders,
      matched_orders: matchedSales.length,
      unmatched_orders: unmatchedSales.length,
    },
    machines: topMachines,
    unmatched: unmatchedMetrics,
    period_analysis: {
      // Could add more sophisticated analysis here
      best_performing_machine: topMachines[0]?.machine_name || null,
      avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    }
  };
}

function generateReportSlug(brandSlug: string, period: string): string {
  // Generate a URL-friendly slug for the report
  const periodSlug = period.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits for uniqueness
  
  return `${periodSlug}-${timestamp}`;
}