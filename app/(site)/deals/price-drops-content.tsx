'use client';

import { useState, useEffect, useCallback } from 'react';
import { PriceDropCard } from '@/components/price-drops/price-drop-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  sortBy: 'recent'
};

export function PriceDropsContent() {
  const [drops, setDrops] = useState<PriceDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [filteredDrops, setFilteredDrops] = useState<PriceDrop[]>([]);
  

  // Fetch price drops
  const fetchDrops = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        days: '30',
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
  }, []);

  // Sort drops
  useEffect(() => {
    let sorted = [...drops];

    // Apply sorting
    switch (filters.sortBy) {
      case 'discount-percent':
        sorted.sort((a, b) => a.percentageChange - b.percentageChange); // More negative = bigger discount
        break;
      case 'discount-amount':
        sorted.sort((a, b) => a.priceChange - b.priceChange); // More negative = bigger savings
        break;
      case 'price-low':
        sorted.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case 'all-time-lows':
        sorted.sort((a, b) => {
          if (a.isAllTimeLow && !b.isAllTimeLow) return -1;
          if (!a.isAllTimeLow && b.isAllTimeLow) return 1;
          return a.percentageChange - b.percentageChange; // Then by biggest discount
        });
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

  const handleSortChange = (value: string) => {
    setFilters(prev => ({ ...prev, sortBy: value }));
  };


  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header with results count and sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">
          {loading ? 'Loading deals...' : `${filteredDrops.length} Deals Found`}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="discount-percent">Biggest Discount %</SelectItem>
              <SelectItem value="discount-amount">Biggest Savings $</SelectItem>
              <SelectItem value="all-time-lows">All-Time Lows</SelectItem>
              <SelectItem value="price-low">Lowest Price</SelectItem>
              <SelectItem value="price-high">Highest Price</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
            No price drops found.
          </p>
        </div>
      )}

      {/* Price Drop Cards Grid */}
      {!loading && !error && filteredDrops.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDrops.map((drop) => (
            <PriceDropCard 
              key={drop.id} 
              drop={drop}
            />
          ))}
        </div>
      )}

      {/* Load More Info */}
      {!loading && !error && drops.length >= 50 && (
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing top {filteredDrops.length} deals from the last 30 days.
          </p>
        </div>
      )}
    </div>
  );
}