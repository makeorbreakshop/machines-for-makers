import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordIds } = body;
    
    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: 'Record IDs array is required' }, { status: 400 });
    }
    
    // Validate that we don't have too many IDs (safety limit)
    if (recordIds.length > 100) {
      return NextResponse.json({ error: 'Too many records to delete at once (max 100)' }, { status: 400 });
    }
    
    // Delete all records in a single query using the 'in' operator
    const { data: deletedRecords, error } = await supabase
      .from('price_history')
      .delete()
      .in('id', recordIds)
      .select('id'); // Return the deleted record IDs for confirmation
    
    if (error) {
      console.error('Error batch deleting price history:', error);
      return NextResponse.json({ 
        error: 'Failed to delete price history records',
        details: error.message 
      }, { status: 500 });
    }
    
    const deletedCount = deletedRecords?.length || 0;
    
    return NextResponse.json({ 
      success: true,
      deletedCount,
      deletedIds: deletedRecords?.map(r => r.id) || []
    });
  } catch (error) {
    console.error('Error in batch delete price history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}