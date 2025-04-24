import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { machineIds } = await request.json();
    
    if (!Array.isArray(machineIds) || !machineIds.length) {
      return NextResponse.json(
        { error: 'Invalid or empty machineIds array provided' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query machines table for the provided machine IDs
    const { data: machines, error } = await supabase
      .from('machines')
      .select('id, product_link, "Affiliate Link"')
      .in('id', machineIds);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch machine data from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ machines: machines || [] });
  } catch (error) {
    console.error('Error in machines URL lookup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 