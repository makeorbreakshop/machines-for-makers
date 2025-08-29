'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PriceDropCard } from '@/components/price-drops/price-drop-card';
import { PriceDropTableRow } from '@/components/price-drops/price-drop-table-row';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, Grid3X3, List } from 'lucide-react';
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
  isNewAllTimeLow: boolean;
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
  sortBy: 'recent',
  days: 14
};

export function PriceDropsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filters from URL params
  const initialFilters = {
    ...defaultFilters,
    days: parseInt(searchParams.get('days') || '14'),
    sortBy: searchParams.get('sort') || 'recent'
  };
  
  const [drops, setDrops] = useState<PriceDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [filteredDrops, setFilteredDrops] = useState<PriceDrop[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortColumn, setSortColumn] = useState<string>('savings');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('priceDropsView') as 'grid' | 'list';
    if (savedView) {
      setViewMode(savedView);
    }
  }, []);
  

  // Fetch price drops
  const fetchDrops = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        days: filters.days.toString(),
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
  }, [filters.days]);

  // Sort drops
  useEffect(() => {
    const sorted = [...drops];

    // Apply sorting based on view mode
    if (viewMode === 'list') {
      // Table view - use column sorting
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortColumn) {
        case 'product':
          sorted.sort((a, b) => direction * a.machineName.localeCompare(b.machineName));
          break;
        case 'currentPrice':
          sorted.sort((a, b) => direction * (a.currentPrice - b.currentPrice));
          break;
        case 'previousPrice':
          sorted.sort((a, b) => direction * (a.previousPrice - b.previousPrice));
          break;
        case 'savings':
          sorted.sort((a, b) => direction * (Math.abs(a.priceChange) - Math.abs(b.priceChange)));
          break;
        case 'discount':
          sorted.sort((a, b) => direction * (Math.abs(a.percentageChange) - Math.abs(b.percentageChange)));
          break;
        case 'allTimeLow':
          sorted.sort((a, b) => {
            // Define sort priority for descending: New Low = 0, Previous Low = 1, No Badge = 2
            const getPriority = (drop: PriceDrop) => {
              if (!drop.isAllTimeLow) return 2;
              return drop.isNewAllTimeLow ? 0 : 1;
            };
            
            const priorityA = getPriority(a);
            const priorityB = getPriority(b);
            
            return direction * (priorityA - priorityB);
          });
          break;
        case 'when':
          sorted.sort((a, b) => direction * (new Date(a.dropDate).getTime() - new Date(b.dropDate).getTime()));
          break;
      }
    } else {
      // Grid view - use dropdown sorting
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
    }

    setFilteredDrops(sorted);
  }, [drops, filters.sortBy, viewMode, sortColumn, sortDirection]);

  // Fetch drops on mount and filter changes
  useEffect(() => {
    fetchDrops();
  }, [fetchDrops]);

  // Update URL when filters change
  const updateURL = useCallback((newFilters: typeof filters) => {
    const params = new URLSearchParams();
    if (newFilters.days !== 14) params.set('days', newFilters.days.toString());
    if (newFilters.sortBy !== 'recent') params.set('sort', newFilters.sortBy);
    
    const newURL = params.toString() ? `?${params.toString()}` : '';
    router.replace(newURL, { scroll: false });
  }, [router]);

  const handleSortChange = (value: string) => {
    const newFilters = { ...filters, sortBy: value };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleDaysChange = (value: string) => {
    const newFilters = { ...filters, days: parseInt(value) };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      // If clicking the same column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a different column, set it as the sort column with desc direction
      setSortColumn(column);
      setSortDirection('desc');
    }
  };


  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header with results count and sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {loading ? 'Loading deals...' : `${filteredDrops.length} Deals Found`}
          </h2>
          {!loading && filteredDrops.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              From the last {filters.days} day{filters.days > 1 ? 's' : ''} • ${Math.round(filteredDrops.reduce((sum, drop) => sum + Math.abs(drop.priceChange), 0) / filteredDrops.length).toLocaleString()} avg savings
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Filter - First */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
            <Select value={filters.days.toString()} onValueChange={handleDaysChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
          
          {/* View Toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9"
              onClick={() => {
                setViewMode("grid");
                localStorage.setItem('priceDropsView', 'grid');
              }}
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="sr-only">Grid View</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9"
              onClick={() => {
                setViewMode("list");
                localStorage.setItem('priceDropsView', 'list');
              }}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List View</span>
            </Button>
          </div>
          
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

      {/* Price Drop Cards Grid or Table */}
      {!loading && !error && filteredDrops.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDrops.map((drop) => (
              <PriceDropCard 
                key={drop.id} 
                drop={drop}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th 
                    className="text-left p-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                    onClick={() => handleColumnSort('product')}
                  >
                    Product {sortColumn === 'product' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                    onClick={() => handleColumnSort('currentPrice')}
                  >
                    Current Price {sortColumn === 'currentPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                    onClick={() => handleColumnSort('previousPrice')}
                  >
                    Previous Price {sortColumn === 'previousPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                    onClick={() => handleColumnSort('savings')}
                  >
                    Savings {sortColumn === 'savings' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                    onClick={() => handleColumnSort('discount')}
                  >
                    Discount {sortColumn === 'discount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center p-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                    onClick={() => handleColumnSort('allTimeLow')}
                  >
                    Type {sortColumn === 'allTimeLow' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                    onClick={() => handleColumnSort('when')}
                  >
                    When {sortColumn === 'when' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center p-2 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrops.map((drop) => (
                  <PriceDropTableRow
                    key={drop.id}
                    drop={drop}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Load More Info */}
      {!loading && !error && drops.length >= 50 && (
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing top {filteredDrops.length} deals from the last {filters.days} day{filters.days > 1 ? 's' : ''}.
          </p>
        </div>
      )}
    </div>
  );
}