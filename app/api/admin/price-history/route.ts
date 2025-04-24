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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const status = searchParams.get('status');
    const batchId = searchParams.get('batchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const machineName = searchParams.get('machineName');
    const brand = searchParams.get('brand');
    const minPriceChange = searchParams.get('minPriceChange') ? parseFloat(searchParams.get('minPriceChange')!) : null;
    const maxPriceChange = searchParams.get('maxPriceChange') ? parseFloat(searchParams.get('maxPriceChange')!) : null;
    const extractionMethod = searchParams.get('extractionMethod');
    const confidence = searchParams.get('confidence') ? parseFloat(searchParams.get('confidence')!) : null;
    
    // Start building the query
    let query = supabase
      .from('price_history')
      .select('*, machines:machine_id(id, "Machine Name", Company, product_link)', { count: 'exact' });
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    if (machineName) {
      // This requires the join with machines table
      query = query.ilike('machines."Machine Name"', `%${machineName}%`);
    }
    
    if (brand) {
      // This requires the join with machines table
      query = query.ilike('machines.Company', `%${brand}%`);
    }
    
    if (extractionMethod) {
      query = query.eq('extraction_method', extractionMethod);
    }
    
    if (confidence !== null) {
      // For confidence filtering, consider both validation and extraction confidence
      query = query.or(`validation_confidence.lte.${confidence},extracted_confidence.lte.${confidence}`);
    }
    
    // Add search across multiple fields if provided
    if (search) {
      // This requires the join with machines table
      query = query.or(`machines."Machine Name".ilike.%${search}%,machines.Company.ilike.%${search}%`);
    }
    
    // Add ordering - latest first
    query = query.order('date', { ascending: false });
    
    // Apply pagination using Supabase's range method
    query = query.range(skip, skip + limit - 1);
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Process the results for price changes and filtering
    const items = [];
    
    for (const item of data || []) {
      // Calculate price changes if not already provided
      const newPrice = item.price;
      const oldPrice = item.validation_basis_price;
      
      let priceChange = null;
      let percentageChange = null;
      
      if (newPrice !== null && oldPrice !== null && oldPrice > 0) {
        priceChange = newPrice - oldPrice;
        percentageChange = (priceChange / oldPrice) * 100;
      }
      
      // Add calculated fields
      const processedItem = {
        ...item,
        price_change: priceChange,
        percentage_change: percentageChange,
        // Extract related machine data
        machine_name: item.machines ? item.machines['Machine Name'] : null,
        brand: item.machines ? item.machines.Company : null,
        product_link: item.machines ? item.machines.product_link : null,
      };
      
      // Apply post-query filtering for price changes
      if (minPriceChange !== null && (percentageChange === null || percentageChange < minPriceChange)) {
        continue;
      }
      
      if (maxPriceChange !== null && (percentageChange === null || percentageChange > maxPriceChange)) {
        continue;
      }
      
      // Remove the nested machines object since we've extracted what we need
      delete processedItem.machines;
      
      items.push(processedItem);
    }
    
    return NextResponse.json({
      items,
      total: count || 0,
      filters: {
        status,
        batchId,
        startDate,
        endDate,
        search,
        machineName,
        brand,
        minPriceChange,
        maxPriceChange,
        extractionMethod,
        confidence
      }
    });
  } catch (error: any) {
    console.error('Error in price history API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 