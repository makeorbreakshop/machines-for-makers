import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = getAdminCookie(request);
    if (!adminCookie || !validateAdminCookie(adminCookie)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createServiceClient();
    const body = await request.json();
    const { sale_id, machine_id } = body;
    
    if (!sale_id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }
    
    // Update the affiliate_sales record
    const { data, error } = await supabase
      .from('affiliate_sales')
      .update({ 
        machine_id,
        product_match_confidence: machine_id ? 1.0 : 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', sale_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating sale machine:', error);
      return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      sale: data 
    });
    
  } catch (error) {
    console.error('Error in update machine API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}