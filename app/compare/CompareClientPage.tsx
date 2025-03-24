"use client"
import { useState, useEffect } from "react"
import ProductsGrid from "@/components/products-grid"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid, Table, Zap, Box, Layers, Maximize2, Minimize2, Briefcase, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import ComparisonTable from "@/components/comparison-table"
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

function ViewToggle() {
  const [view, setView] = useState("grid")

  // This function will be called when the component mounts
  useEffect(() => {
    // Get the view from localStorage or default to grid
    const savedView = localStorage.getItem("view") || "grid"
    setView(savedView)
  }, [])

  // Update view and save to localStorage
  const updateView = (newView: string) => {
    setView(newView)
    localStorage.setItem("view", newView)
    // Trigger a custom event that ViewSelector can listen for
    window.dispatchEvent(new CustomEvent("viewchange", { detail: { view: newView } }))
  }

  return (
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
  )
}

export default function CompareClientPage({
  initialCategories,
  initialBrands,
  initialProducts,
  initialCount,
}: {
  initialCategories: Category[]
  initialBrands: Brand[]
  initialProducts: Machine[]
  initialCount: number
}) {
  // State for products and filters
  const [products, setProducts] = useState<Machine[]>(initialProducts)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [brands, setBrands] = useState<Brand[]>(initialBrands)
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeFilters, setActiveFilters] = useState<{
    laserTypes: string[]
    brands: string[]
    priceRange: [number, number]
    powerRange: [number, number]
    speedRange: [number, number]
    features: string[]
    minRating: number
  }>({
    laserTypes: [],
    brands: [],
    priceRange: [0, 15000],
    powerRange: [0, 150],
    speedRange: [0, 2000],
    features: [],
    minRating: 0,
  })
  const [view, setView] = useState("grid")
  const [totalCount, setTotalCount] = useState(initialCount)
  const [filteredProducts, setFilteredProducts] = useState<Machine[]>(initialProducts)
  const [searchResults, setSearchResults] = useState<Machine[]>(initialProducts)

  // Listen for view changes
  useEffect(() => {
    // Get the initial view from localStorage
    const savedView = localStorage.getItem("view") || "grid"
    setView(savedView)

    // Listen for view change events
    const handleViewChange = (e: CustomEvent) => {
      setView(e.detail.view)
    }

    window.addEventListener("viewchange", handleViewChange as EventListener)

    return () => {
      window.removeEventListener("viewchange", handleViewChange as EventListener)
    }
  }, [])

  // Fetch products with filters
  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()

      // Add category filter
      if (activeCategory !== "all") {
        params.append("category", activeCategory)
      }

      // Add laser type filters
      if (activeFilters.laserTypes.length > 0) {
        activeFilters.laserTypes.forEach((type) => {
          params.append("laserType", type)
        })
      }

      // Add brand filters
      if (activeFilters.brands.length > 0) {
        activeFilters.brands.forEach((brand) => {
          params.append("brand", brand)
        })
      }

      // Add price range
      if (activeFilters.priceRange[0] > 0 || activeFilters.priceRange[1] < 15000) {
        params.append("minPrice", activeFilters.priceRange[0].toString())
        // Only add maxPrice if it's less than 15000 (the max slider value)
        if (activeFilters.priceRange[1] < 15000) {
          params.append("maxPrice", activeFilters.priceRange[1].toString())
        }
      }

      // Add power range
      if (activeFilters.powerRange[0] > 0 || activeFilters.powerRange[1] < 150) {
        params.append("minPower", activeFilters.powerRange[0].toString())
        params.append("maxPower", activeFilters.powerRange[1].toString())
      }

      // Add speed range
      if (activeFilters.speedRange[0] > 0 || activeFilters.speedRange[1] < 2000) {
        params.append("minSpeed", activeFilters.speedRange[0].toString())
        params.append("maxSpeed", activeFilters.speedRange[1].toString())
      }

      // Add features - use exact feature names that match database columns
      if (activeFilters.features.length > 0) {
        console.log('Adding features to query:', activeFilters.features)
        activeFilters.features.forEach((feature) => {
          params.append("feature", feature)
        })
      }

      // Add minimum rating
      if (activeFilters.minRating > 0) {
        params.append("minRating", activeFilters.minRating.toString())
      }

      // Set limit to get all products
      params.append("limit", "1000")

      console.log(`Fetching machines with params: ${params.toString()}`)
      const response = await fetch(`/api/machines?${params.toString()}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API error status: ${response.status}, response: ${errorText}`)
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const newProducts = data.data || []
      setProducts(newProducts)
      setFilteredProducts(newProducts)
      setSearchResults(newProducts) // Reset search results when filters change
      setTotalCount(data.count || 0)
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
      setFilteredProducts([])
      setSearchResults([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)

    // Update laserTypes in activeFilters
    const newFilters = {
      ...activeFilters,
      laserTypes: [],
    }
    setActiveFilters(newFilters)
  }

  // Handle filter application
  const handleApplyFilters = (filters: any) => {
    console.log('CompareClientPage: Applying filters:', filters, 'Features:', filters.features)
    setActiveFilters(filters)
  }

  // Clear all filters
  const handleClearFilters = () => {
    setActiveCategory("all")
    setActiveFilters({
      laserTypes: [],
      brands: [],
      priceRange: [0, 15000],
      powerRange: [0, 150],
      speedRange: [0, 2000],
      features: [],
      minRating: 0,
    })
  }

  // Handle search results
  const handleSearch = (results: Machine[]) => {
    // Only update search results if they're different from current results
    const matchingResults = results.filter(result => 
      filteredProducts.some(filtered => filtered.id === result.id)
    )
    
    // Compare arrays before updating to prevent unnecessary rerenders
    const hasChanged = JSON.stringify(matchingResults.map(r => r.id)) !== JSON.stringify(searchResults.map(r => r.id))
    if (hasChanged) {
      setSearchResults(matchingResults)
    }
  }

  // Get the final list of products to display (intersection of search and filters)
  const displayProducts = React.useMemo(() => {
    // If there's no search term, show all filtered products
    if (!searchResults || searchResults.length === 0) {
      return filteredProducts
    }
    // Otherwise, show the intersection of search results and filtered products
    return searchResults
  }, [searchResults, filteredProducts])

  // Reset search results when filters change, but only if necessary
  useEffect(() => {
    const currentSearchIds = searchResults.map(r => r.id).sort().join(',')
    const filteredIds = filteredProducts.map(r => r.id).sort().join(',')
    
    // Only update if the IDs don't match
    if (currentSearchIds !== filteredIds) {
      if (searchResults.length > 0) {
        const updatedSearchResults = searchResults.filter(result =>
          filteredProducts.some(filtered => filtered.id === result.id)
        )
        // Only set if different to prevent loops
        if (JSON.stringify(updatedSearchResults.map(r => r.id)) !== JSON.stringify(searchResults.map(r => r.id))) {
          setSearchResults(updatedSearchResults)
        }
      } else {
        setSearchResults(filteredProducts)
      }
    }
  }, [filteredProducts, searchResults])

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts()
  }, [activeCategory, activeFilters])

  // Create breadcrumb items
  const breadcrumbItems = [{ label: "Compare", href: "/compare" }]

  // Count active filters
  const activeFilterCount =
    (activeCategory !== "all" ? 1 : 0) +
    activeFilters.laserTypes.length +
    activeFilters.brands.length +
    (activeFilters.priceRange[0] > 0 || activeFilters.priceRange[1] < 15000 ? 1 : 0) +
    (activeFilters.powerRange[0] > 0 || activeFilters.powerRange[1] < 150 ? 1 : 0) +
    (activeFilters.speedRange[0] > 0 || activeFilters.speedRange[1] < 2000 ? 1 : 0) +
    (activeFilters.features.length || 0) +
    (activeFilters.minRating > 0 ? 1 : 0)

  return (
    <ComparisonProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb items={breadcrumbItems} />
          <div className="flex items-center gap-2">
            <SearchBar 
              products={products} // Pass all products to enable searching across everything
              onSearch={handleSearch}
              className="w-64 md:w-80" // Make search bar wider on larger screens
            />
            <ViewToggle />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-medium">{displayProducts.length}</span>
            <span className="text-muted-foreground ml-2">
              {displayProducts.length === 1 ? 'machine matches' : 'machines match'} your criteria
            </span>
          </div>
          {activeFilterCount > 0 && view === "table" && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <aside>
            <SidebarFilter
              categories={categories}
              brands={brands}
              onApplyFilters={handleApplyFilters}
              initialFilters={activeFilters}
              filteredCount={displayProducts.length}
            />
          </aside>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayProducts.length > 0 ? (
            view === "grid" ? (
              <ProductsGrid products={displayProducts} totalProducts={displayProducts.length} />
            ) : (
              <ComparisonTable machines={displayProducts} />
            )
          ) : (
            <div className="text-center py-20">
              <h2 className="text-xl font-medium mb-2">No machines found</h2>
              <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
            </div>
          )}
        </div>
        
        <ComparisonBar />
      </div>
    </ComparisonProvider>
  )
}

