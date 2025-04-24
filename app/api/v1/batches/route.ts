import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const supabase = createClient();
    
    // Get batches
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching batches:', error);
      return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/v1/batches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 