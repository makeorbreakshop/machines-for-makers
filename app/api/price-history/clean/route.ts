import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  // Check for admin authorization
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');
  
  if (secret !== 'admin-panel') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Find all price history records with prices < 10
    const { data: lowPriceRecords, error: findError } = await supabase
      .from('price_history')
      .select('id, machine_id, price')
      .lt('price', 10);
    
    if (findError) {
      console.error('Error finding low price records:', findError);
      return NextResponse.json({ error: 'Failed to find invalid price records' }, { status: 500 });
    }
    
    if (!lowPriceRecords || lowPriceRecords.length === 0) {
      return NextResponse.json({ 
        message: 'No invalid price records found',
        recordsDeleted: 0
      });
    }
    
    // Extract IDs of records to delete
    const recordIds = lowPriceRecords.map(record => record.id);
    
    // Delete the invalid price records
    const { error: deleteError } = await supabase
      .from('price_history')
      .delete()
      .in('id', recordIds);
    
    if (deleteError) {
      console.error('Error deleting invalid price records:', deleteError);
      return NextResponse.json({ error: 'Failed to delete invalid price records' }, { status: 500 });
    }
    
    // After deleting, update price extremes for affected machines
    const machineIds = [...new Set(lowPriceRecords.map(record => record.machine_id))];
    
    for (const machineId of machineIds) {
      await updatePriceExtremes(machineId);
    }
    
    return NextResponse.json({
      success: true,
      recordsDeleted: recordIds.length,
      affectedMachines: machineIds.length
    });
  } catch (error) {
    console.error('Error cleaning price history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Function to update if this price is an all-time high or low
async function updatePriceExtremes(machineId: string): Promise<void> {
  try {
    // Get historical price data
    const { data: priceHistory, error: historyError } = await supabase
      .from('price_history')
      .select('id, price')
      .eq('machine_id', machineId)
      .order('price', { ascending: true });
    
    if (historyError || !priceHistory) {
      console.error('Error fetching price history:', historyError);
      return;
    }
    
    // Skip if we don't have enough history
    if (priceHistory.length <= 1) return;
    
    // Filter out any prices that are unrealistically low (likely scraping errors)
    const validPrices = priceHistory.filter(record => record.price >= 10);
    
    // If we filtered everything out, log a warning and return
    if (validPrices.length === 0) {
      console.warn(`All prices for machine ${machineId} appear to be invalid (< $10)`);
      return;
    }
    
    // Reset all flags first
    await supabase
      .from('price_history')
      .update({ 
        is_all_time_low: false,
        is_all_time_high: false
      })
      .eq('machine_id', machineId);
    
    // Set the new extremes
    const lowest = validPrices[0];
    const highest = validPrices[validPrices.length - 1];
    
    console.log(`Setting extremes for ${machineId}: low=$${lowest.price}, high=$${highest.price}`);
    
    if (lowest) {
      await supabase
        .from('price_history')
        .update({ is_all_time_low: true })
        .eq('id', lowest.id);
    }
    
    if (highest) {
      await supabase
        .from('price_history')
        .update({ is_all_time_high: true })
        .eq('id', highest.id);
    }
  } catch (error) {
    console.error('Error updating price extremes:', error);
  }
} 