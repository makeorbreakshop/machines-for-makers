"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import ProductsGrid from "@/components/products-grid"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid, Table, Zap, Box, Layers, Maximize2, Minimize2, Briefcase, Smartphone, X, Camera, Wifi, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import ComparisonTable from "@/components/comparison-table"
import EnhancedComparisonTable from "@/components/enhanced-comparison-table"
import FilterButton from "@/components/filter-button"
import SidebarFilter from "@/components/sidebar-filter"
import Breadcrumb from "@/components/breadcrumb"
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

// Declare global debug properties for TypeScript
declare global {
  interface Window {
    __DEBUG_FIBER_MACHINES?: string[];
    __DEBUG_LAST_FILTER_COUNT?: number;
  }
}

// Helper function to get category icon
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

// Feature Button Component
function FeatureButton({ feature, icon }: { feature: string, icon: React.ReactNode }) {
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
}

function ViewToggle() {
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
  const updateView = (newView: string) => {
    setView(newView)
    localStorage.setItem("view", newView)
    // Trigger a custom event that ViewSelector can listen for
    window.dispatchEvent(new CustomEvent("viewchange", { detail: { view: newView } }))
  }

  // Update sort option and save to localStorage
  const updateSort = (newSort: string) => {
    setSortOption(newSort)
    localStorage.setItem("sortOption", newSort)
    // Trigger a custom event that CompareClientPage can listen for
    window.dispatchEvent(new CustomEvent("sortchange", { detail: { sort: newSort } }))
  }

  // Get the sort option label for display
  const getSortLabel = (option: string) => {
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
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex border rounded-md overflow-hidden">
        <Button
          variant={view === "grid" ? "default" : "ghost"}
          size="sm"
          className="rounded-none"
          onClick={() => updateView("grid")}
        >
          <Grid className="h-4 w-4 mr-1" /> Grid
        </Button>
        <Button
          variant={view === "table" ? "default" : "ghost"}
          size="sm"
          className="rounded-none"
          onClick={() => updateView("table")}
        >
          <Table className="h-4 w-4 mr-1" /> Table
        </Button>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowUpDown className="h-4 w-4" />
            <span>Sort</span>
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
}

interface Filters {
  laserTypes: string[]
  priceRange: [number, number]
  powerRange: [number, number]
  speedRange: [number, number]
  features: string[]
  isTopPick: boolean
}

// Feature list section with centered text buttons
function FeaturesList() {
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
        
        // For fiber, do broad matching
        if (normalizedFilterType === "fiber") {
          return productLaserTypeA === "fiber" || 
                productLaserTypeB === "fiber" ||
                productCategory.includes("fiber") || 
                machineCategory.includes("fiber") ||
                productName.includes("fiber") || 
                productName.includes("fibre");
        }
        
        // For infrared, handle misspellings
        if (normalizedFilterType === "infared" || normalizedFilterType === "infrared") {
          return productLaserTypeA === "infrared" || 
                productLaserTypeA === "infared" ||
                productLaserTypeB === "infrared" || 
                productLaserTypeB === "infared" ||
                productCategory.includes("infrared") || 
                productCategory.includes("infared") ||
                productName.includes("infrared") || 
                productName.includes("infared") || 
                productName.includes("ir");
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
          
          // For infrared, handle misspellings
          if (normalizedFilterType === "infared" || normalizedFilterType === "infrared") {
            return productLaserTypeA === "infrared" || 
                   productLaserTypeA === "infared" ||
                   productLaserTypeB === "infrared" || 
                   productLaserTypeB === "infared" ||
                   productCategory.includes("infrared") || 
                   productCategory.includes("infared") ||
                   productName.includes("infrared") || 
                   productName.includes("infared") || 
                   productName.includes("ir");
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
      
      setFilteredProducts(laserFiltered);
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
    
    // Always update the filtered products
    setFilteredProducts(filtered);
  }, [products, filters, filterProducts]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Filters) => {
    // Log applied filters for debugging
    if (newFilters.laserTypes.length > 0) {
      console.log(`========== APPLYING LASER FILTERS ==========`);
      console.log(`Laser types selected: ${newFilters.laserTypes.join(', ')}`);
      
      // DEBUG: Log the database values being used for filtering
      console.log(`Using database filter values: ${newFilters.laserTypes.map(type => type.toLowerCase())}`);
      
      // Get products that match these filters - for debugging only
      const matchingProducts = products.filter(product => {
        const productLaserTypeA = (product["Laser Type A"] || "").toLowerCase().trim();
        const productLaserTypeB = (product["Laser Type B"] || "").toLowerCase().trim();
        const productName = (product["Machine Name"] || "").toLowerCase().trim();
        const productCategory = (product["Laser Category"] || "").toLowerCase().trim();
        const machineCategory = (product["Machine Category"] || "").toLowerCase().trim();
        
        return newFilters.laserTypes.some(filterType => {
          const normalizedFilterType = filterType.toLowerCase().trim();
          
          if (productLaserTypeA === normalizedFilterType || 
              productLaserTypeB === normalizedFilterType ||
              productCategory === normalizedFilterType ||
              productCategory.includes(normalizedFilterType) ||
              (normalizedFilterType === "fiber" && (
                  productCategory.includes("fiber") || 
                  machineCategory.includes("fiber") ||
                  productName.includes("fiber") || 
                  productName.includes("fibre")
              )) ||
              (normalizedFilterType === "mopa" && (
                  productLaserTypeA === "mopa" || 
                  productLaserTypeB === "mopa" ||
                  productCategory.includes("mopa") || 
                  machineCategory.includes("mopa") ||
                  productName.includes("mopa") || 
                  productName.includes("m-series")
              )) ||
              ((normalizedFilterType === "infared" || normalizedFilterType === "infrared") && (
                  productLaserTypeA === "infrared" || 
                  productLaserTypeA === "infared" ||
                  productLaserTypeB === "infrared" || 
                  productLaserTypeB === "infared" ||
                  productCategory.includes("infrared") || 
                  productCategory.includes("infared") ||
                  productName.includes("infrared") || 
                  productName.includes("infared") || 
                  productName.includes("ir")
              ))) {
            return true;
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
      
      // REMOVED: Direct manipulation of filteredProducts state
      // setFilteredProducts(matchingProducts);
    }
    
    // Just update the filters and let the useEffect handle the filtering
    setFilters(newFilters);
  }, [products])

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

  // Sort the display products based on the current sort option
  const sortProducts = (products: Machine[]) => {
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
  }

  // Get the final list of products to display (intersection of search and filters)
  const displayProducts = React.useMemo(() => {
    // Get the products to display
    let productsToDisplay;
    
    // Check if using default filters
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
    
    // If filters are being applied, prioritize showing filtered products
    if (!isUsingDefaultFilters) {
      console.log(`FINAL DISPLAY: Using filtered products: ${filteredProducts.length} items`);
      
      // ... existing debug code ...

      productsToDisplay = filteredProducts;
    }
    // NEW: Check for active search results (when filteredProducts is a subset of all products)
    else if (filteredProducts.length > 0 && filteredProducts.length < products.length) {
      console.log(`FINAL DISPLAY: Using search results: ${filteredProducts.length} items`);
      productsToDisplay = filteredProducts;
    }
    // If using default filters and no search, show all products
    else if (isUsingDefaultFilters && products.length > 0) {
      console.log(`FINAL DISPLAY: Showing all ${products.length} products`);
      productsToDisplay = products;
    }
    // Fallback to filtered products if available
    else if (filteredProducts && filteredProducts.length > 0) {
      productsToDisplay = filteredProducts;
    }
    // Last resort fallback
    else {
      productsToDisplay = products.filter(product => filterProducts(product, filters));
    }
    
    console.log(`SORTING: About to sort ${productsToDisplay.length} products with sort option: ${sortOption}`);
    
    // Sort the products based on the current sort option
    const sortedProducts = sortProducts(productsToDisplay);
    console.log(`SORTING: Completed sorting ${sortedProducts.length} products, first item: ${sortedProducts[0]?.["Machine Name"]}`);
    
    return sortedProducts;
  }, [filteredProducts, products, filters, filterProducts, sortOption]);

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
    if (filters.laserTypes.includes('fiber')) {
      console.log(`DEBUG: Filter-change effect running - NO secondary filtering will be applied`);
      console.log(`DEBUG: Current filtered products: ${filteredProducts.length} items`);
    }
  }, [products, filteredProducts, filters])

  // Initial load of products
  useEffect(() => {
    fetchProducts()
  }, []) // Remove dependency on filters

  // Create breadcrumb items
  const breadcrumbItems = [{ label: "Compare", href: "/compare" }]

  // Count active filters
  const activeFilterCount =
    (filters.isTopPick ? 1 : 0) +
    filters.laserTypes.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 15000 ? 1 : 0) +
    (filters.powerRange[0] > 0 || filters.powerRange[1] < 150 ? 1 : 0) +
    (filters.speedRange[0] > 0 || filters.speedRange[1] < 2000 ? 1 : 0) +
    (filters.features.length || 0)

  return (
    <div className="container max-w-[1920px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-medium">{displayProducts.length}</span>
          <span className="text-muted-foreground ml-2">
            {displayProducts.length === 1 ? 'machine matches' : 'machines match'} your criteria
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar 
            products={products} // Pass all products to enable searching across everything
            onSearch={handleSearch}
            className="w-64 md:w-80" // Make search bar wider on larger screens
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
              Clear Filters
            </Button>
          ) : null}
        </div>
      </div>

      {/* Revert to consistent flex layout for both view modes but with better table container */}
      <div className="flex flex-col lg:flex-row gap-6 p-6">
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="sticky top-24">
            <SidebarFilter
              categories={categories}
              brands={brands}
              onApplyFilters={handleFilterChange}
              initialFilters={filters}
              filteredCount={displayProducts.length}
            />
          </div>
        </div>

        {displayProducts.length > 0 ? (
          viewMode === "grid" ? (
            <div className="w-full">
              <ProductsGrid products={finalSortedProducts} totalProducts={finalSortedProducts.length} />
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <EnhancedComparisonTable machines={finalSortedProducts} />
            </div>
          )
        ) : (
          <div className="text-center py-20">
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

