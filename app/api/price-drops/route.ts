export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '30');
    const category = searchParams.get('category');
    const minDiscount = parseFloat(searchParams.get('minDiscount') || '0');
    
    // Build the query
    let query = supabase
      .from('price_history')
      .select(`
        id,
        machine_id,
        price,
        previous_price,
        price_change,
        percentage_change,
        date,
        is_all_time_low,
        machines!inner (
          id,
          Machine Name,
          Company,
          Price,
          product_link,
          Affiliate Link,
          Image,
          Machine Category,
          Price Category,
          Award,
          Work Area,
          price_tracking_enabled
        )
      `)
      .lt('price_change', 0)
      .in('status', ['AUTO_APPLIED', 'MANUAL_CORRECTION'])
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .not('previous_price', 'is', null)
      .eq('machines.price_tracking_enabled', true)
      .order('date', { ascending: false })
      .order('price_change', { ascending: true });

    // Apply category filter if provided
    if (category && category !== 'all') {
      query = query.eq('machines.Machine Category', category);
    }

    // Apply minimum discount filter
    if (minDiscount > 0) {
      query = query.lte('percentage_change', -minDiscount);
    }

    // Execute query with limit
    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('Error fetching price drops:', error);
      return NextResponse.json({ error: 'Failed to fetch price drops' }, { status: 500 });
    }

    // Transform the data to flatten the structure
    const priceDrops = data?.map(drop => ({
      id: drop.id,
      machineId: drop.machine_id,
      machineName: drop.machines['Machine Name'],
      company: drop.machines.Company,
      currentPrice: drop.machines.Price,
      previousPrice: drop.previous_price,
      priceChange: drop.price_change,
      percentageChange: drop.percentage_change,
      dropDate: drop.date,
      isAllTimeLow: drop.is_all_time_low,
      productLink: drop.machines.product_link,
      affiliateLink: drop.machines['Affiliate Link'],
      imageUrl: drop.machines.Image,
      category: drop.machines['Machine Category'],
      priceCategory: drop.machines['Price Category'],
      award: drop.machines.Award,
      workArea: drop.machines['Work Area'],
      dropType: getDropType(drop.percentage_change, drop.is_all_time_low)
    })) || [];

    return NextResponse.json({ priceDrops });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDropType(percentageChange: number, isAllTimeLow: boolean): string {
  if (isAllTimeLow) return 'all_time_low';
  if (percentageChange <= -20) return 'major_drop';
  if (percentageChange <= -10) return 'significant_drop';
  return 'price_drop';
}