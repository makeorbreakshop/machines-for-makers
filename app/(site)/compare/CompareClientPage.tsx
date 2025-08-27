"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import dynamic from 'next/dynamic'
import ProductsGrid from "@/components/products-grid"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid, Table, Zap, Box, Layers, Maximize2, Minimize2, Briefcase, Smartphone, X, Camera, Wifi, ArrowUpDown, Filter, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import FilterButton from "@/components/filter-button"
import SidebarFilter from "@/components/sidebar-filter"
import { Skeleton } from "@/components/ui/skeleton"
import { ComparisonProvider, useComparison } from "@/context/comparison-context"
import ComparisonBar from "@/components/comparison-bar"
import type { Machine, Category, Brand } from "@/lib/database-types"
import { DialogContent, DialogTitle } from "@/components/ui/dialog"
import { SearchBar } from "@/components/search-bar"
import { Loader2 } from "lucide-react"
import React from "react"
import { Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { debounce } from 'lodash'
import UnifiedFilter from "@/components/unified-filter"
import { debug, checkForRateLimiting, checkSupabaseStatus } from "./debug-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useQuery } from '@tanstack/react-query'

// Simple debug utility that only logs in development
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Dynamically import heavy components with increased loading delay to prevent hydration issues
const ComparisonTable = dynamic(() => import('@/components/comparison-table'), {
  loading: () => (
    <div className="w-full h-[500px] p-8 flex items-center justify-center bg-gray-50 border rounded-lg">
      <div className="flex flex-col items-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <span>Loading comparison table...</span>
      </div>
    </div>
  ),
  ssr: false
})

const EnhancedComparisonTable = dynamic(() => import('@/components/enhanced-comparison-table'), {
  loading: () => (
    <div className="w-full h-[500px] p-8 flex items-center justify-center bg-gray-50 border rounded-lg">
      <div className="flex flex-col items-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <span>Loading enhanced comparison table...</span>
      </div>
    </div>
  ),
  ssr: false
})

// Declare global debug properties for TypeScript
declare global {
  interface Window {
    __DEBUG_FIBER_MACHINES?: string[];
    __DEBUG_LAST_FILTER_COUNT?: number;
  }
}

// Helper function for laser type matching - extracted to ensure consistent matching logic
function matchesLaserType(product: Machine, laserType: string): boolean {
  // Normalize by converting to lowercase, trimming spaces, and standardizing format
  const normalizedType = laserType.toLowerCase().trim().replace(/ /g, '-');
  
  // Get the product's laser types and normalize them the same way
  const productLaserTypeA = (product["Laser Type A"] || "").toLowerCase().trim();
  const productLaserTypeB = (product["Laser Type B"] || "").toLowerCase().trim();
  
  // Direct matching on Laser Type fields (case-insensitive with normalized format)
  return productLaserTypeA === normalizedType || productLaserTypeB === normalizedType;
}

// Helper function to get category icon - moved outside component to prevent recreation
function getCategoryIcon(categoryName: string) {
  switch (categoryName) {
    case "Desktop Galvo":
      return <Zap className="h-5 w-5" />
    case "High End Fiber":
      return <Maximize2 className="h-5 w-5" />
    case "High End CO2":
      return <Briefcase className="h-5 w-5" />
    case "Desktop CO2":
      return <Box className="h-5 w-5" />
    case "Desktop Diode":
      return <Minimize2 className="h-5 w-5" />
    case "Open Diode":
      return <Smartphone className="h-5 w-5" />
    default:
      return <Layers className="h-5 w-5" />
  }
}

// Feature Button Component - extracted to its own component
const FeatureButton = React.memo(({ feature, icon }: { feature: string, icon: React.ReactNode }) => {
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center justify-center gap-2 py-3 px-4 h-auto"
    >
      {icon}
      <span className="text-sm">{feature}</span>
    </Button>
  )
})
FeatureButton.displayName = 'FeatureButton';

