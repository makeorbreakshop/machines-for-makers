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
    
    // Get date range - use proper date arithmetic to avoid month boundary issues
    const rangeStart = new Date();
    rangeStart.setTime(rangeStart.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // Ensure we capture all of today's data
    const rangeEnd = new Date();
    rangeEnd.setHours(23, 59, 59, 999);
    
    // Use pagination to get ALL clicks (bypasses 1000 row limit)
    // The RPC function also hits the 1000 row limit, so we use pagination
    console.log('Fetching clicks with pagination for dates:', {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString()
    });
    
    let allClicks: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('link_clicks')
        .select('clicked_at')
        .gte('clicked_at', rangeStart.toISOString())
        .lte('clicked_at', rangeEnd.toISOString())
        .eq('is_bot', false)
        .order('clicked_at', { ascending: true })
        .range(offset, offset + pageSize - 1);
      
      if (batchError) {
        console.error('Error fetching clicks batch:', batchError);
        return NextResponse.json({ error: 'Failed to fetch clicks data' }, { status: 500 });
      }
      
      if (batch && batch.length > 0) {
        allClicks = allClicks.concat(batch);
        console.log(`Fetched batch: offset=${offset}, size=${batch.length}, total=${allClicks.length}`);
        offset += pageSize;
        hasMore = batch.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    
    console.log('Total clicks fetched:', allClicks.length);
    
    // Count by date for debugging
    const clicksByDate: Record<string, number> = {};
    allClicks.forEach(click => {
      const date = click.clicked_at.split('T')[0];
      clicksByDate[date] = (clicksByDate[date] || 0) + 1;
    });
    
    console.log('Clicks for Sept 6-8:', {
      '2025-09-06': clicksByDate['2025-09-06'] || 0,
      '2025-09-07': clicksByDate['2025-09-07'] || 0,
      '2025-09-08': clicksByDate['2025-09-08'] || 0
    });
    
    return NextResponse.json({
      chartData: allClicks
    });

  } catch (error) {
    console.error('Clicks chart API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}