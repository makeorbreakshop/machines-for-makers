export const runtime = 'nodejs';

import { Suspense } from 'react';
import { PriceDropsContent } from './price-drops-content';
import { PriceDropsHero } from '@/components/price-drops/price-drops-hero';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Price Drops & Deals | Machines for Makers',
  description: 'Track real-time price drops on laser cutters, 3D printers, and CNC machines. Never miss a deal with our automated price monitoring.',
};

async function getStats() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/price-drops?days=7&limit=100`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const drops = data.priceDrops || [];

    // Calculate stats
    const totalSavings = drops.reduce((sum: number, drop: any) => 
      sum + Math.abs(drop.priceChange), 0
    );
    
    const biggestDrop = drops.reduce((max: number, drop: any) => 
      Math.max(max, Math.abs(drop.percentageChange)), 0
    );
    
    const allTimeLows = drops.filter((drop: any) => drop.isAllTimeLow).length;

    return {
      totalDrops: drops.length,
      totalSavings: Math.round(totalSavings),
      biggestDrop: Math.round(biggestDrop),
      allTimeLows
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

export default async function PriceDropsPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PriceDropsHero stats={stats || undefined} />
        
        <Suspense fallback={<PriceDropsSkeleton />}>
          <PriceDropsContent />
        </Suspense>
      </div>
    </div>
  );
}

function PriceDropsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}