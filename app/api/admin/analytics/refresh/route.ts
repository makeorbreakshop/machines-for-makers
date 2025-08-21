export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Manually refresh the materialized views
    const { error } = await supabase.rpc('refresh_analytics_views');

    if (error) {
      console.error('Failed to refresh analytics views:', error);
      return NextResponse.json({ error: 'Failed to refresh analytics' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Analytics data refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Refresh API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}