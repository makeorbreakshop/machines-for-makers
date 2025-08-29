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
    
    // Use RPC function to efficiently get price drops
    const { data, error } = await supabase.rpc('get_price_drops', {
      days_back: days,
      category_filter: category && category !== 'all' ? category : null
    });

    if (error) {
      console.error('Error fetching price drops:', error);
      return NextResponse.json({ error: 'Failed to fetch price drops' }, { status: 500 });
    }


    // Transform the data and calculate real price drops
    const allPriceChanges = data?.map(drop => {
      const historicalCurrentPrice = parseFloat(drop.price);
      const previousPrice = parseFloat(drop.previous_price);
      const actualCurrentPrice = parseFloat(drop.current_price); // Current price from machines table
      const priceChange = historicalCurrentPrice - previousPrice;
      const percentageChange = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;
      
      return {
        id: drop.id,
        machineId: drop.machine_id,
        machineName: drop.machine_name,
        company: drop.company,
        currentPrice: actualCurrentPrice, // Use current price from machines table
        historicalCurrentPrice, // The price at the time of the drop
        previousPrice,
        priceChange,
        percentageChange,
        dropDate: drop.date,
        isAllTimeLow: drop.is_all_time_low,
        isNewAllTimeLow: false, // Will be computed in batch below
        productLink: drop.product_link,
        affiliateLink: drop.affiliate_link,
        imageUrl: drop.image_url,
        category: drop.machine_category,
        priceCategory: drop.price_category,
        award: drop.award,
        workArea: drop.work_area,
        dropType: getDropType(percentageChange, drop.is_all_time_low)
      };
    }) || [];

    // Filter to only actual price drops (negative price change) with minimum 1% drop
    // AND ensure the deal is still valid (current price hasn't increased above the deal price)
    let priceDrops = allPriceChanges.filter(drop => 
      drop.priceChange < 0 && 
      Math.abs(drop.percentageChange) >= 1.0 &&
      drop.currentPrice <= drop.historicalCurrentPrice * 1.01 // Allow 1% tolerance for minor price fluctuations
    );

    // Batch compute new ATL status for ATL deals
    priceDrops = await computeNewATLStatus(priceDrops, supabase);


    // Apply additional minimum discount filter if provided
    if (minDiscount > 1.0) {
      priceDrops = priceDrops.filter(drop => Math.abs(drop.percentageChange) >= minDiscount);
    }

    // Deduplicate by machine_id - keep only the most recent price drop per machine
    const uniquePriceDrops = new Map();
    priceDrops.forEach(drop => {
      const existing = uniquePriceDrops.get(drop.machineId);
      if (!existing || new Date(drop.dropDate) > new Date(existing.dropDate)) {
        uniquePriceDrops.set(drop.machineId, drop);
      }
    });
    priceDrops = Array.from(uniquePriceDrops.values());

    // Sort by date (most recent first), then by biggest drops
    priceDrops.sort((a, b) => {
      const dateCompare = new Date(b.dropDate).getTime() - new Date(a.dropDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.priceChange - b.priceChange; // Bigger drops (more negative) first
    });

    // Apply limit
    priceDrops = priceDrops.slice(0, limit);

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

// Batch compute new ATL status for all ATL deals
async function computeNewATLStatus(priceDrops: any[], supabase: any): Promise<any[]> {
  if (!supabase) return priceDrops;
  
  try {
    // Only check ATL deals
    const atlDeals = priceDrops.filter(drop => drop.isAllTimeLow);
    
    if (atlDeals.length === 0) return priceDrops;
    
    // Get unique machine IDs
    const machineIds = [...new Set(atlDeals.map(drop => drop.machineId))];
    
    // Get complete price history for all relevant machines
    const { data: allPriceHistory, error } = await supabase
      .from('price_history')
      .select('machine_id, price, date')
      .in('machine_id', machineIds)
      .order('machine_id, date', { ascending: true });
    
    if (error || !allPriceHistory) {
      console.error('Error fetching price history:', error);
      return priceDrops;
    }
    
    // Group by machine
    const priceHistoryByMachine = allPriceHistory.reduce((acc, record) => {
      if (!acc[record.machine_id]) acc[record.machine_id] = [];
      acc[record.machine_id].push(record);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Update ATL deals with new ATL status
    return priceDrops.map(drop => {
      if (!drop.isAllTimeLow) return drop;
      
      const machineHistory = priceHistoryByMachine[drop.machineId] || [];
      const currentPriceNum = parseFloat(drop.historicalCurrentPrice);
      const currentDate = new Date(drop.dropDate);
      
      // Get all prices before this date
      const previousPrices = machineHistory
        .filter(record => new Date(record.date) < currentDate)
        .map(record => parseFloat(record.price));
      
      // If no previous prices, this is the first record = new ATL
      if (previousPrices.length === 0) {
        return { ...drop, isNewAllTimeLow: true };
      }
      
      // Check if current price is lower than ALL previous prices (with $1 tolerance)
      const isNewATL = previousPrices.every(prevPrice => currentPriceNum < (prevPrice - 1));
      
      return { ...drop, isNewAllTimeLow: isNewATL };
    });
  } catch (error) {
    console.error('Error computing new ATL status:', error);
    return priceDrops;
  }
}