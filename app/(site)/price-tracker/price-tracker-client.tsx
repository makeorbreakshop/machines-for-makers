'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  TrendingDown, TrendingUp, DollarSign, Activity, 
  AlertCircle, Star, Clock, BarChart3, Filter,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PriceAnalytics {
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  isAtLowest: boolean;
  isNearLowest: boolean;
  volatility: number;
  lastChange: {
    from: number;
    to: number;
    amount: number;
    percent: number;
  } | null;
  priceCount: number;
}

interface Machine {
  id: string;
  name: string;
  slug: string;
  affiliate_url?: string;
  url?: string;
  main_image?: string;
  currentPrice: number;
  regularPrice: number;
  savings: number;
  savingsPercent: number;
  isOnSale: boolean;
  price_last_updated?: string;
  brands?: {
    name: string;
    slug: string;
  };
  categories?: {
    name: string;
    slug: string;
  };
  analytics: PriceAnalytics;
  priceHistory: Array<{
    price: number;
    created_at: string;
  }>;
}

interface PriceTrackerClientProps {
  initialMachines: Machine[];
}

export default function PriceTrackerClient({ initialMachines }: PriceTrackerClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [view, setView] = useState<'deals' | 'all-time-lows' | 'volatile' | 'all'>('deals');
  const [sortBy, setSortBy] = useState<string>('savings_percent');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Get unique categories and brands
  const { categories, brands } = useMemo(() => {
    const uniqueCategories = new Set<string>();
    const uniqueBrands = new Set<string>();
    
    initialMachines.forEach(machine => {
      if (machine.categories?.name) uniqueCategories.add(machine.categories.name);
      if (machine.brands?.name) uniqueBrands.add(machine.brands.name);
    });
    
    return {
      categories: Array.from(uniqueCategories).sort(),
      brands: Array.from(uniqueBrands).sort()
    };
  }, [initialMachines]);

  // Filter and sort machines
  const filteredMachines = useMemo(() => {
    let filtered = initialMachines;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(machine =>
        machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.brands?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(machine => machine.categories?.name === categoryFilter);
    }

    // Brand filter
    if (brandFilter !== 'all') {
      filtered = filtered.filter(machine => machine.brands?.name === brandFilter);
    }

    // View filter
    switch (view) {
      case 'deals':
        filtered = filtered.filter(m => m.isOnSale);
        break;
      case 'all-time-lows':
        filtered = filtered.filter(m => m.analytics.isAtLowest || m.analytics.isNearLowest);
        break;
      case 'volatile':
        filtered = filtered.filter(m => m.analytics.volatility > 50);
        break;
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'savings_percent':
          return b.savingsPercent - a.savingsPercent;
        case 'savings_amount':
          return b.savings - a.savings;
        case 'price_low':
          return a.currentPrice - b.currentPrice;
        case 'price_high':
          return b.currentPrice - a.currentPrice;
        case 'volatility':
          return b.analytics.volatility - a.analytics.volatility;
        case 'recent_change':
          const aChange = a.analytics.lastChange?.percent || 0;
          const bChange = b.analytics.lastChange?.percent || 0;
          return Math.abs(bChange) - Math.abs(aChange);
        default:
          return 0;
      }
    });
  }, [initialMachines, searchTerm, categoryFilter, brandFilter, view, sortBy]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const onSale = initialMachines.filter(m => m.isOnSale);
    const atLows = initialMachines.filter(m => m.analytics.isAtLowest);
    const highVolatility = initialMachines.filter(m => m.analytics.volatility > 100);
    const recentChanges = initialMachines.filter(m => m.analytics.lastChange);
    
    return {
      totalTracked: initialMachines.length,
      currentDeals: onSale.length,
      atAllTimeLows: atLows.length,
      highVolatility: highVolatility.length,
      recentChanges: recentChanges.length,
      totalSavings: onSale.reduce((sum, m) => sum + m.savings, 0)
    };
  }, [initialMachines]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Price Tracker</h1>
        <p className="text-lg text-muted-foreground">
          Track price history, trends, and analytics for all machines.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.totalTracked}</div>
          <div className="text-sm text-muted-foreground">Total Tracked</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.currentDeals}</div>
          <div className="text-sm text-muted-foreground">On Sale Now</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.atAllTimeLows}</div>
          <div className="text-sm text-muted-foreground">At All-Time Lows</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.highVolatility}</div>
          <div className="text-sm text-muted-foreground">High Volatility</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.recentChanges}</div>
          <div className="text-sm text-muted-foreground">Recent Changes</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">${stats.totalSavings.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Savings</div>
        </Card>
      </div>

      {/* Filters and View Tabs */}
      <div className="mb-6 space-y-4">
        <Tabs value={view} onValueChange={(v: any) => setView(v)}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="deals">Current Deals</TabsTrigger>
            <TabsTrigger value="all-time-lows">All-Time Lows</TabsTrigger>
            <TabsTrigger value="volatile">High Volatility</TabsTrigger>
            <TabsTrigger value="all">All Machines</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Search machines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(brand => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings_percent">Highest % Off</SelectItem>
              <SelectItem value="savings_amount">Highest $ Savings</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="volatility">Most Volatile</SelectItem>
              <SelectItem value="recent_change">Recent Changes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMachines.map((machine) => {
          const isExpanded = expandedCards.has(machine.id);
          
          return (
            <Card key={machine.id} className="overflow-hidden">
              <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                <Link href={`/products/${machine.slug}`}>
                  {machine.main_image ? (
                    <Image
                      src={machine.main_image}
                      alt={machine.name}
                      fill
                      className="object-contain p-4"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No image
                    </div>
                  )}
                </Link>
                
                {/* Badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  {machine.isOnSale && (
                    <Badge className="bg-red-500 text-white">
                      {machine.savingsPercent}% OFF
                    </Badge>
                  )}
                  {machine.analytics.isAtLowest && (
                    <Badge className="bg-blue-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      All-Time Low
                    </Badge>
                  )}
                  {machine.analytics.volatility > 100 && (
                    <Badge className="bg-orange-500 text-white">
                      <Activity className="h-3 w-3 mr-1" />
                      High Volatility
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-4">
                <Link href={`/products/${machine.slug}`}>
                  <h3 className="font-semibold mb-1 line-clamp-2 hover:text-primary">
                    {machine.name}
                  </h3>
                </Link>
                {machine.brands && (
                  <p className="text-sm text-muted-foreground mb-3">{machine.brands.name}</p>
                )}

                {/* Current Pricing */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      ${machine.currentPrice.toLocaleString()}
                    </span>
                    {machine.isOnSale && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          ${machine.regularPrice.toLocaleString()}
                        </span>
                        <span className="text-sm text-green-600">
                          Save ${machine.savings.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price Analytics Summary */}
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">90-Day Range:</span>
                    <span>
                      ${machine.analytics.lowestPrice.toLocaleString()} - ${machine.analytics.highestPrice.toLocaleString()}
                    </span>
                  </div>
                  
                  {machine.analytics.lastChange && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Change:</span>
                      <div className="flex items-center gap-1">
                        {machine.analytics.lastChange.amount > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span className={machine.analytics.lastChange.amount > 0 ? 'text-red-500' : 'text-green-500'}>
                          {machine.analytics.lastChange.percent}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expand/Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => toggleExpanded(machine.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>

                {/* Expanded Analytics */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Average Price:</span>
                        <div className="font-medium">${machine.analytics.averagePrice.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Volatility:</span>
                        <div className="font-medium">${machine.analytics.volatility}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data Points:</span>
                        <div className="font-medium">{machine.analytics.priceCount}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span>
                        <div className="font-medium">
                          {machine.price_last_updated 
                            ? new Date(machine.price_last_updated).toLocaleDateString()
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mini price chart could go here */}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  <Button asChild className="flex-1" variant="default">
                    <a
                      href={machine.affiliate_url || machine.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Deal
                    </a>
                  </Button>
                  <Button asChild className="flex-1" variant="outline">
                    <Link href={`/products/${machine.slug}`}>
                      Details
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredMachines.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            No machines found matching your filters.
          </p>
        </div>
      )}
    </div>
  );
}