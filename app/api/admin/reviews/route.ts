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
    const reason = searchParams.get('reason') || undefined;
    const confidence = searchParams.get('confidence') ? parseFloat(searchParams.get('confidence')!) : null;
    const sortBy = searchParams.get('sort_by') || 'date';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const search = searchParams.get('search') || undefined;
    
    // Start building the query
    let query = supabase
      .from('machines_latest as ml')
      .select(`
        ml.machine_id, 
        ml.variant_attribute,
        ml.machines_latest_price,
        ml.flag_reason,
        ml.manual_review_flag,
        ml.last_attempt_time,
        ml.confidence,
        ml.tier,
        ml.latest_price_history_id,
        ml.latest_successful_price_history_id,
        machines:machine_id (id, "Machine Name", "Brand", product_link)
      `, { count: 'exact' })
      .eq('ml.manual_review_flag', true);
    
    // Apply filters
    if (reason) {
      query = query.ilike('ml.flag_reason', `%${reason}%`);
    }
    
    if (confidence !== null) {
      query = query.lte('ml.confidence', confidence);
    }
    
    if (search) {
      query = query.or(`machines."Machine Name".ilike.%${search}%,machines."Brand".ilike.%${search}%`);
    }
    
    // Apply sorting
    const sortField = mapSortField(sortBy);
    query = query.order(sortField, { ascending: sortOrder.toLowerCase() === 'asc' });
    
    // Apply pagination
    query = query.range(skip, skip + limit - 1);
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching flagged machines:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Now we need to get the price history details
    const priceHistoryIds = (data || [])
      .filter(item => item.latest_price_history_id)
      .map(item => item.latest_price_history_id);
    
    const successfulPriceHistoryIds = (data || [])
      .filter(item => item.latest_successful_price_history_id)
      .map(item => item.latest_successful_price_history_id);
    
    // Get latest price history entries
    const { data: latestPriceHistory } = await supabase
      .from('price_history')
      .select('id, price, date, status, review_reason, raw_price_text, extraction_method')
      .in('id', priceHistoryIds);
    
    // Get previous successful price history entries
    const { data: previousPriceHistory } = await supabase
      .from('price_history')
      .select('id, price, date')
      .in('id', successfulPriceHistoryIds);
    
    // Map price history data for easy lookup
    const latestPriceMap = (latestPriceHistory || []).reduce((map, item) => {
      map[item.id] = item;
      return map;
    }, {} as Record<string, any>);
    
    const previousPriceMap = (previousPriceHistory || []).reduce((map, item) => {
      map[item.id] = item;
      return map;
    }, {} as Record<string, any>);
    
    // Process the results to include all necessary information
    const machines = (data || []).map(item => {
      const latestPrice = item.latest_price_history_id ? latestPriceMap[item.latest_price_history_id] : null;
      const previousPrice = item.latest_successful_price_history_id ? previousPriceMap[item.latest_successful_price_history_id] : null;
      
      const currentPrice = latestPrice?.price || item.machines_latest_price;
      const oldPrice = previousPrice?.price;
      
      // Calculate price changes where possible
      let priceChange = null;
      let percentageChange = null;
      
      if (currentPrice !== null && oldPrice !== null && oldPrice > 0) {
        priceChange = currentPrice - oldPrice;
        percentageChange = (priceChange / oldPrice) * 100;
      }
      
      return {
        machine_id: item.machine_id,
        variant_attribute: item.variant_attribute,
        machine_name: item.machines ? item.machines["Machine Name"] : null,
        brand: item.machines ? item.machines["Brand"] : null,
        product_link: item.machines ? item.machines.product_link : null,
        latest_price: currentPrice,
        previous_price: oldPrice,
        last_attempt_time: item.last_attempt_time,
        flag_reason: item.flag_reason,
        review_reason: latestPrice?.review_reason,
        raw_price_text: latestPrice?.raw_price_text,
        extraction_method: latestPrice?.extraction_method || item.tier,
        confidence: item.confidence,
        price_change: priceChange,
        percentage_change: percentageChange,
        status: latestPrice?.status
      };
    });
    
    return NextResponse.json({
      machines,
      total: count || 0
    });
  } catch (error: any) {
    console.error('Error in reviews API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to map frontend sort fields to database fields
function mapSortField(sortBy: string): string {
  const sortFieldMap: Record<string, string> = {
    'machine_name': 'machines."Machine Name"',
    'brand': 'machines."Brand"',
    'price': 'ml.machines_latest_price',
    'date': 'ml.last_attempt_time',
    'confidence': 'ml.confidence',
    'review_reason': 'ml.flag_reason'
  };
  
  return sortFieldMap[sortBy] || 'ml.last_attempt_time';
} 