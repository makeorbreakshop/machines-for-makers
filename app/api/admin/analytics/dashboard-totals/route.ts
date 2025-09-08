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
    
    // Use the new database function for all totals
    const { data, error } = await supabase.rpc('get_dashboard_totals');
    
    if (error) {
      console.error('Dashboard totals error:', error);
      return NextResponse.json({ 
        total_lead_clicks: 0,
        total_all_clicks: 0,
        total_subscribers: 0,
        active_subscribers: 0,
        total_conversions: 0
      });
    }
    
    // Return the first row (function returns single row)
    return NextResponse.json(data?.[0] || {
      total_lead_clicks: 0,
      total_all_clicks: 0,
      total_subscribers: 0,
      active_subscribers: 0,
      total_conversions: 0
    });

  } catch (error) {
    console.error('Dashboard totals API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}