"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import dynamic from 'next/dynamic'
import ProductsGrid from "@/components/products-grid"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid, Table, Zap, Box, Layers, Maximize2, Minimize2, Briefcase, Smartphone, X, Camera, Wifi, ArrowUpDown, Filter } from "lucide-react"
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
  // - Replace spaces with dashes to match database format
  // - Convert everything to lowercase for case-insensitive comparison
  const normalizedType = laserType.toLowerCase().trim().replace(/ /g, '-');
  
  // Get the product's laser types and normalize them the same way
  let productLaserTypeA = (product["Laser Type A"] || "").toLowerCase().trim();
  let productLaserTypeB = (product["Laser Type B"] || "").toLowerCase().trim();
  
  console.log(`DEBUG MATCHING: Checking if machine "${product["Machine Name"]}" matches laser type "${normalizedType}"`);
  console.log(`DEBUG MATCHING: Machine has Laser Type A = "${productLaserTypeA}", Laser Type B = "${productLaserTypeB}"`);
  
  // Direct matching on Laser Type fields (case-insensitive with normalized format)
  const isMatch = productLaserTypeA === normalizedType || productLaserTypeB === normalizedType;
  console.log(`DEBUG MATCHING: Match result: ${isMatch}`);
  return isMatch;
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

// ViewToggle component - extracted from main component
const ViewToggle = React.memo(function ViewToggle() {
  const [view, setView] = useState("grid")
  const [sortOption, setSortOption] = useState("price-asc")

  // This function will be called when the component mounts
  useEffect(() => {
    // Get the view from localStorage or default to grid
    const savedView = localStorage.getItem("view") || "grid"
    setView(savedView)
    
    // Get the sort option from localStorage or default to price-asc
    const savedSort = localStorage.getItem("sortOption") || "price-asc"
    setSortOption(savedSort)
  }, [])

  // Update view and save to localStorage
  const updateView = useCallback((newView: string) => {
    setView(newView)
    localStorage.setItem("view", newView)
    // Trigger a custom event that ViewSelector can listen for
    window.dispatchEvent(new CustomEvent("viewchange", { detail: { view: newView } }))
  }, [])

  // Update sort option and save to localStorage
  const updateSort = useCallback((newSort: string) => {
    setSortOption(newSort)
    localStorage.setItem("sortOption", newSort)
    // Trigger a custom event that CompareClientPage can listen for
    window.dispatchEvent(new CustomEvent("sortchange", { detail: { sort: newSort } }))
  }, [])

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

// Unified filtering function - a single source of truth for ALL filtering
function applyAllFilters(products: Machine[], filters: Filters): Machine[] {
  // Skip filtering if no filters are explicitly set (all at default values)
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
  
  console.log(`FILTER DEBUG: Starting with ${filteredProducts.length} products total`);
  
  // 1. Apply Top Pick filter first
  if (filters.isTopPick) {
    filteredProducts = filteredProducts.filter(product => product.Award);
  }
  
  // 2. Apply laser type filter - this is always the thorough matching version
  if (filters.laserTypes.length > 0) {
    console.log(`FILTER DEBUG: Applying laser type filters: ${filters.laserTypes.join(', ')}`);
    
    // Store products before filtering for debugging
    const beforeLaserFilter = [...filteredProducts];
    
    filteredProducts = filteredProducts.filter(product => {
      const matches = filters.laserTypes.some(laserType => matchesLaserType(product, laserType));
      
      if (!matches) {
        console.log(`FILTER DEBUG: Product "${product["Machine Name"]}" was EXCLUDED by laser type filter`);
        console.log(`FILTER DEBUG: It has Laser Type A = "${product["Laser Type A"] || "N/A"}", Laser Type B = "${product["Laser Type B"] || "N/A"}"`);
      } else {
        console.log(`FILTER DEBUG: Product "${product["Machine Name"]}" was INCLUDED by laser type filter`);
      }
      
      return matches;
    });
    
    // Calculate which products were filtered out
    const filteredOut = beforeLaserFilter.filter(p1 => !filteredProducts.some(p2 => p2.id === p1.id));
    
    console.log(`FILTER DEBUG: Laser type filter removed ${filteredOut.length} products`);
    if (filteredOut.length > 0 && filteredOut.length <= 10) {
      console.log(`FILTER DEBUG: Filtered out products:`);
      filteredOut.forEach(p => {
        console.log(`  - ${p["Machine Name"]} (Laser Type A: "${p["Laser Type A"] || "N/A"}", Laser Type B: "${p["Laser Type B"] || "N/A"}")`);
      });
    }
    
    // Add debug logging for laser type filtering
    console.log(`UNIFIED FILTER: Applied laser type filters [${filters.laserTypes.join(', ')}] - ${filteredProducts.length} machines remain`);
  }
  
  // 3. Apply price range filter
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 15000) {
    filteredProducts = filteredProducts.filter(product => {
      const price = parseFloat(String(product.Price || 0));
      return !isNaN(price) && price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });
    
    console.log(`UNIFIED FILTER: Applied price range ${filters.priceRange[0]}-${filters.priceRange[1]} - ${filteredProducts.length} machines remain`);
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
    
    console.log(`UNIFIED FILTER: Applied power range ${filters.powerRange[0]}-${filters.powerRange[1]} - ${filteredProducts.length} machines remain`);
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
    
    console.log(`UNIFIED FILTER: Applied speed range ${filters.speedRange[0]}-${filters.speedRange[1]} - ${filteredProducts.length} machines remain`);
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
    
    console.log(`UNIFIED FILTER: Applied feature filters [${filters.features.join(', ')}] - ${filteredProducts.length} machines remain`);
  }
  
  // Log detailed info about the machines that were filtered out
  if (filteredProducts.length === 0 && filters.laserTypes.length > 0) {
    console.log("FILTER WARNING: All machines were filtered out. Let's check why:");
    
    // Check each filter step individually to find what's causing the issue
    const afterLaserTypeFilter = products.filter(product => 
      filters.laserTypes.some(laserType => matchesLaserType(product, laserType))
    );
    
    console.log(`- After laser type filter: ${afterLaserTypeFilter.length} machines`);
    
    if (afterLaserTypeFilter.length > 0 && afterLaserTypeFilter.length <= 5) {
      console.log("Machines that matched laser type criteria:");
      afterLaserTypeFilter.forEach(p => {
        console.log(`  * ${p["Machine Name"]} (Price: ${p.Price}, Power: ${p["Laser Power A"]}, Speed: ${p.Speed})`);
      });
    }
  }
  
  return filteredProducts;
}

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
  }), []);
  
  const [products, setProducts] = useState<Machine[]>(initialProducts)
  const [filteredProducts, setFilteredProducts] = useState<Machine[]>(initialProducts)
  const [selectedProducts, setSelectedProducts] = useState<Machine[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [sortOption, setSortOption] = useState<string>("price-asc")
  const [filters, setFilters] = useState<Filters>({
    laserTypes: [],
    priceRange: [0, 15000],
    powerRange: [0, 150],
    speedRange: [0, 2000],
    features: [],
    isTopPick: false,
  })
  const [isLoading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  // Add a filter update counter to track filter update operations
  const [filterUpdateCounter, setFilterUpdateCounter] = useState<number>(0);

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

  // DEBUGGING: Print all laser type mappings at component load
  useEffect(() => {
    console.log("================= LASER TYPE MAPPINGS =================");
    console.log("FILTER DEBUGGING: Laser type UI to DB mapping:", laserTypeMap);
    console.log("===========================================================");
  }, [laserTypeMap]);

  // Filter products based on selected filters - now just a wrapper for applyAllFilters for backward compatibility
  const filterProducts = useCallback((product: Machine, filters: Filters) => {
    // Use the unified filter to ensure consistency
    const filtered = applyAllFilters([product], filters);
    return filtered.length > 0;
  }, []);

  // Update filtered products when filters change
  useEffect(() => {
    // Add a debug line to track effect runs
    console.log(`Filter effect running - counter: ${filterUpdateCounter}`);
    
    // Ensure we start the filtering process with loading state
    setLoading(true);
    
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
    
    if (isUsingDefaultFilters && products.length > 0) {
      console.log(`DEFAULT FILTERS: Showing all ${products.length} products`);
      setFilteredProducts(products);
      setLoading(false); // Make sure to reset loading state
      return;
    }
    
    // DEBUG: Log which filters are active
    console.log("Active filters:", {
      laserTypes: filters.laserTypes,
      features: filters.features,
      priceRange: filters.priceRange,
      powerRange: filters.powerRange,
      speedRange: filters.speedRange,
      isTopPick: filters.isTopPick
    });
    
    // USE THE UNIFIED FILTER APPROACH FOR ALL FILTER SCENARIOS
    console.log(`FILTER: Applying all filters with unified system`);
    const filtered = applyAllFilters(products, filters);
    
    // Log the results
    console.log(`FILTER RESULT: Found ${filtered.length} machines matching all criteria`);
    
    // DEBUG: Sample of matches
    if (filtered.length > 0) {
      console.log("Sample matches:");
      filtered.slice(0, 3).forEach(product => {
        console.log(`  - ${product["Machine Name"]} (${product["Laser Type A"]}, ${product["Laser Category"]})`);
      });
    }
    
    // Store for debugging if this is a laser type filter
    if (filters.laserTypes.length > 0) {
      const machineIds = filtered.map(m => m.id || m["Machine Name"]);
      window.__DEBUG_FIBER_MACHINES = machineIds;
      window.__DEBUG_LAST_FILTER_COUNT = filtered.length;
    }
    
    // Update the filtered products
    setFilteredProducts(filtered);
    
    // Always reset loading state at the end
    setLoading(false);
  }, [products, filters, filterUpdateCounter]);

  // Handle filter change from filter components
  const handleFilterChange = useCallback((newFilters: Filters) => {
    setLoading(true); // Show loading state
    
    // Use setTimeout to defer filtering to next tick, allowing UI to update
    setTimeout(() => {
      console.log(`Filter change received:`, newFilters);
      
      // No need for special handling anymore - the unified filter will handle everything
      // Just update the filter state and let the effect do its work
      setFilterUpdateCounter(prev => prev + 1);
      setFilters(newFilters);
      
      // Make sure to reset loading state
      setLoading(false);
    }, 50); // Short delay for UI update
  }, []);

  // Listen for view changes
  useEffect(() => {
    // Get the initial view from localStorage
    const savedView = localStorage.getItem("view") || "grid"
    setViewMode(savedView as 'grid' | 'table')

    // Get the initial sort option from localStorage
    const savedSort = localStorage.getItem("sortOption") || "price-asc"
    setSortOption(savedSort)

    // Listen for view change events
    const handleViewChange = (e: CustomEvent) => {
      setViewMode(e.detail.view as 'grid' | 'table')
    }

    // Listen for sort change events
    const handleSortChange = (e: CustomEvent) => {
      setSortOption(e.detail.sort)
    }

    window.addEventListener("viewchange", handleViewChange as EventListener)
    window.addEventListener("sortchange", handleSortChange as EventListener)

    return () => {
      window.removeEventListener("viewchange", handleViewChange as EventListener)
      window.removeEventListener("sortchange", handleSortChange as EventListener)
    }
  }, [])

  // Handle search results
  const handleSearch = React.useCallback((results: Machine[]) => {
    if (results.length === 0) {
      // If search returns no results, just show filtered products based on current filters
      const filteredByFilters = applyAllFilters(products, filters);
      console.log(`Search found no results, showing ${filteredByFilters.length} filtered products`);
      setFilteredProducts(filteredByFilters);
    } else {
      // First apply filters to the search results
      const filteredSearchResults = applyAllFilters(results, filters);
      
      console.log(`Search found ${results.length} products, ${filteredSearchResults.length} match current filters`);
      setFilteredProducts(filteredSearchResults);
    }
  }, [products, filters]);

  // Fetch products with filters
  const fetchProducts = async () => {
    try {
      // Set limit to get all products
      const response = await fetch(`/api/machines?limit=1000`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API error status: ${response.status}, response: ${errorText}`)
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const newProducts = data.data || []
      console.log(`Fetched ${newProducts.length} machines from API`)
      setProducts(newProducts)
      
      // Apply filters to the fetched products using our unified approach
      const filtered = applyAllFilters(newProducts, filters);
      console.log(`Initial filtering of fetched products: ${filtered.length}/${newProducts.length} passed filters`)
      setFilteredProducts(filtered)
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
      setFilteredProducts([])
    }
  }

  // Debounced fetchProducts to reduce excessive API calls
  const debouncedFetchProducts = useMemo(() => 
    debounce(async (searchQuery: string, filters: Filters) => {
      setLoading(true);
      try {
        // Your existing fetchProducts logic
        // ...
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [] // Empty dependency array ensures this is only created once
  );
  
  // Memoize the sortProducts function to avoid recreation on each render
  const sortProducts = useCallback((products: Machine[]) => {
    console.log(`Applying sort: ${sortOption} to ${products.length} products`);
    
    // Create a defensive copy of the products array
    const sorted = [...products]
    
    let result;
    switch (sortOption) {
      case "price-asc":
        console.log("Sorting by price: low to high");
        result = sorted.sort((a, b) => {
          const priceA = typeof a.Price === 'number' ? a.Price : parseFloat(String(a.Price || 0))
          const priceB = typeof b.Price === 'number' ? b.Price : parseFloat(String(b.Price || 0))
          return priceA - priceB
        });
        break;
      case "price-desc":
        console.log("Sorting by price: high to low");
        result = sorted.sort((a, b) => {
          const priceA = typeof a.Price === 'number' ? a.Price : parseFloat(String(a.Price || 0))
          const priceB = typeof b.Price === 'number' ? b.Price : parseFloat(String(b.Price || 0))
          return priceB - priceA
        });
        break;
      case "power-desc":
        console.log("Sorting by power: high to low");
        result = sorted.sort((a, b) => {
          const powerA = parseFloat(String(a["Laser Power A"] || 0))
          const powerB = parseFloat(String(b["Laser Power A"] || 0))
          return powerB - powerA
        });
        break;
      case "speed-desc":
        console.log("Sorting by speed: high to low");
        result = sorted.sort((a, b) => {
          const speedA = parseFloat(String(a.Speed || 0))
          const speedB = parseFloat(String(b.Speed || 0))
          return speedB - speedA
        });
        break;
      case "name-asc":
        console.log("Sorting by name: A to Z");
        result = sorted.sort((a, b) => {
          const nameA = a["Machine Name"] || ""
          const nameB = b["Machine Name"] || ""
          return nameA.localeCompare(nameB)
        });
        break;
      default:
        console.log("Using default sorting");
        result = sorted;
        break;
    }
    
    // Log the first few items after sorting for debugging
    if (result.length > 0) {
      console.log("First 3 items after sorting:");
      result.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item["Machine Name"]} - Price: ${item.Price}, Power: ${item["Laser Power A"]}, Speed: ${item.Speed}`);
      });

      // Log the last few items as well for comparison
      console.log("Last 3 items after sorting:");
      result.slice(-3).forEach((item, index) => {
        console.log(`  ${result.length - 2 + index}. ${item["Machine Name"]} - Price: ${item.Price}, Power: ${item["Laser Power A"]}, Speed: ${item.Speed}`);
      });
    }
    
    // Force a new array reference to ensure React detects the change
    return [...result];
  }, [sortOption]);
  
  // Use useEffect with proper dependencies to handle view and sort changes
  useEffect(() => {
    const handleViewChange = (e: any) => {
      setViewMode(e.detail.view);
    };
    
    const handleSortChange = (e: any) => {
      setSortOption(e.detail.sort);
      const sortedProducts = sortProducts([...filteredProducts]);
      setFilteredProducts(sortedProducts);
    };
    
    window.addEventListener('viewchange', handleViewChange);
    window.addEventListener('sortchange', handleSortChange);
    
    return () => {
      window.removeEventListener('viewchange', handleViewChange);
      window.removeEventListener('sortchange', handleSortChange);
    };
  }, [filteredProducts, sortProducts]); // Proper dependencies
  
  // Memoize complex calculations
  const machineStats = useMemo(() => {
    // Calculate min/max values once based on products
    const machineStats = {
      priceMin: 0,
      priceMax: 0,
      powerMin: 0,
      powerMax: 0,
      speedMin: 0,
      speedMax: 0,
    };
    
    // Your existing stats calculation logic
    // ...
    
    return machineStats;
  }, [initialProducts]); // Only recalculate when initialProducts changes
  
  // Memoize filtered results to avoid recalculation
  const displayProducts = useMemo(() => {
    if (isLoading) return [];
    return filteredProducts;
  }, [filteredProducts, isLoading]);

  // Render the products with proper sorting
  // Create a final sorted array that's guaranteed to be sorted just before rendering
  const finalSortedProducts = React.useMemo(() => {
    console.log(`FINAL RENDER: Using sortOption ${sortOption} for ${displayProducts.length} products`);
    // Apply sorting one more time just before rendering to be extra sure
    return sortProducts(displayProducts);
  }, [displayProducts, sortOption]);
  
  // Add an effect to debug sort option changes
  React.useEffect(() => {
    console.log(`Sort option changed to: ${sortOption}`);
  }, [sortOption]);

  // React effect for monitoring filter changes and debugging
  React.useEffect(() => {
    // Only add basic logging for debugging
    if (filters.laserTypes.length > 0) {
      console.log(`MONITOR: Current filter state:`, {
        laserTypes: filters.laserTypes,
        hasOtherFilters: filters.features.length > 0 || 
                      filters.priceRange[0] > 0 || 
                      filters.priceRange[1] < 15000 ||
                      filters.powerRange[0] > 0 || 
                      filters.powerRange[1] < 150 ||
                      filters.speedRange[0] > 0 || 
                      filters.speedRange[1] < 2000 ||
                      filters.isTopPick
      });
      
      // Debug check to verify filter counts are as expected
      if (filteredProducts.length < (window.__DEBUG_LAST_FILTER_COUNT || 0) && window.__DEBUG_LAST_FILTER_COUNT) {
        console.log(`FILTER MONITOR: Current filtered count (${filteredProducts.length}) is less than last laser-only filter count (${window.__DEBUG_LAST_FILTER_COUNT})`);
        
        // Verify that our unified filtering gives the same results
        const verificationFiltered = applyAllFilters(products, filters);
        if (verificationFiltered.length !== filteredProducts.length) {
          console.warn(`FILTER INCONSISTENCY: Unified filter gives ${verificationFiltered.length} results, but current filtered products has ${filteredProducts.length}`);
          
          // This should never happen with our unified approach, but just in case
          // Apply the unified filter to ensure consistency
          setFilteredProducts(verificationFiltered);
        }
      }
    }
  }, [filters, filteredProducts, products]);

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

  // Handle category filter change
  const handleCategoryChange = useCallback((categoryId: string | null) => {
    setCategoryFilter(categoryId);
    // Apply additional filtering logic for categories if needed
    console.log(`Category filter changed to: ${categoryId}`);
  }, []);

  // Handler for applying filters
  function handleApplyFilters(filters: any) {
    console.log("Applying filters:", filters);
    
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
              <ViewToggle />
            </div>
          </div>

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
                    {isLoading && <span className="ml-2 text-primary animate-pulse">Updating...</span>}
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
                    {viewMode === "grid" ? (
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ComparisonBar />
    </>
  )
}

