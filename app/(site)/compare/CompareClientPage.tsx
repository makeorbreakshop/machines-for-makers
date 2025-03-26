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

// Dynamically import heavy components with increased loading delay to prevent hydration issues
const ComparisonTable = dynamic(() => import('@/components/comparison-table'), {
  loading: () => <div className="w-full p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading comparison table...</div>,
  ssr: false
})

const EnhancedComparisonTable = dynamic(() => import('@/components/enhanced-comparison-table'), {
  loading: () => <div className="w-full p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading enhanced comparison table...</div>,
  ssr: false
})

// Declare global debug properties for TypeScript
declare global {
  interface Window {
    __DEBUG_FIBER_MACHINES?: string[];
    __DEBUG_LAST_FILTER_COUNT?: number;
  }
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Camera className="h-5 w-5 mr-2" />
          <span>Camera</span>
        </Button>
        
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Wifi className="h-5 w-5 mr-2" />
          <span>WiFi</span>
        </Button>
        
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Box className="h-5 w-5 mr-2" />
          <span>Enclosure</span>
        </Button>
        
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Box className="h-5 w-5 mr-2" />
          <span>Auto Focus</span>
        </Button>
        
        <Button variant="outline" className="flex items-center justify-center w-full h-auto py-3">
          <Box className="h-5 w-5 mr-2" />
          <span>Passthrough</span>
        </Button>
      </div>
    </div>
  )
})

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
    "fiber": "fiber",
    "Fiber": "fiber",
    "FIBER": "fiber",
    "infrared": "infared", // Handle database misspelling
    "Infrared": "infared", // Handle database misspelling
    "INFRARED": "infared", // Handle database misspelling
    "infared": "infared",
    "Infared": "infared", 
    "INFARED": "infared",
    "mopa": "mopa",
    "Mopa": "mopa",
    "MOPA": "mopa",
    "co2 rf": "co2-rf",
    "CO2 RF": "co2-rf",
    "CO2-RF": "co2-rf",
    "co2 glass": "co2-glass",
    "CO2 Glass": "co2-glass", 
    "CO2-Glass": "co2-glass",
    "diode": "diode",
    "Diode": "diode",
    "DIODE": "diode",
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
  const [loading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  // Add a filter update counter to track filter update operations
  const [filterUpdateCounter, setFilterUpdateCounter] = useState<number>(0);

  // DEBUGGING: Print all laser type mappings at component load
  useEffect(() => {
    console.log("================= LASER TYPE MAPPINGS =================");
    console.log("FILTER DEBUGGING: Laser type UI to DB mapping:", laserTypeMap);
    console.log("===========================================================");
  }, [laserTypeMap]);

  // Filter products based on selected filters
  const filterProducts = useCallback((product: Machine, filters: Filters) => {
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
      return true; // Skip all filtering if using default filters
    }
    
    // Debug any filtered products
    let filterReason = "";
    
    // Top Pick filter
    if (filters.isTopPick && !product.Award) {
      filterReason = "No award for Top Pick";
      return false;
    }

    // Laser type filter
    if (filters.laserTypes.length > 0) {
      // Get product laser types and normalize them
      const productLaserTypeA = (product["Laser Type A"] || "").toLowerCase().trim();
      const productLaserTypeB = (product["Laser Type B"] || "").toLowerCase().trim();
      const productName = (product["Machine Name"] || "").toLowerCase().trim();
      const productCategory = (product["Laser Category"] || "").toLowerCase().trim();
      const machineCategory = (product["Machine Category"] || "").toLowerCase().trim();
      
      // Check if any of the filter types match any of the product fields
      const hasMatchingLaserType = filters.laserTypes.some(filterType => {
        const normalizedFilterType = filterType.toLowerCase().trim();
        
        // For fiber, do broad matching across all fields
        if (normalizedFilterType === "fiber") {
          // Extra debugging for important fiber machines
          if (product["Machine Name"] === "Gweike G2 30W" || product["Machine Name"].includes("Fiber")) {
            console.log(`MAIN FILTER: Checking ${product["Machine Name"]} for fiber match:`, {
              laserTypeA: productLaserTypeA,
              laserTypeB: productLaserTypeB,
              category: productCategory, 
              machineCategory: machineCategory,
              productName: productName,
              isMatch: productLaserTypeA === "fiber" || 
                      productLaserTypeB === "fiber" ||
                      productCategory.includes("fiber") || 
                      machineCategory.includes("fiber") ||
                      productName.includes("fiber") || 
                      productName.includes("fibre")
            });
          }
          
          return productLaserTypeA === "fiber" || 
                productLaserTypeB === "fiber" ||
                productCategory.includes("fiber") || 
                machineCategory.includes("fiber") ||
                productName.includes("fiber") || 
                productName.includes("fibre");
        }
        
        // For infrared, handle misspellings and check all fields thoroughly
        if (normalizedFilterType === "infared" || normalizedFilterType === "infrared") {
          const isMatch = productLaserTypeA === "infrared" || 
                productLaserTypeA === "infared" ||
                productLaserTypeB === "infrared" || 
                productLaserTypeB === "infared" ||
                productCategory.includes("infrared") || 
                productCategory.includes("infared") ||
                productName.includes("infrared") || 
                productName.includes("infared");
          
          // Add extra logging for infrared matches
          if (isMatch) {
            console.log(`MAIN FILTER: Checking ${product["Machine Name"]} for infrared match:`, {
              laserTypeA: productLaserTypeA,
              laserTypeB: productLaserTypeB,
              category: productCategory,
              name: productName,
              isMatch: isMatch
            });
          }
          
          return isMatch;
        }
        
        // For MOPA, do thorough matching
        if (normalizedFilterType === "mopa") {
          return productLaserTypeA?.toLowerCase() === "mopa" || 
                productLaserTypeB?.toLowerCase() === "mopa" ||
                productCategory?.toLowerCase().includes("mopa") || 
                machineCategory?.toLowerCase().includes("mopa") ||
                productName?.toLowerCase().includes("mopa");
        }
        
        // For other types, standard matching
        return productLaserTypeA === normalizedFilterType || 
              productLaserTypeB === normalizedFilterType ||
              productCategory === normalizedFilterType ||
              productCategory.includes(normalizedFilterType);
      });
      
      if (!hasMatchingLaserType) {
        filterReason = `Laser type doesn't match`;
        return false;
      }
    }

    // Price range filter
    const price = parseFloat(String(product.Price || 0));
    if (!isNaN(price) && (price < filters.priceRange[0] || price > filters.priceRange[1])) {
      filterReason = `Price ${price} outside range ${filters.priceRange[0]}-${filters.priceRange[1]}`;
      return false;
    }

    // Power range filter
    const powerStr = product["Laser Power A"] || "0";
    let power = 0;
    try {
      power = typeof powerStr === 'number' 
        ? powerStr 
        : parseFloat(powerStr.toString().replace(/[^0-9.-]+/g,""));
    } catch (e) {
      // If parsing fails, use default value of 0
      power = 0;
    }
    
    // Only apply power filter if we have a valid number
    if (!isNaN(power) && (power < filters.powerRange[0] || power > filters.powerRange[1])) {
      filterReason = `Power ${power} outside range ${filters.powerRange[0]}-${filters.powerRange[1]}`;
      return false;
    }

    // Speed range filter
    const speedStr = product.Speed || "0";
    let speed = 0;
    try {
      speed = typeof speedStr === 'number' 
        ? speedStr 
        : parseFloat(speedStr.toString().replace(/[^0-9.-]+/g,""));
    } catch (e) {
      // If parsing fails, use default value of 0
      speed = 0;
    }
    
    // Only apply speed filter if we have a valid number
    if (!isNaN(speed) && (speed < filters.speedRange[0] || speed > filters.speedRange[1])) {
      filterReason = `Speed ${speed} outside range ${filters.speedRange[0]}-${filters.speedRange[1]}`;
      return false;
    }

    // Features filter
    if (filters.features.length > 0) {
      const hasAllFeatures = filters.features.every((feature) => {
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
      if (!hasAllFeatures) {
        filterReason = "Missing required features";
        return false;
      }
    }

    // All filters passed
    return true;
  }, [])

  // Update filtered products when filters change
  useEffect(() => {
    // Add a debug line to track effect runs
    console.log(`Filter effect running - counter: ${filterUpdateCounter}`);
    
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
    
    // Extra debug log for laser type filters
    if (filters.laserTypes.length > 0) {
      console.log(`DEBUG: Processing laser type filters: [${filters.laserTypes.join(', ')}]`);
    }
    
    // If we only have laser type filters and nothing else, do a simpler and more thorough filter
    const onlyLaserTypeFilters = 
      filters.laserTypes.length > 0 && 
      filters.features.length === 0 && 
      filters.priceRange[0] === 0 && 
      filters.priceRange[1] === 15000 &&
      filters.powerRange[0] === 0 && 
      filters.powerRange[1] === 150 &&
      filters.speedRange[0] === 0 && 
      filters.speedRange[1] === 2000 &&
      !filters.isTopPick;
      
    if (onlyLaserTypeFilters) {
      console.log(`ONLY LASER FILTERS: Applying optimized laser type filtering for ${filters.laserTypes.join(', ')}`);
      
      // Only filter by laser type for better matching - with more thorough logging
      const laserFiltered = products.filter(product => {
        const productLaserTypeA = (product["Laser Type A"] || "").toLowerCase().trim();
        const productLaserTypeB = (product["Laser Type B"] || "").toLowerCase().trim();
        const productName = (product["Machine Name"] || "").toLowerCase().trim();
        const productCategory = (product["Laser Category"] || "").toLowerCase().trim();
        const machineCategory = (product["Machine Category"] || "").toLowerCase().trim();
        
        return filters.laserTypes.some(filterType => {
          const normalizedFilterType = filterType.toLowerCase().trim();
          
          // For fiber, do broad matching
          if (normalizedFilterType === "fiber") {
            const isMatch = productLaserTypeA === "fiber" || 
                   productLaserTypeB === "fiber" ||
                   productCategory.includes("fiber") || 
                   machineCategory.includes("fiber") ||
                   productName.includes("fiber") || 
                   productName.includes("fibre");
            
            // DEBUG: For specific items, log why they match or don't
            if (product["Machine Name"] === "iKier K1 Pro 20W Fiber") {
              console.log(`DEBUG: Checking fiber match for ${product["Machine Name"]}:`, {
                laserTypeA: productLaserTypeA,
                laserTypeB: productLaserTypeB,
                category: productCategory,
                machineCategory: machineCategory,
                isMatch: isMatch
              });
            }
            
            return isMatch;
          }
          
          // For infrared, handle misspellings with better checking of all fields
          if (normalizedFilterType === "infared" || normalizedFilterType === "infrared") {
            const isMatch = productLaserTypeA === "infrared" || 
                   productLaserTypeA === "infared" ||
                   productLaserTypeB === "infrared" || 
                   productLaserTypeB === "infared" ||
                   productCategory.includes("infrared") || 
                   productCategory.includes("infared") ||
                   productName.includes("infrared") || 
                   productName.includes("infared");
            
            // Add extra debugging for infrared matches
            if (isMatch) {
              console.log(`DEBUG: Found infrared match for ${product["Machine Name"]}:`, {
                laserTypeA: productLaserTypeA,
                laserTypeB: productLaserTypeB,
                category: productCategory,
                name: productName,
                isMatch: isMatch
              });
            }
            
            return isMatch;
          }
          
          // For MOPA, do thorough matching
          if (normalizedFilterType === "mopa") {
            const isMatch = productLaserTypeA?.toLowerCase() === "mopa" || 
                   productLaserTypeB?.toLowerCase() === "mopa" ||
                   productCategory?.toLowerCase().includes("mopa") || 
                   machineCategory?.toLowerCase().includes("mopa") ||
                   productName?.toLowerCase().includes("mopa");
                   
            // DEBUG: For certain MOPA machines, log detailed matching info
            if (product["Machine Name"].includes("MOPA")) {
              console.log(`DEBUG: Checking MOPA match for ${product["Machine Name"]}:`, {
                laserTypeA: productLaserTypeA,
                laserTypeB: productLaserTypeB,
                category: productCategory,
                machineCategory: machineCategory,
                isMatch: isMatch
              });
            }
            
            return isMatch;
          }
          
          // For other types, standard matching
          return productLaserTypeA === normalizedFilterType || 
                 productLaserTypeB === normalizedFilterType ||
                 productCategory === normalizedFilterType ||
                 productCategory.includes(normalizedFilterType);
        });
      });
      
      console.log(`LASER FILTER ONLY: Found ${laserFiltered.length} machines matching laser types:`, 
        filters.laserTypes.map(type => type.toLowerCase())
      );
      
      // DEBUG: Log sample of matches
      if (laserFiltered.length > 0) {
        console.log("Sample matches:");
        laserFiltered.slice(0, 5).forEach(product => {
          console.log(`  - ${product["Machine Name"]} (${product["Laser Type A"]}, ${product["Laser Category"]})`);
        });
      }
      
      // **** DEBUG **** - Track filteredProducts state update
      console.log(`DEBUG: Setting filteredProducts to ${laserFiltered.length} items from laser filter`);
      console.log(`DEBUG: First 3 products in filtered set:`);
      laserFiltered.slice(0, 3).forEach((p, i) => console.log(`  ${i+1}. ${p["Machine Name"]}`));
      
      // Store the machine IDs for later comparison
      const machineIds = laserFiltered.map(m => m.id || m["Machine Name"]);
      console.log(`DEBUG: Tracking ${machineIds.length} machine IDs for post-filter comparison`);
      
      // We need to save this for debugging, create a global reference
      window.__DEBUG_FIBER_MACHINES = machineIds;
      window.__DEBUG_LAST_FILTER_COUNT = laserFiltered.length;
      
      // Check if this is a secondary effect run that should be skipped
      if (laserFiltered.length > 0) {
        console.log(`DEBUG: Setting filtered products - filter update counter: ${filterUpdateCounter}`);
        setFilteredProducts(laserFiltered);
      } else {
        console.log(`DEBUG: No products found matching filter - not updating state`);
      }
      return;
    }
    
    // Apply all filters to the products
    const filtered = products.filter((product: Machine) => filterProducts(product, filters));
    
    // If we're filtering by laser type, let's log the results
    if (filters.laserTypes.length > 0) {
      console.log(`LASER FILTER WITH OTHER FILTERS: Found ${filtered.length} machines matching laser types:`, 
        filters.laserTypes.map(type => type.toLowerCase())
      );
      
      // DEBUG: Sample of matches
      if (filtered.length > 0) {
        console.log("Sample matches (with other filters):");
        filtered.slice(0, 3).forEach(product => {
          console.log(`  - ${product["Machine Name"]} (${product["Laser Type A"]}, ${product["Laser Category"]})`);
        });
      }
    }
    
    // Always update the filtered products if we have results
    if (filtered.length > 0) {
      console.log(`DEBUG: Setting filtered products to ${filtered.length} items from standard filter`);
      setFilteredProducts(filtered);
    }
  }, [products, filters, filterProducts, filterUpdateCounter]);

  // Handle filter change from filter components
  const handleFilterChange = useCallback((newFilters: Filters) => {
    setLoading(true); // Show loading state
    
    // Use setTimeout to defer filtering to next tick, allowing UI to update
    setTimeout(() => {
      console.log(`Filter change received:`, newFilters);
      
      // Deep checking of laser type filters
      if (newFilters.laserTypes && newFilters.laserTypes.length > 0) {
        // This logic logs information about how many products match each laser type
        console.log(`LASER TYPES RECEIVED FROM FILTER COMPONENTS:`, newFilters.laserTypes);
        
        // Make sure laser types are properly normalized and matches the database
        const normalizedLaserTypes = newFilters.laserTypes.map(type => type.toLowerCase());
        console.log(`NORMALIZED LASER TYPES:`, normalizedLaserTypes);
        
        // For fiber, MOPA, or infrared filters specifically, use the optimized specialized matching logic
        if (normalizedLaserTypes.includes('fiber') || 
            normalizedLaserTypes.includes('mopa') || 
            normalizedLaserTypes.includes('infared') || 
            normalizedLaserTypes.includes('infrared')) {
          console.log(`OPTIMIZED MATCHING: Using specialized matching for fiber/MOPA/infrared`);
          
          // Only filter by laser type for better matching
          const laserFiltered = products.filter(product => {
            const productLaserTypeA = (product["Laser Type A"] || "").toLowerCase().trim();
            const productLaserTypeB = (product["Laser Type B"] || "").toLowerCase().trim();
            const productName = (product["Machine Name"] || "").toLowerCase().trim();
            const productCategory = (product["Laser Category"] || "").toLowerCase().trim();
            const machineCategory = (product["Machine Category"] || "").toLowerCase().trim();
            
            return normalizedLaserTypes.some(filterType => {
              // For fiber, do broad matching
              if (filterType === "fiber") {
                return productLaserTypeA === "fiber" || 
                       productLaserTypeB === "fiber" ||
                       productCategory.includes("fiber") || 
                       machineCategory.includes("fiber") ||
                       productName.includes("fiber") || 
                       productName.includes("fibre");
              }
              
              // For MOPA, do thorough matching
              if (filterType === "mopa") {
                return productLaserTypeA === "mopa" || 
                       productLaserTypeB === "mopa" ||
                       productCategory.includes("mopa") || 
                       machineCategory.includes("mopa") ||
                       productName.includes("mopa");
              }
              
              // For infrared/infared, handle both spellings and check all fields
              if (filterType === "infared" || filterType === "infrared") {
                // Log any infrared matches to debug
                if (productLaserTypeA === "infrared" || productLaserTypeA === "infared" ||
                    productLaserTypeB === "infrared" || productLaserTypeB === "infared") {
                  console.log(`INFRARED MATCH found in: ${product["Machine Name"]}`, {
                    laserTypeA: productLaserTypeA,
                    laserTypeB: productLaserTypeB,
                    name: productName
                  });
                }
                
                return productLaserTypeA === "infrared" || 
                       productLaserTypeA === "infared" ||
                       productLaserTypeB === "infrared" || 
                       productLaserTypeB === "infared" ||
                       productCategory.includes("infrared") || 
                       productCategory.includes("infared") ||
                       productName.includes("infrared") || 
                       productName.includes("infared");
              }
              
              // For other types, standard matching
              return productLaserTypeA === filterType || 
                    productLaserTypeB === filterType ||
                    productCategory === filterType ||
                    productCategory.includes(filterType);
            });
          });
          
          console.log(`OPTIMIZED FILTER: Found ${laserFiltered.length} machines matching laser types`);
          
          // Log some examples of matched machines for debugging
          if (laserFiltered.length > 0) {
            console.log("Sample machines that matched:");
            laserFiltered.slice(0, 5).forEach((machine, i) => {
              console.log(`  ${i+1}. ${machine["Machine Name"]} - Type A: ${machine["Laser Type A"]}, Type B: ${machine["Laser Type B"]}`);
            });
          }
          
          // Skip other filtering and directly update the state
          setFilterUpdateCounter(prev => prev + 1);
          setFilters(newFilters);
          setFilteredProducts(laserFiltered);
          setLoading(false);
          return;
        }
        
        // For regular filters not fiber/MOPA, continue with normal process
        const matchingProducts = products.filter(product => {
          const productLaserTypeA = (product["Laser Type A"] || "").toLowerCase().trim();
          const productLaserTypeB = (product["Laser Type B"] || "").toLowerCase().trim();
          const productName = (product["Machine Name"] || "").toLowerCase().trim();
          const productCategory = (product["Laser Category"] || "").toLowerCase().trim();
          const machineCategory = (product["Machine Category"] || "").toLowerCase().trim();
          
          return normalizedLaserTypes.some(filterType => {
            const normalizedFilterType = filterType.toLowerCase().trim();
            
            // Special case for fiber lasers - using the enhanced matching like in main filter
            if (normalizedFilterType === "fiber") {
              // Log matches for important machines to debug fiber filtering
              if (product["Machine Name"] === "Gweike G2 30W" || product["Machine Name"].includes("Fiber")) {
                console.log(`DEBUG FIBER: Checking match for ${product["Machine Name"]}:`, {
                  laserTypeA: productLaserTypeA,
                  laserTypeB: productLaserTypeB, 
                  category: productCategory,
                  hasMatch: productLaserTypeA === "fiber" || 
                            productLaserTypeB === "fiber" ||
                            productCategory.includes("fiber") || 
                            machineCategory.includes("fiber") ||
                            productName.includes("fiber") || 
                            productName.includes("fibre")
                });
              }
              
              return productLaserTypeA === "fiber" || 
                     productLaserTypeB === "fiber" ||
                     productCategory.includes("fiber") || 
                     machineCategory.includes("fiber") ||
                     productName.includes("fiber") || 
                     productName.includes("fibre");
            }
            
            // Special case for MOPA lasers
            if (normalizedFilterType === "mopa") {
                return productLaserTypeA === "mopa" || 
                       productLaserTypeB === "mopa" ||
                       productCategory.includes("mopa") || 
                       machineCategory.includes("mopa") ||
                       productName.includes("mopa") || 
                       productName.includes("m-series");
            }
            
            // Special case for infrared/infared lasers
            if (normalizedFilterType === "infared" || normalizedFilterType === "infrared") {
                return productLaserTypeA === "infrared" || 
                       productLaserTypeA === "infared" ||
                       productLaserTypeB === "infrared" || 
                       productLaserTypeB === "infared" ||
                       productCategory.includes("infrared") || 
                       productCategory.includes("infared") ||
                       productName.includes("infrared") || 
                       productName.includes("infared");
            }
            return false;
          });
        });
        
        console.log(`DEBUG: Found ${matchingProducts.length} matching products in handleFilterChange`);
        
        // Log some examples
        if (matchingProducts.length > 0) {
          console.log("Examples:");
          matchingProducts.slice(0, 3).forEach(product => {
            console.log(`  - ${product["Machine Name"]} (${product["Laser Type A"]}, ${product["Laser Category"]})`);
          });
        }
        console.log(`==========================================`);
      }
      
      // Increment filter update counter to force a refresh of the filtering effect
      setFilterUpdateCounter(prev => prev + 1);
      
      // Update filters state
      setFilters(newFilters);
      
      // Apply filters with animation frame for smoother transition
      requestAnimationFrame(() => {
        // Apply all filters to the products - using the dedicated filterProducts function
        const filtered = products.filter((product: Machine) => filterProducts(product, newFilters));
        console.log(`DEBUG: Applied filters found ${filtered.length} products total`);
        
        // Only update if we actually have results
        if (filtered.length > 0) {
          console.log(`DEBUG: Setting filteredProducts to ${filtered.length} items from handleFilterChange`);
          setFilteredProducts(filtered);
        } else {
          console.log(`DEBUG: No products found in handleFilterChange - not updating state`);
        }
        
        setLoading(false);
      });
    }, 50); // Short delay for UI update
  }, [products, filterProducts])

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
        console.log(`Initial load - showing all ${newProducts.length} products (no filtering)`)
        setFilteredProducts(newProducts)
      } else {
        // Apply filters to the fetched products
        const filtered = newProducts.filter((product: Machine) => filterProducts(product, filters))
        console.log(`Initial filtering of fetched products: ${filtered.length}/${newProducts.length} passed filters`)
        setFilteredProducts(filtered)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
      setFilteredProducts([])
    }
  }

  // Handle search results
  const handleSearch = React.useCallback((results: Machine[]) => {
    if (results.length === 0) {
      // If search returns no results, just show filtered products
      const filteredByFilters = products.filter(product => filterProducts(product, filters));
      console.log(`Search found no results, showing ${filteredByFilters.length} filtered products`);
      setFilteredProducts(filteredByFilters);
    } else {
      // First apply filters, then filter those results by search
      // Get products that match current filters
      const filteredByFilters = products.filter(product => filterProducts(product, filters));
      
      // Then find the intersection with search results
      const intersection = filteredByFilters.filter(product => 
        results.some(searchResult => searchResult.id === product.id)
      );
      
      console.log(`Search found ${results.length} products, ${intersection.length} match current filters`);
      setFilteredProducts(intersection);
    }
  }, [products, filters, filterProducts])

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
    if (loading) return [];
    return filteredProducts;
  }, [filteredProducts, loading]);

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

  // Fix the linter error with handleSearch
  React.useEffect(() => {
    // This effect used to apply a secondary filter, but that was causing fiber machines to be filtered out.
    // The main filter logic in the other useEffect is sufficient to handle all filtering.
    
    // Only add basic logging for debugging
    if (filters.laserTypes.length > 0) {
      console.log(`DEBUG: Secondary effect running - SKIPPING additional filtering`);
      console.log(`DEBUG: Current filtered products count: ${filteredProducts.length} items`);
      console.log(`DEBUG: Filter state: ${JSON.stringify({
        laserTypes: filters.laserTypes,
        hasOtherFilters: filters.features.length > 0 || 
                         filters.priceRange[0] > 0 || 
                         filters.priceRange[1] < 15000 ||
                         filters.powerRange[0] > 0 || 
                         filters.powerRange[1] < 150 ||
                         filters.speedRange[0] > 0 || 
                         filters.speedRange[1] < 2000 ||
                         filters.isTopPick
      })}`);
    }
  }, [filters, filteredProducts])

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

  return (
    <div className="w-full pb-24 bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="border-b sticky top-0 z-30 bg-white dark:bg-gray-950">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 mx-auto flex items-center justify-between py-4 max-w-[2000px]">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Compare Laser Cutters</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <SearchBar 
              products={products}
              onSearch={handleSearch}
              className="w-32 sm:w-48 md:w-64 lg:w-80"
            />
            <ViewToggle />
            {activeFilterCount > 0 ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters({
                  laserTypes: [],
                  priceRange: [0, 15000],
                  powerRange: [0, 150],
                  speedRange: [0, 2000],
                  features: [],
                  isTopPick: false,
                })}
                className="px-3 py-1.5 rounded-md flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear Filters</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Filter Button - Only visible on mobile */}
      <div className="sticky top-[57px] z-20 bg-white dark:bg-gray-950 border-b lg:hidden px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-2">
        <div className="flex items-center justify-between max-w-[2000px] mx-auto">
          <FilterButton
            categories={categories}
            brands={brands}
            onApplyFilters={handleFilterChange}
            activeFilters={{
              laserTypes: filters.laserTypes,
              brands: [],
              priceRange: filters.priceRange,
              powerRange: filters.powerRange,
              speedRange: filters.speedRange,
              features: filters.features
            }}
            filteredCount={displayProducts.length}
          />
          
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{displayProducts.length}</span> 
            <span className="ml-1">
              {displayProducts.length === 1 ? 'machine' : 'machines'}
            </span>
            {loading && <span className="ml-2 text-primary animate-pulse">Updating...</span>}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 max-w-[2000px] mx-auto">
        {/* Sidebar filters - Hidden on mobile */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-24 bg-white dark:bg-gray-950 p-4 rounded-lg shadow-sm">
            <SidebarFilter
              categories={categories}
              brands={brands}
              onApplyFilters={handleFilterChange}
              initialFilters={filters}
              filteredCount={displayProducts.length}
            />
          </div>
        </div>

        {loading ? (
          <div className="w-full flex-1 bg-white dark:bg-gray-950 rounded-lg shadow-sm p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-64"></div>
                ))}
              </div>
            </div>
          </div>
        ) : displayProducts.length > 0 ? (
          viewMode === "grid" ? (
            <div className="w-full">
              <ProductsGrid products={finalSortedProducts} totalProducts={finalSortedProducts.length} />
            </div>
          ) : (
            <div className="w-full bg-white dark:bg-gray-950 rounded-lg shadow-sm p-4">
              <EnhancedComparisonTable machines={finalSortedProducts} />
            </div>
          )
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-950 rounded-lg shadow-sm p-4 w-full">
            <h2 className="text-xl font-medium mb-2">No machines found</h2>
            <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
            {filteredProducts.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-700">Debug: {filteredProducts.length} filtered products exist but aren't displayed</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <ComparisonBar />
    </div>
  )
}

