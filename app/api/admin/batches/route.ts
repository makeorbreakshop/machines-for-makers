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
    const batchId = searchParams.get('batchId');
    
    // If batchId is provided, get details for that specific batch
    if (batchId) {
      return getBatchDetails(batchId);
    }
    
    // Otherwise, get a list of all batches
    const { data, error } = await supabase
      .from('batches')
      .select('id, status, start_time, end_time, total_machines, days_threshold')
      .order('start_time', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error fetching batches:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      batches: data || []
    });
  } catch (error: any) {
    console.error('Error in batches API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getBatchDetails(batchId: string) {
  try {
    // Get batch metadata
    const { data: batchInfo, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();
    
    if (batchError) {
      console.error('Error fetching batch info:', batchError);
      return NextResponse.json({ error: `Batch not found: ${batchId}` }, { status: 404 });
    }
    
    // Get price history entries for this batch
    const { data: priceHistory, error: priceHistoryError } = await supabase
      .from('price_history')
      .select(`
        id,
        machine_id,
        variant_attribute,
        price,
        validation_basis_price,
        date,
        status,
        tier,
        extraction_method,
        extracted_confidence,
        validation_confidence,
        failure_reason,
        review_reason,
        raw_price_text,
        scraped_from_url,
        http_status,
        html_size,
        extraction_duration_seconds,
        machines:machine_id (id, "Machine Name", Company, product_link)
      `)
      .eq('batch_id', batchId)
      .order('date', { ascending: false });
    
    if (priceHistoryError) {
      console.error('Error fetching price history for batch:', priceHistoryError);
    }
    
    // Process results to match expected format
    const items = (priceHistory || []).map(item => {
      // Calculate price changes
      const newPrice = item.price;
      const oldPrice = item.validation_basis_price;
      
      let priceChange = null;
      let percentageChange = null;
      
      if (newPrice !== null && oldPrice !== null && oldPrice > 0) {
        priceChange = newPrice - oldPrice;
        percentageChange = (priceChange / oldPrice) * 100;
      }
      
      return {
        ...item,
        price_change: priceChange,
        percentage_change: percentageChange,
        machine_name: item.machines ? item.machines["Machine Name"] : null,
        brand: item.machines ? item.machines.Company : null,
        product_link: item.machines ? item.machines.product_link : null,
        old_price: oldPrice,
        new_price: newPrice
      };
    });
    
    // Calculate statistics
    const total = items.length;
    const successful = items.filter(r => r.status === 'SUCCESS').length;
    const failed = items.filter(r => r.status === 'FAILED').length;
    const needsReview = items.filter(r => r.status === 'NEEDS_REVIEW').length;
    
    // Count unchanged vs updated prices (for successful extractions only)
    const successfulItems = items.filter(r => r.status === 'SUCCESS');
    const unchanged = successfulItems.filter(r => r.price === r.validation_basis_price).length;
    const updated = successful - unchanged;
    
    const stats = {
      total,
      successful,
      failed,
      needs_review: needsReview,
      unchanged,
      updated,
      start_time: batchInfo.start_time,
      end_time: batchInfo.end_time,
      status: batchInfo.status
    };
    
    return NextResponse.json({
      batch_id: batchId,
      results: items,
      stats,
      batch_info: batchInfo
    });
  } catch (error: any) {
    console.error('Error getting batch details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 