// ViewToggle component - modified to use props instead of custom events
const ViewToggle = React.memo(function ViewToggle({ 
  onViewChange, 
  onSortChange, 
  currentView, 
  currentSort 
}: { 
  onViewChange: (view: 'grid' | 'table') => void, 
  onSortChange: (sort: string) => void, 
  currentView: 'grid' | 'table', 
  currentSort: string 
}) {
  // Local state now synced with props
  const [view, setView] = useState<'grid' | 'table'>(currentView)
  const [sortOption, setSortOption] = useState(currentSort)

  // This function will be called when the component mounts
  useEffect(() => {
    // Get the view from localStorage or default to grid
    const savedView = localStorage.getItem("view") || "grid"
    setView(savedView as 'grid' | 'table')
    
    // Get the sort option from localStorage or default to price-asc
    const savedSort = localStorage.getItem("sortOption") || "price-asc"
    setSortOption(savedSort)
    
    // Notify parent components of the initial values
    onViewChange(savedView as 'grid' | 'table')
    onSortChange(savedSort)
  }, [onViewChange, onSortChange])

  // Update view and save to localStorage
  const updateView = useCallback((newView: 'grid' | 'table') => {
    setView(newView)
    localStorage.setItem("view", newView)
    // Call the callback function directly instead of using a custom event
    onViewChange(newView)
  }, [onViewChange])

  // Update sort option and save to localStorage
  const updateSort = useCallback((newSort: string) => {
    setSortOption(newSort)
    localStorage.setItem("sortOption", newSort)
    // Call the callback function directly instead of using a custom event
    onSortChange(newSort)
  }, [onSortChange])

  // Get the sort option label for display
  const getSortLabel = useCallback((option: string) => {
    switch (option) {
      case "price-asc":
        return "Price: Low to High"
      case "price-desc":
        return "Price: High to Low"
      case "power-desc":
        return "Power: High to Low"
      case "speed-desc":
        return "Speed: High to Low"
      case "name-asc":
        return "Name: A to Z"
      default:
        return "Price: Low to High"
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <div className="flex border rounded-md overflow-hidden">
        <Button
          variant={view === "grid" ? "default" : "ghost"}
          size="sm"
          className="rounded-none"
          onClick={() => updateView("grid")}
        >
          <Grid className="h-4 w-4" />
          <span className="sr-only">Grid View</span>
        </Button>
        <Button
          variant={view === "table" ? "default" : "ghost"}
          size="sm"
          className="rounded-none"
          onClick={() => updateView("table")}
        >
          <Table className="h-4 w-4" />
          <span className="sr-only">Table View</span>
        </Button>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Sort</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => updateSort("price-asc")}>
            {sortOption === "price-asc" && <Check className="h-4 w-4 mr-2" />}
            Price: Low to High
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateSort("price-desc")}>
            {sortOption === "price-desc" && <Check className="h-4 w-4 mr-2" />}
            Price: High to Low
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateSort("power-desc")}>
            {sortOption === "power-desc" && <Check className="h-4 w-4 mr-2" />}
            Power: High to Low
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateSort("speed-desc")}>
            {sortOption === "speed-desc" && <Check className="h-4 w-4 mr-2" />}
            Speed: High to Low
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateSort("name-asc")}>
            {sortOption === "name-asc" && <Check className="h-4 w-4 mr-2" />}
            Name: A to Z
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

interface Filters {
  laserTypes: string[]
  priceRange: [number, number]
  powerRange: [number, number]
  speedRange: [number, number]
  features: string[]
  isTopPick: boolean
}

// Feature list section with centered text buttons - extracted as a separate component
const FeaturesList = React.memo(function FeaturesList() {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Features</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5" style={{ minHeight: '80px' }}>
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Camera className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>Camera</span>
        </Button>
        
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Wifi className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>WiFi</span>
        </Button>
        
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Box className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>Enclosure</span>
        </Button>
        
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Box className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>Auto Focus</span>
        </Button>
        
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Box className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>Passthrough</span>
        </Button>
      </div>
    </div>
  )
})

