export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    // Get total count of all lead-magnet type link clicks (all time)
    // Using count query which is more efficient than fetching all rows
    const { count, error } = await supabase
      .from('link_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('is_bot', false)
      .eq('short_links.type', 'lead-magnet');
    
    if (error) {
      console.error('Error fetching total lead clicks:', error);
      
      // Fallback: Try direct SQL query
      const { data: sqlResult, error: sqlError } = await supabase.rpc('get_total_lead_clicks');
      
      if (sqlError) {
        // If RPC doesn't exist, return 0
        console.error('RPC error:', sqlError);
        return NextResponse.json({ totalClicks: 0 });
      }
      
      return NextResponse.json({ 
        totalClicks: sqlResult?.[0]?.total_clicks || 0 
      });
    }
    
    return NextResponse.json({ 
      totalClicks: count || 0 
    });

  } catch (error) {
    console.error('Total lead clicks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}