import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'; 

export async function GET() {
  const responseHeaders: Record<string, string> = {
    'X-API-Request-Time': new Date().toISOString(),
  };
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500, headers: responseHeaders }
      );
    }
    
    const startTime = performance.now();
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test simple database query - only fetch count instead of actual machine data
    // This avoids the large HTML content issue
    const { count, error, status } = await supabase
      .from('machines')
      .select('id', { count: 'exact', head: true });
      
    const queryTime = performance.now() - startTime;
    responseHeaders['X-Query-Time'] = queryTime.toString();
    
    if (error) {
      // Check for rate limiting indicators in the error
      if (error.message.includes('rate') || error.message.includes('timeout') || status === 429) {
        responseHeaders['X-Rate-Limited'] = 'true';
        
        return NextResponse.json(
          { 
            dbStatus: 'rate_limited',
            error: error.message,
            details: error.details
          },
          { status: 429, headers: responseHeaders }
        );
      }
      
      return NextResponse.json(
        { 
          dbStatus: 'error',
          error: error.message,
          details: error.details
        },
        { status: 500, headers: responseHeaders }
      );
    }
    
    // If query was too slow, indicate potential throttling
    if (queryTime > 2000) {
      responseHeaders['X-Throttling-Warning'] = 'true';
    }
    
    // Try to get connection pool stats if available (admin client only)
    let connectionPoolStats = null;
    try {
      const adminClient = createAdminClient();
      const { data: poolData } = await adminClient
        .rpc('pg_stat_activity', {});
      
      if (poolData) {
        const activeConnections = poolData.filter((conn: any) => 
          conn.state === 'active' || conn.state === 'idle in transaction'
        ).length;
        
        connectionPoolStats = {
          active: activeConnections,
          total: poolData.length
        };
      }
    } catch (poolError) {
      console.error('Failed to get connection pool stats:', poolError);
    }
    
    return NextResponse.json(
      { 
        dbStatus: 'ok',
        machineCount: count,
        queryTime: queryTime,
        connectionPoolStats
      },
      { headers: responseHeaders }
    );
  } catch (error: any) {
    console.error('Error checking Supabase status:', error);
    
    return NextResponse.json(
      { 
        dbStatus: 'error',
        error: error.message || String(error)
      },
      { status: 500, headers: responseHeaders }
    );
  }
} 