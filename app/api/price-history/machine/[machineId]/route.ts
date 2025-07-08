import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  try {
    const { machineId } = await params;
    
    if (!machineId) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }
    
    // Get all price history for the specific machine, ordered by date (newest first)
    const { data: priceHistory, error } = await supabase
      .from('price_history')
      .select(`
        id,
        machine_id,
        price,
        date,
        status,
        failure_reason,
        batch_id,
        is_all_time_low,
        is_all_time_high,
        reviewed_by,
        reviewed_at,
        review_result,
        review_reason
      `)
      .eq('machine_id', machineId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching price history:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch price history',
        details: error.message 
      }, { status: 500 });
    }
    
    // Also get the machine details for context
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('id, "Machine Name", "Company", "Price"')
      .eq('id', machineId)
      .single();
    
    if (machineError) {
      console.error('Error fetching machine details:', machineError);
      return NextResponse.json({ 
        error: 'Failed to fetch machine details',
        details: machineError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      machine,
      priceHistory: priceHistory || [],
      totalRecords: priceHistory?.length || 0
    });
    
  } catch (error) {
    console.error('Error in machine price history endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}