// Unified filtering function with optimized performance
function applyAllFilters(products: Machine[], filters: Filters): Machine[] {
  // Skip filtering if no filters are explicitly set
  const isUsingDefaultFilters = 
    filters.laserTypes.length === 0 && 
    filters.features.length === 0 && 
    filters.priceRange[0] === 0 && 
    filters.priceRange[1] === 15000 &&
    filters.powerRange[0] === 0 && 
    filters.powerRange[1] === 150 &&
    filters.speedRange[0] === 0 && 
    filters.speedRange[1] === 2000 &&
    !filters.isTopPick;
  
  if (isUsingDefaultFilters) {
    return products; // Return all products if using default filters
  }
  
  // Apply all filters sequentially to maintain clean and predictable behavior
  let filteredProducts = [...products];
  
  // 1. Apply Top Pick filter first
  if (filters.isTopPick) {
    filteredProducts = filteredProducts.filter(product => product.Award);
  }
  
  // 2. Apply laser type filter - this is always the thorough matching version
  if (filters.laserTypes.length > 0) {
    filteredProducts = filteredProducts.filter(product => 
      filters.laserTypes.some(laserType => matchesLaserType(product, laserType))
    );
  }
  
  // 3. Apply price range filter
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 15000) {
    filteredProducts = filteredProducts.filter(product => {
      const price = parseFloat(String(product.Price || 0));
      return !isNaN(price) && price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });
  }
  
  // 4. Apply power range filter
  if (filters.powerRange[0] > 0 || filters.powerRange[1] < 150) {
    filteredProducts = filteredProducts.filter(product => {
      const powerStr = product["Laser Power A"] || "0";
      let power = 0;
      try {
        power = typeof powerStr === 'number' 
          ? powerStr 
          : parseFloat(powerStr.toString().replace(/[^0-9.-]+/g,""));
      } catch (e) {
        power = 0;
      }
      
      return !isNaN(power) && power >= filters.powerRange[0] && power <= filters.powerRange[1];
    });
  }
  
  // 5. Apply speed range filter
  if (filters.speedRange[0] > 0 || filters.speedRange[1] < 2000) {
    filteredProducts = filteredProducts.filter(product => {
      const speedStr = product.Speed || "0";
      let speed = 0;
      try {
        speed = typeof speedStr === 'number' 
          ? speedStr 
          : parseFloat(speedStr.toString().replace(/[^0-9.-]+/g,""));
      } catch (e) {
        speed = 0;
      }
      
      return !isNaN(speed) && speed >= filters.speedRange[0] && speed <= filters.speedRange[1];
    });
  }
  
  // 6. Apply features filter last
  if (filters.features.length > 0) {
    filteredProducts = filteredProducts.filter(product => {
      return filters.features.every((feature) => {
        switch (feature) {
          case "Camera":
            return product.Camera === "Yes";
          case "Wifi":
            return product.Wifi === "Yes";
          case "Enclosure":
            return product.Enclosure === "Yes";
          case "Focus":
            return product.Focus === "Auto";
          case "Passthrough":
            return product.Passthrough === "Yes";
          default:
            return false;
        }
      });
    });
  }
  
  return filteredProducts;
}

// Rate Limit Warning component 
interface RateLimitWarningProps {
  details: string[];
  onRefresh: () => void;
  isLoading: boolean;
}

