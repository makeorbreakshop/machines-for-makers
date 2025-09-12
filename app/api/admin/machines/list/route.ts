export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Fetch all machines with basic info
    const { data: machines, error } = await supabase
      .from('machines')
      .select('id, "Machine Name", Company')
      .order('"Machine Name"');

    if (error) {
      console.error('Error fetching machines:', error);
      throw new Error('Failed to fetch machines');
    }

    return NextResponse.json({
      success: true,
      machines: machines || []
    });

  } catch (error) {
    console.error('List machines error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch machines' },
      { status: 500 }
    );
  }
}