import { createServiceClient } from '@/lib/supabase/server';

interface ReportPeriod {
  quarter: string; // e.g., 'Q4'
  year: number;    // e.g., 2024
  startDate: string;
  endDate: string;
}

interface MachineMetric {
  machine_id: string;
  machine_name: string;
  machine_slug: string;
  total_sales: number;
  total_orders: number;
  commission_amount: number;
  average_order_value: number;
}

interface TrafficSource {
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  total_clicks: number;
  total_sales: number;
  conversion_rate: number;
}

// Video metrics are now fetched in real-time from the report page
// to ensure up-to-date statistics

export function getQuarterDates(quarter: string, year: number): ReportPeriod {
  const quarterMap: Record<string, { start: string; end: string }> = {
    'Q1': { start: `${year}-01-01`, end: `${year}-03-31` },
    'Q2': { start: `${year}-04-01`, end: `${year}-06-30` },
    'Q3': { start: `${year}-07-01`, end: `${year}-09-30` },
    'Q4': { start: `${year}-10-01`, end: `${year}-12-31` },
  };

  const dates = quarterMap[quarter];
  if (!dates) {
    throw new Error(`Invalid quarter: ${quarter}`);
  }

  return {
    quarter,
    year,
    startDate: dates.start,
    endDate: dates.end,
  };
}

export async function generateAffiliateReport(
  programId: string,
  period: ReportPeriod,
  title?: string
) {
  const supabase = createServiceClient();

  // Get program details
  const { data: program, error: programError } = await supabase
    .from('affiliate_programs')
    .select('*, brands(Name, Slug)')
    .eq('id', programId)
    .single();

  if (programError || !program) {
    throw new Error('Program not found');
  }

  // Generate slug for the report
  const slug = `${program.brands?.Slug || 'report'}-${period.quarter.toLowerCase()}-${period.year}`;
  const reportTitle = title || `${period.quarter} ${period.year} ${program.name} Performance Report`;

  // Get sales data for the period
  const { data: salesData, error: salesError } = await supabase
    .from('affiliate_sales')
    .select(`
      *,
      machines(id, "Machine Name", "Internal link")
    `)
    .eq('program_id', programId)
    .gte('order_date', period.startDate)
    .lte('order_date', period.endDate);

  if (salesError) {
    throw new Error(`Failed to fetch sales data: ${salesError.message}`);
  }

  // Calculate machine metrics
  const machineMetricsMap = new Map<string, MachineMetric>();
  const unmatchedProducts: any[] = [];

  for (const sale of salesData || []) {
    if (sale.machine_id && sale.machines) {
      const key = sale.machine_id;
      const existing = machineMetricsMap.get(key) || {
        machine_id: sale.machine_id,
        machine_name: sale.machines?.['Machine Name'] || 'Unknown Machine',
        machine_slug: sale.machines?.['Internal link'] || '',
        total_sales: 0,
        total_orders: 0,
        commission_amount: 0,
        average_order_value: 0,
      };

      existing.total_sales += parseFloat(sale.total_sales);
      existing.total_orders += 1;
      existing.commission_amount += parseFloat(sale.commission_amount);
      
      machineMetricsMap.set(key, existing);
    } else {
      // Track unmatched products
      unmatchedProducts.push({
        product_name: sale.raw_product_string || 'Unknown Product',
        total_sales: parseFloat(sale.total_sales),
        commission: parseFloat(sale.commission_amount),
        order_number: sale.order_number,
      });
    }
  }

  // Calculate averages
  const machineMetrics = Array.from(machineMetricsMap.values()).map(metric => ({
    ...metric,
    average_order_value: metric.total_orders > 0 ? metric.total_sales / metric.total_orders : 0,
  }));

  // Sort by total sales descending
  machineMetrics.sort((a, b) => b.total_sales - a.total_sales);

  // Get click data for traffic sources
  const { data: clickData } = await supabase
    .from('link_clicks')
    .select(`
      utm_source,
      utm_medium,
      short_links!inner(
        machine_id,
        utm_source as default_source
      )
    `)
    .gte('created_at', period.startDate)
    .lte('created_at', period.endDate);

  // Calculate traffic source metrics
  const trafficSourceMap = new Map<string, TrafficSource>();
  
  for (const click of clickData || []) {
    const source = click.utm_source || click.short_links?.default_source || 'direct';
    const key = `${source}_${click.utm_medium || 'none'}`;
    
    const existing = trafficSourceMap.get(key) || {
      source: source,
      utm_source: click.utm_source,
      utm_medium: click.utm_medium,
      total_clicks: 0,
      total_sales: 0,
      conversion_rate: 0,
    };
    
    existing.total_clicks += 1;
    trafficSourceMap.set(key, existing);
  }

  // Match sales to traffic sources (simplified - you might want to enhance this)
  for (const sale of salesData || []) {
    const source = sale.utm_source || 'direct';
    const key = `${source}_${sale.utm_medium || 'none'}`;
    const existing = trafficSourceMap.get(key);
    if (existing) {
      existing.total_sales += parseFloat(sale.total_sales);
    }
  }

  // Calculate conversion rates
  const trafficSources = Array.from(trafficSourceMap.values()).map(source => ({
    ...source,
    conversion_rate: source.total_clicks > 0 ? (source.total_sales / source.total_clicks) * 100 : 0,
  }));

  // Calculate totals
  const totalRevenue = salesData?.reduce((sum, sale) => sum + parseFloat(sale.total_sales), 0) || 0;
  const totalCommission = salesData?.reduce((sum, sale) => sum + parseFloat(sale.commission_amount), 0) || 0;
  const totalOrders = salesData?.length || 0;
  const totalClicks = clickData?.length || 0;

  // Check if report already exists
  const { data: existingReport } = await supabase
    .from('affiliate_reports')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existingReport) {
    // Update existing report
    const { data: updatedReport, error: updateError } = await supabase
      .from('affiliate_reports')
      .update({
        title: reportTitle,
        period: `${period.quarter} ${period.year}`,
        start_date: period.startDate,
        end_date: period.endDate,
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        total_commission: totalCommission,
        total_clicks: totalClicks,
        machine_metrics: machineMetrics,
        traffic_sources: trafficSources,
        unmatched_products: unmatchedProducts,
        share_url: `/partners/${program.brands?.Slug || 'report'}/${slug}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingReport.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    return updatedReport;
  } else {
    // Create new report
    const { data: newReport, error: createError } = await supabase
      .from('affiliate_reports')
      .insert({
        title: reportTitle,
        slug,
        program_id: programId,
        period: `${period.quarter} ${period.year}`,
        start_date: period.startDate,
        end_date: period.endDate,
        status: 'draft',
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        total_commission: totalCommission,
        total_clicks: totalClicks,
        machine_metrics: machineMetrics,
        traffic_sources: trafficSources,
        unmatched_products: unmatchedProducts,
        share_url: `/partners/${program.brands?.Slug || 'report'}/${slug}`,
        is_public: false,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create report: ${createError.message}`);
    }

    return newReport;
  }
}

