'use client';

import { useState, useEffect, useCallback } from 'react';
import { PriceDropCard } from '@/components/price-drops/price-drop-card';
import { PriceDropsFilters } from '@/components/price-drops/price-drops-filters';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Filter, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useComparison } from '@/contexts/comparison-context';
import { useRouter } from 'next/navigation';

interface PriceDrop {
  id: string;
  machineId: string;
  machineName: string;
  company: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  percentageChange: number;
  dropDate: string;
  isAllTimeLow: boolean;
  productLink: string;
  affiliateLink?: string;
  imageUrl?: string;
  category: string;
  priceCategory?: string;
  award?: string;
  workArea?: string;
  dropType: string;
}

const defaultFilters = {
  category: 'all',
  minDiscount: '0',
  days: '7',
  sortBy: 'recent'
};

export function PriceDropsContent() {
  const [drops, setDrops] = useState<PriceDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [filteredDrops, setFilteredDrops] = useState<PriceDrop[]>([]);
  
  const { addToComparison } = useComparison();
  const router = useRouter();

  // Fetch price drops
  const fetchDrops = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        days: filters.days,
        category: filters.category !== 'all' ? filters.category : '',
        minDiscount: filters.minDiscount,
        limit: '50'
      });

      const response = await fetch(`/api/price-drops?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch price drops');
      }

      const data = await response.json();
      setDrops(data.priceDrops || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters.days, filters.category, filters.minDiscount]);

  // Sort and filter drops
  useEffect(() => {
    let sorted = [...drops];

    // Apply sorting
    switch (filters.sortBy) {
      case 'percentage':
        sorted.sort((a, b) => a.percentageChange - b.percentageChange);
        break;
      case 'amount':
        sorted.sort((a, b) => a.priceChange - b.priceChange);
        break;
      case 'price-low':
        sorted.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => new Date(b.dropDate).getTime() - new Date(a.dropDate).getTime());
    }

    setFilteredDrops(sorted);
  }, [drops, filters.sortBy]);

  // Fetch drops on mount and filter changes
  useEffect(() => {
    fetchDrops();
  }, [fetchDrops]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  const handleCompare = (machineId: string) => {
    const drop = drops.find(d => d.machineId === machineId);
    if (drop) {
      addToComparison({
        id: drop.machineId,
        name: drop.machineName,
        price: drop.currentPrice,
        image: drop.imageUrl
      });
      router.push('/compare');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Desktop Filters */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-4 space-y-6">
          <h2 className="text-lg font-semibold">Filters</h2>
          <PriceDropsFilters 
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Mobile Filter Button */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <h2 className="text-lg font-semibold">
            {loading ? 'Loading...' : `${filteredDrops.length} Deals Found`}
          </h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <PriceDropsFilters 
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={handleReset}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Results Count - Desktop */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {loading ? 'Loading...' : `${filteredDrops.length} Deals Found`}
          </h2>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* No Results */}
        {!loading && !error && filteredDrops.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No price drops found matching your criteria.
            </p>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="mt-4"
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Price Drop Cards Grid */}
        {!loading && !error && filteredDrops.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDrops.map((drop) => (
              <PriceDropCard 
                key={drop.id} 
                drop={drop}
                onCompare={handleCompare}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && !error && drops.length >= 50 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing top {filteredDrops.length} deals. More deals may be available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}