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
    
    // Get days parameter from query
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    // Get date range
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - days);
    
    // Get click data for chart
    const { data: clickData } = await supabase
      .from('link_clicks')
      .select('clicked_at')
      .gte('clicked_at', rangeStart.toISOString())
      .eq('is_bot', false)
      .order('clicked_at', { ascending: true });

    return NextResponse.json({
      chartData: clickData || []
    });

  } catch (error) {
    console.error('Clicks chart API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}