const RateLimitWarning = ({ details, onRefresh, isLoading }: RateLimitWarningProps) => {
  if (details.length === 0) return null;
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Performance Issue Detected</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>The database may be experiencing high load or rate limiting:</p>
          <ul className="list-disc pl-5 text-sm">
            {details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
            className="mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Data'
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default function CompareClientPage({
  initialProducts,
  categories,
  brands,
}: {
  initialProducts: Machine[]
  categories: Category[]
  brands: Brand[]
}) {
  // Define the laser type mapping between UI display names and database values
  const laserTypeMap = useMemo(() => ({
    "Fiber": "Fiber",
    "Infrared": "Infrared",
    "MOPA": "MOPA",
    "CO2 RF": "CO2-RF",
    "CO2 Glass": "CO2-Glass",
    "Diode": "Diode",
    "UV": "UV"
  }), []);
  
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [sortOption, setSortOption] = useState('price-asc')
  const [products, setProducts] = useState<Machine[]>(initialProducts)
  const [filteredProducts, setFilteredProducts] = useState<Machine[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(30) // Start showing 30 items
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [quickFilter, setQuickFilter] = useState('')
  const [filters, setFilters] = useState<Filters>({
    laserTypes: [],
    priceRange: [0, 15000],
    powerRange: [0, 150],
    speedRange: [0, 2000],
    features: [],
    isTopPick: false
  })
  const [selectedProducts, setSelectedProducts] = useState<Machine[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filterUpdateCounter, setFilterUpdateCounter] = useState<number>(0);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isRateLimited: boolean;
    isThrottled: boolean;
    details: string[];
    lastChecked: Date;
  }>({
    isRateLimited: false,
    isThrottled: false,
    details: [],
    lastChecked: new Date()
  })

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredProducts.length) {
          // Show 30 more items when scrolling near bottom
          setVisibleCount(prev => Math.min(prev + 30, filteredProducts.length))
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px'
      }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [visibleCount, filteredProducts.length])

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(30)
  }, [filters, searchQuery])

  // React Query implementation
  const { data: machinesData, isLoading, error } = useQuery({
    queryKey: ['machines', filters],
    queryFn: async () => {
      const response = await fetch(`/api/machines?limit=1000`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Check for rate limiting
      const rateLimitCheck = checkForRateLimiting(response);
      
      // Update rate limit state if issues are detected
      if (rateLimitCheck.isRateLimited || rateLimitCheck.isThrottled || rateLimitCheck.details.length > 0) {
        setRateLimitInfo({
          isRateLimited: rateLimitCheck.isRateLimited,
          isThrottled: rateLimitCheck.isThrottled,
          details: rateLimitCheck.details,
          lastChecked: new Date()
        });
        
        // If rate limited, try to get Supabase status
        if (rateLimitCheck.isRateLimited) {
          checkSupabaseStatus().then(statusCheck => {
            if (statusCheck.details.length > 0) {
              setRateLimitInfo(prev => ({
                ...prev,
                details: [...prev.details, ...statusCheck.details]
              }));
            }
          });
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,   // Keep cache for 10 minutes
    initialData: { data: initialProducts, count: initialProducts.length }
  });
  
  // Update products when query data changes
  useEffect(() => {
    if (machinesData?.data) {
      setProducts(machinesData.data);
    }
  }, [machinesData]);
  
  // Update filtered products when products or filters change
  useEffect(() => {
    if (products.length > 0) {
      const filtered = applyAllFilters(products, filters);
      setFilteredProducts(filtered);
    }
  }, [products, filters]);

  // Define a sort function for use in the memoized values
  const sortProducts = useCallback((productsToSort: Machine[]) => {
    return [...productsToSort].sort((a, b) => {
      switch (sortOption) {
        case "price-asc":
          const priceA = typeof a.Price === 'number' ? a.Price : parseFloat(String(a.Price || 0));
          const priceB = typeof b.Price === 'number' ? b.Price : parseFloat(String(b.Price || 0));
          return priceA - priceB;
        case "price-desc":
          const priceA2 = typeof a.Price === 'number' ? a.Price : parseFloat(String(a.Price || 0));
          const priceB2 = typeof b.Price === 'number' ? b.Price : parseFloat(String(b.Price || 0));
          return priceB2 - priceA2;
        case "power-desc":
          const powerA = parseFloat(String(a["Laser Power A"] || 0));
          const powerB = parseFloat(String(b["Laser Power A"] || 0));
          return powerB - powerA;
        case "speed-desc":
          const speedA = parseFloat(String(a.Speed || 0));
          const speedB = parseFloat(String(b.Speed || 0));
          return speedB - speedA;
        case "name-asc":
          const nameA = a["Machine Name"] || "";
          const nameB = b["Machine Name"] || "";
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });
  }, [sortOption]);
  
  // Replace existing fetchProducts with this one that just triggers a refetch
  const fetchProducts = () => {
    // React Query handles the actual fetching
    return;
  };
  
  // Keep the loading state in sync with React Query
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // State for mobile filters
  const [activeFilters, setActiveFilters] = useState<{
    laserTypes: string[]
    brands: string[]
    priceRange: [number, number]
    powerRange: [number, number]
    speedRange: [number, number]
    features: string[]
    isTopPick: boolean
  }>({
    laserTypes: filters.laserTypes,
    brands: [],
    priceRange: filters.priceRange,
    powerRange: filters.powerRange,
    speedRange: filters.speedRange,
    features: filters.features,
    isTopPick: filters.isTopPick,
  });

  // Filter products based on selected filters - now just a wrapper for applyAllFilters for backward compatibility
  const filterProducts = useCallback((product: Machine, filters: Filters) => {
    // Use the unified filter to ensure consistency
    const filtered = applyAllFilters([product], filters);
    return filtered.length > 0;
  }, []);

  // Handle search results
  const handleSearch = React.useCallback((results: Machine[]) => {
    if (results.length === 0) {
      // If search returns no results, just show filtered products based on current filters
      const filteredByFilters = applyAllFilters(products, filters);
      setFilteredProducts(filteredByFilters);
    } else {
      // First apply filters to the search results
      const filteredSearchResults = applyAllFilters(results, filters);
      setFilteredProducts(filteredSearchResults);
    }
  }, [products, filters]);

  // Debounced fetchProducts to reduce excessive API calls
  const debouncedFetchProducts = useMemo(() => 
    debounce(async (searchQuery: string, filters: Filters) => {
      setLoading(true);
      try {
        // Your existing fetchProducts logic
        // ...
      } catch (error) {
        debug.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [] // Empty dependency array ensures this is only created once
  );
  
  // Memoize filtered results to avoid recalculation
  const displayProducts = useMemo(() => {
    if (isLoading) return [];
    // Apply sorting here directly
    return sortProducts(filteredProducts);
  }, [filteredProducts, isLoading, sortProducts]);

  // Create a final sorted array with lazy loading applied
  const finalSortedProducts = React.useMemo(() => {
    // Only show up to visibleCount items
    return displayProducts.slice(0, visibleCount);
  }, [displayProducts, visibleCount]);
  
  // Initial load of products
  useEffect(() => {
    fetchProducts()
  }, []) // Remove dependency on filters

  // Count active filters
  const activeFilterCount =
    (filters.isTopPick ? 1 : 0) +
    filters.laserTypes.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 15000 ? 1 : 0) +
    (filters.powerRange[0] > 0 || filters.powerRange[1] < 150 ? 1 : 0) +
    (filters.speedRange[0] > 0 || filters.speedRange[1] < 2000 ? 1 : 0) +
    (filters.features.length || 0)

  // Handler for applying filters
  function handleApplyFilters(filters: any) {
    // Update the active filters state for the mobile filter button
    setActiveFilters(filters);
    
    // Update the filters state with filter values
    setFilters({
      laserTypes: filters.laserTypes || [],
      priceRange: filters.priceRange || [0, 15000],
      powerRange: filters.powerRange || [0, 150],
      speedRange: filters.speedRange || [0, 2000],
      features: filters.features || [],
      isTopPick: filters.isTopPick || false,
    });
    
    // Apply filters by triggering a re-filter
    setLoading(true);
    setFilterUpdateCounter(prev => prev + 1);
    
    // Ensure loading state is reset after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }

  // Function to clear all filters
  const clearAllFilters = useCallback(() => {
    // Show loading state
    setLoading(true);
    
    const resetFilters = {
      laserTypes: [] as string[],
      priceRange: [0, 15000] as [number, number],
      powerRange: [0, 150] as [number, number],
      speedRange: [0, 2000] as [number, number],
      features: [] as string[],
      isTopPick: false,
    };
    
    // Update filters state
    setFilters(resetFilters);
    
    // Update mobile filters state
    setActiveFilters({
      ...resetFilters,
      brands: [] as string[],
    });
    
    // Reset filtered products to show all products
    setFilteredProducts(products);
    
    // Increment filter counter to trigger effect
    setFilterUpdateCounter(prev => prev + 1);
    
    // Reset loading state
    setLoading(false);
  }, [products]);

  // Add a function to manually check Supabase status
  const checkStatus = async () => {
    setLoading(true);
    
    try {
      const status = await checkSupabaseStatus();
      
      setRateLimitInfo({
        isRateLimited: status.details.some(d => d.includes('CRITICAL') || d.includes('Rate limit')),
        isThrottled: status.details.some(d => d.includes('WARNING') || d.includes('SLOW')),
        details: status.details,
        lastChecked: new Date()
      });
    } catch (error) {
      console.error('Error checking status:', error);
      
      setRateLimitInfo(prev => ({
        ...prev,
        details: [...prev.details, `Error checking status: ${String(error)}`],
        lastChecked: new Date()
      }));
    } finally {
      setLoading(false);
    }
  };

  // Handle view change from ViewToggle
  const handleViewChange = useCallback((newView: string) => {
    if (newView === 'grid' || newView === 'table') {
      setView(newView as 'grid' | 'table');
    }
  }, []);

  // Handle sort change from ViewToggle 
  const handleSortChange = useCallback((newSort: string) => {
    setSortOption(newSort);
    // We need to use the current value of sortOption when updating
    // Don't apply sortProducts immediately since it depends on sortOption
    // which hasn't been updated yet
    // Instead, we'll rely on the useEffect that watches sortOption
  }, []);

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">Compare Laser Cutters</h1>
            <div className="flex flex-row items-center gap-2 justify-between md:justify-end">
              <div className="md:hidden">
                <FilterButton
                  categories={categories}
                  brands={brands}
                  onApplyFilters={handleApplyFilters}
                  activeFilters={activeFilters}
                  filteredCount={filteredProducts.length}
                />
              </div>
              <ViewToggle
                onViewChange={handleViewChange}
                onSortChange={handleSortChange}
                currentView={view}
                currentSort={sortOption}
              />
              {DEBUG_MODE && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={checkStatus}
                        disabled={isLoading}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span className="sr-only">Check Status</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Check Database Status</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          
          {/* Show rate limit warning if detected */}
          {rateLimitInfo.details.length > 0 && (
            <RateLimitWarning 
              details={rateLimitInfo.details} 
              onRefresh={fetchProducts}
              isLoading={isLoading}
            />
          )}

          <div className="flex flex-col-reverse lg:flex-row gap-6">
            {/* Sidebar filter - hidden on mobile */}
            <div className="w-full lg:w-64 lg:flex-shrink-0 hidden md:block">
              <div className="sticky top-24">
                <UnifiedFilter
                  categories={categories}
                  brands={brands}
                  onApplyFilters={handleApplyFilters}
                  initialFilters={{
                    laserTypes: filters.laserTypes,
                    priceRange: filters.priceRange,
                    powerRange: filters.powerRange,
                    speedRange: filters.speedRange,
                    features: filters.features,
                    isTopPick: filters.isTopPick
                  }}
                  filteredCount={filteredProducts.length}
                />
              </div>
            </div>
            
            {/* Main content area */}
            <div className="flex-1 min-w-0">
              <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <SearchBar
                  products={products}
                  onSearch={handleSearch}
                  className="w-full sm:max-w-md"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredProducts.length}</span>
                    <span className="ml-1">
                      {filteredProducts.length === 1 ? 'machine' : 'machines'}
                    </span>
                  </span>
                </div>
              </div>
              
              {/* Products display area */}
              <div className="min-h-screen">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-[400px] rounded-lg" />
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center p-12 bg-gray-50 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2">No machines found</h3>
                    <p className="text-gray-600 mb-6">
                      Try adjusting your filters or search query
                    </p>
                    <Button variant="default" onClick={clearAllFilters}>
                      Clear all filters
                    </Button>
                  </div>
                ) : (
                  <>
                    {view === "grid" ? (
                      <ProductsGrid
                        products={finalSortedProducts}
                        totalProducts={finalSortedProducts.length}
                      />
                    ) : (
                      <div className="w-full bg-white dark:bg-gray-950 rounded-lg shadow-sm p-4">
                        <EnhancedComparisonTable 
                          machines={finalSortedProducts} 
                        />
                      </div>
                    )}
                    
                    {/* Lazy Loading Trigger */}
                    {visibleCount < filteredProducts.length && (
                      <div 
                        ref={loadMoreRef}
                        className="mt-8 py-8 flex justify-center items-center"
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                          <p className="text-sm text-muted-foreground">
                            Showing {visibleCount} of {filteredProducts.length} machines
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* All items shown indicator */}
                    {visibleCount >= filteredProducts.length && filteredProducts.length > 30 && (
                      <div className="mt-8 text-center">
                        <p className="text-sm text-muted-foreground">
                          All {filteredProducts.length} machines shown
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