export async function getAffiliateReports(programId?: string) {
  const supabase = createServiceClient();
  
  let query = supabase
    .from('affiliate_reports')
    .select(`
      *,
      affiliate_programs(
        name,
        brands(Name, Slug)
      )
    `)
    .order('created_at', { ascending: false });

  if (programId) {
    query = query.eq('program_id', programId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`);
  }

  return data;
}

export async function publishReport(reportId: string) {
  const supabase = createServiceClient();
  
  const { data, error } = await supabase
    .from('affiliate_reports')
    .update({
      status: 'published',
      is_public: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to publish report: ${error.message}`);
  }

  return data;
}

export async function getPublicReport(slug: string) {
  const supabase = createServiceClient();
  
  const { data, error } = await supabase
    .from('affiliate_reports')
    .select(`
      *,
      affiliate_programs(
        name,
        commission_rate,
        brands(Name, Slug, Logo)
      )
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (error) {
    throw new Error(`Report not found or not public: ${error.message}`);
  }

  return data;
}

export async function getPublicReportByProgram(programSlug: string) {
  const supabase = createServiceClient();
  
  // First get the program by brand slug
  const { data: program, error: programError } = await supabase
    .from('affiliate_programs')
    .select(`
      *,
      brands!inner(Name, Slug, Logo)
    `)
    .eq('brands.Slug', programSlug)
    .eq('is_active', true)
    .single();

  if (programError || !program) {
    throw new Error(`Program not found: ${programError?.message}`);
  }

  return program;
}

export async function getFilteredReportData(
  programSlug: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = createServiceClient();
  
  // Get the program
  const program = await getPublicReportByProgram(programSlug);
  
  // Build sales query with optional date filtering - handle pagination for >1000 rows
  const allSalesData: any[] = [];
  let hasMore = true;
  let offset = 0;
  const limit = 1000;
  
  while (hasMore) {
    let salesQuery = supabase
      .from('affiliate_sales')
      .select(`
        *,
        machines(id, "Machine Name", "Internal link")
      `)
      .eq('program_id', program.id)
      .range(offset, offset + limit - 1);
    
    if (startDate) {
      salesQuery = salesQuery.gte('order_date', startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte('order_date', endDate);
    }
    
    const { data: salesData, error: salesError } = await salesQuery;
    
    if (salesError) {
      throw new Error(`Failed to fetch sales data: ${salesError.message}`);
    }
    
    if (salesData) {
      allSalesData.push(...salesData);
      hasMore = salesData.length === limit;
      offset += limit;
    } else {
      hasMore = false;
    }
  }
  
  const salesData = allSalesData;

  // Calculate machine metrics
  const machineMetricsMap = new Map<string, MachineMetric>();
  const unmatchedProducts: any[] = [];

  for (const sale of salesData || []) {
    if (sale.machine_id && sale.machines) {
      const key = sale.machine_id;
      const existing = machineMetricsMap.get(key) || {
        machine_id: sale.machine_id,
        machine_name: sale.machines?.['Machine Name'] || 'Unknown Machine',
        machine_slug: sale.machines?.['Internal link'] || '',
        total_sales: 0,
        total_orders: 0,
        commission_amount: 0,
        average_order_value: 0,
      };

      existing.total_sales += parseFloat(sale.total_sales);
      existing.total_orders += 1;
      existing.commission_amount += parseFloat(sale.commission_amount);
      
      machineMetricsMap.set(key, existing);
    } else {
      // Track unmatched products
      unmatchedProducts.push({
        product_name: sale.raw_product_string || 'Unknown Product',
        total_sales: parseFloat(sale.total_sales),
        commission: parseFloat(sale.commission_amount),
        order_number: sale.order_number,
      });
    }
  }

  // Calculate averages
  const machineMetrics = Array.from(machineMetricsMap.values()).map(metric => ({
    ...metric,
    average_order_value: metric.total_orders > 0 ? metric.total_sales / metric.total_orders : 0,
  }));

  // Sort by total sales descending
  machineMetrics.sort((a, b) => b.total_sales - a.total_sales);

  // Get click data for traffic sources - handle pagination
  const allClickData: any[] = [];
  hasMore = true;
  offset = 0;
  
  while (hasMore) {
    let clickQuery = supabase
      .from('link_clicks')
      .select(`
        utm_source,
        utm_medium,
        created_at,
        short_links!inner(
          machine_id,
          utm_source as default_source
        )
      `)
      .range(offset, offset + limit - 1);
      
    if (startDate) {
      clickQuery = clickQuery.gte('created_at', startDate);
    }
    if (endDate) {
      clickQuery = clickQuery.lte('created_at', endDate);
    }
    
    const { data: clickData } = await clickQuery;
    
    if (clickData) {
      allClickData.push(...clickData);
      hasMore = clickData.length === limit;
      offset += limit;
    } else {
      hasMore = false;
    }
  }
  
  const clickData = allClickData;

  // Calculate traffic source metrics
  const trafficSourceMap = new Map<string, TrafficSource>();
  
  for (const click of clickData || []) {
    const source = click.utm_source || click.short_links?.default_source || 'direct';
    const key = `${source}_${click.utm_medium || 'none'}`;
    
    const existing = trafficSourceMap.get(key) || {
      source: source,
      utm_source: click.utm_source,
      utm_medium: click.utm_medium,
      total_clicks: 0,
      total_sales: 0,
      conversion_rate: 0,
    };
    
    existing.total_clicks += 1;
    trafficSourceMap.set(key, existing);
  }

  // Match sales to traffic sources
  for (const sale of salesData || []) {
    const source = sale.utm_source || 'direct';
    const key = `${source}_${sale.utm_medium || 'none'}`;
    const existing = trafficSourceMap.get(key);
    if (existing) {
      existing.total_sales += parseFloat(sale.total_sales);
    }
  }

  // Calculate conversion rates
  const trafficSources = Array.from(trafficSourceMap.values()).map(source => ({
    ...source,
    conversion_rate: source.total_clicks > 0 ? (source.total_sales / source.total_clicks) * 100 : 0,
  }));

  // Calculate totals
  const totalRevenue = salesData?.reduce((sum, sale) => sum + parseFloat(sale.total_sales), 0) || 0;
  const totalCommission = salesData?.reduce((sum, sale) => sum + parseFloat(sale.commission_amount), 0) || 0;
  const totalOrders = salesData?.length || 0;
  const totalClicks = clickData?.length || 0;

  return {
    program: {
      ...program,
      commission_rate: program.commission_rate || 0.15, // Default 15% if not set
    },
    machineMetrics,
    trafficSources,
    unmatchedProducts,
    totalRevenue,
    totalCommission,
    totalOrders,
    totalClicks,
  };
}