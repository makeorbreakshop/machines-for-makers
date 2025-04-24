import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role key for admin routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract query parameters
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const daysThreshold = searchParams.get('days_threshold') ? parseInt(searchParams.get('days_threshold'), 10) : null;
    const search = searchParams.get('search') || undefined;
    const company = searchParams.get('company') || undefined;
    const category = searchParams.get('category') || undefined;
    
    // Start building the query for machines
    let query = supabase
      .from('machines')
      .select('id, "Machine Name", Company, "Machine Category", product_link', { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.or(`"Machine Name".ilike.%${search}%,Company.ilike.%${search}%`);
    }
    
    if (company) {
      query = query.eq('Company', company);
    }
    
    if (category) {
      query = query.eq('Machine Category', category);
    }
    
    // Apply pagination
    query = query.range(skip, skip + limit - 1);
    
    // Execute the machines query
    const { data: machinesData, error: machinesError, count } = await query;
    
    if (machinesError) {
      console.error('Error fetching machines:', machinesError);
      return NextResponse.json({ error: machinesError.message }, { status: 500 });
    }
    
    if (!machinesData || machinesData.length === 0) {
      return NextResponse.json({
        success: true,
        machines: [],
        total: 0,
        filters: { search, company, category, days_threshold: daysThreshold }
      });
    }
    
    // Get the machine IDs to fetch their latest prices
    const machineIds = machinesData.map(machine => machine.id);
    
    // Query machines_latest to get the current prices for these machines
    const { data: latestData, error: latestError } = await supabase
      .from('machines_latest')
      .select('machine_id, machines_latest_price, currency, last_checked, manual_review_flag, flag_reason, tier, latest_successful_price_history_id')
      .eq('variant_attribute', 'DEFAULT')
      .in('machine_id', machineIds);
    
    if (latestError) {
      console.error('Error fetching latest prices:', latestError);
      // Continue with just machine data
    }
    
    // Create a map of machine_id to latest price data for quick lookup
    const latestPricesMap = (latestData || []).reduce((map, item) => {
      map[item.machine_id] = item;
      return map;
    }, {} as Record<string, any>);
    
    // Fetch previous prices from price_history for machines with latest price data
    const priceHistoryIds = (latestData || [])
      .filter(item => item.latest_successful_price_history_id)
      .map(item => item.latest_successful_price_history_id);
    
    let previousPricesMap: Record<string, any> = {};
    
    if (priceHistoryIds.length > 0) {
      const { data: priceHistoryData, error: priceHistoryError } = await supabase
        .from('price_history')
        .select('id, machine_id, validation_basis_price')
        .in('id', priceHistoryIds);
      
      if (!priceHistoryError && priceHistoryData) {
        // Map price history to machine IDs
        previousPricesMap = priceHistoryData.reduce((map, item) => {
          map[item.id] = item.validation_basis_price;
          return map;
        }, {} as Record<string, any>);
      }
    }
    
    // Apply days threshold filter if specified
    let filteredMachines = machinesData;
    if (daysThreshold !== null) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
      
      filteredMachines = machinesData.filter(machine => {
        const latestData = latestPricesMap[machine.id];
        if (!latestData || !latestData.last_checked) return true; // Include if no last_checked date
        return new Date(latestData.last_checked) < thresholdDate;
      });
    }
    
    // Process the results
    const machines = filteredMachines.map(machine => {
      const latestData = latestPricesMap[machine.id] || {};
      const currentPrice = latestData.machines_latest_price;
      const previousPriceId = latestData.latest_successful_price_history_id;
      const previousPrice = previousPriceId ? previousPricesMap[previousPriceId] : null;
      
      // Calculate price changes where possible
      let priceChange = null;
      let percentageChange = null;
      
      if (currentPrice !== undefined && previousPrice !== null && previousPrice > 0) {
        priceChange = currentPrice - previousPrice;
        percentageChange = (priceChange / previousPrice) * 100;
      }
      
      return {
        id: machine.id,
        machine_name: machine["Machine Name"],
        brand: machine.Company,
        company: machine.Company,
        category: machine["Machine Category"],
        product_link: machine.product_link,
        current_price: currentPrice,
        previous_price: previousPrice,
        last_updated: latestData.last_checked,
        manual_review_flag: latestData.manual_review_flag || false,
        flag_reason: latestData.flag_reason,
        extraction_method: latestData.tier,
        price_change: priceChange,
        percentage_change: percentageChange
      };
    });
    
    return NextResponse.json({
      success: true,
      machines,
      total: count || 0,
      filters: {
        search,
        company,
        category,
        days_threshold: daysThreshold
      }
    });
  } catch (error: any) {
    console.error('Error in machines API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 