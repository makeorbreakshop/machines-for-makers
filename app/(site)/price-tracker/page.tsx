export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import PriceTrackerClient from './price-tracker-client';

export const metadata: Metadata = {
  title: 'Price Tracker | Machines for Makers',
  description: 'Track price history and trends for all laser cutters, 3D printers, and CNC machines.',
};

async function getAllMachinesWithPriceData() {
  const supabase = createServerClient();
  
  // Get all machines with pricing data
  const { data: machines, error } = await supabase
    .from('machines')
    .select(`
      id,
      "Machine Name",
      "Internal link",
      "Affiliate Link",
      Image,
      Price,
      Company,
      "Machine Category",
      "Laser Category"
    `)
    .not('Price', 'is', null)
    .order('"Machine Name"');

  if (error) {
    console.error('Error fetching machines:', error);
    return [];
  }

  // Get price history for all machines (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const machineIds = machines.map(m => m.id);
  const { data: priceHistory, error: historyError } = await supabase
    .from('price_history')
    .select('machine_id, price, previous_price, date, is_all_time_low')
    .in('machine_id', machineIds)
    .gte('date', ninetyDaysAgo.toISOString())
    .in('status', ['AUTO_APPLIED', 'MANUAL_CORRECTION', 'SUCCESS'])
    .order('date', { ascending: true });

  if (historyError) {
    console.error('Error fetching price history:', historyError);
  }

  // Process data for each machine
  const machinesWithAnalytics = machines.map(machine => {
    const history = priceHistory?.filter(h => h.machine_id === machine.id) || [];
    const prices = history.map(h => h.price);
    
    const currentPrice = machine['Price'] || 0;
    
    // Find the most recent previous price to determine if on sale
    let regularPrice = currentPrice;
    let savings = 0;
    let savingsPercent = 0;
    let isOnSale = false;
    
    // Check latest price history entry for price drop
    if (history.length > 0) {
      const latestHistory = history[history.length - 1];
      if (latestHistory.previous_price && latestHistory.previous_price > currentPrice) {
        regularPrice = latestHistory.previous_price;
        savings = regularPrice - currentPrice;
        savingsPercent = Math.round((savings / regularPrice) * 100);
        isOnSale = true;
      }
    }
    
    // Calculate price analytics
    const lowestPrice = prices.length > 0 ? Math.min(...prices, currentPrice) : currentPrice;
    const highestPrice = prices.length > 0 ? Math.max(...prices, currentPrice) : currentPrice;
    const averagePrice = prices.length > 0 
      ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
      : currentPrice;
    
    const isAtLowest = currentPrice === lowestPrice;
    const isNearLowest = currentPrice <= lowestPrice * 1.05; // Within 5% of lowest
    
    // Price volatility (standard deviation)
    const volatility = prices.length > 1 ? calculateVolatility(prices) : 0;
    
    // Last price change
    let lastChange = null;
    if (history.length > 0) {
      const latestHistory = history[history.length - 1];
      if (latestHistory.previous_price && latestHistory.previous_price !== currentPrice) {
        lastChange = {
          from: latestHistory.previous_price,
          to: currentPrice,
          amount: currentPrice - latestHistory.previous_price,
          percent: Math.round(((currentPrice - latestHistory.previous_price) / latestHistory.previous_price) * 100)
        };
      }
    }
    
    // Check if any history shows all-time low
    const hasAllTimeLow = history.some(h => h.is_all_time_low);
    
    return {
      id: machine.id,
      name: machine['Machine Name'],
      slug: machine['Internal link'],
      affiliate_url: machine['Affiliate Link'],
      url: machine['Affiliate Link'],
      main_image: machine['Image'],
      currentPrice,
      regularPrice,
      savings,
      savingsPercent,
      isOnSale,
      price_last_updated: null,
      brands: machine['Company'] ? { name: machine['Company'], slug: '' } : undefined,
      categories: machine['Machine Category'] ? { name: machine['Machine Category'], slug: '' } : undefined,
      priceHistory: history,
      analytics: {
        lowestPrice,
        highestPrice,
        averagePrice,
        isAtLowest: isAtLowest || hasAllTimeLow,
        isNearLowest,
        volatility,
        lastChange,
        priceCount: prices.length
      }
    };
  });

  return machinesWithAnalytics;
}

function calculateVolatility(prices: number[]): number {
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  return Math.round(Math.sqrt(variance));
}

export default async function PriceTrackerPage() {
  const machines = await getAllMachinesWithPriceData();

  return <PriceTrackerClient initialMachines={machines} />;
}