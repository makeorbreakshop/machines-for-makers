export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Test 1: Get program
    const { data: program } = await supabase
      .from('affiliate_programs')
      .select('*, brands(Name, Slug)')
      .eq('id', '14d8201b-5114-4b14-961b-4b594e9ea30e')
      .single();

    // Test 2: Get sales with simple query
    const { data: sales1, error: error1 } = await supabase
      .from('affiliate_sales')
      .select('*')
      .eq('program_id', '14d8201b-5114-4b14-961b-4b594e9ea30e')
      .gte('order_date', '2024-10-01')
      .lte('order_date', '2024-12-31');

    // Test 3: Get sales with machine join
    const { data: sales2, error: error2 } = await supabase
      .from('affiliate_sales')
      .select(`
        *,
        machines(id, "Machine Name", "Internal link")
      `)
      .eq('program_id', '14d8201b-5114-4b14-961b-4b594e9ea30e')
      .gte('order_date', '2024-10-01')
      .lte('order_date', '2024-12-31');

    // Test 4: Get all sales for program
    const { data: allSales } = await supabase
      .from('affiliate_sales')
      .select('count')
      .eq('program_id', '14d8201b-5114-4b14-961b-4b594e9ea30e');

    return NextResponse.json({
      program: program ? { id: program.id, name: program.name } : null,
      test1_simple_query: {
        count: sales1?.length || 0,
        error: error1?.message || null,
        sample: sales1?.[0] || null
      },
      test2_with_join: {
        count: sales2?.length || 0,
        error: error2?.message || null,
        sample: sales2?.[0] || null
      },
      test3_total_sales: allSales,
      dates_used: {
        start: '2024-10-01',
        end: '2024-12-31'
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}