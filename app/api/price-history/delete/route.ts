import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(request: NextRequest) {
  // Get recordId from query params
  const searchParams = request.nextUrl.searchParams;
  const recordId = searchParams.get('id');
  
  if (!recordId) {
    return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
  }
  
  try {
    // Delete the price history record
    const { error } = await supabase
      .from('price_history')
      .delete()
      .eq('id', recordId);
    
    if (error) {
      console.error('Error deleting price history:', error);
      return NextResponse.json({ error: 'Failed to delete price history record' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete price history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 