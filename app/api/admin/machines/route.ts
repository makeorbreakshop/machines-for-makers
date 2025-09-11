export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    
    const supabase = createServiceClient();
    
    let query = supabase
      .from('machines')
      .select('id, "Machine Name", "Company", "Price"')
      .order('"Machine Name"');
    
    if (company) {
      query = query.ilike('"Company"', `%${company}%`);
    }
    
    const { data: machines, error } = await query;
    
    if (error) {
      console.error('Database error fetching machines:', error);
      return NextResponse.json(
        { message: 'Failed to fetch machines' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ machines });
    
  } catch (error) {
    console.error('Error in GET /api/admin/machines:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}