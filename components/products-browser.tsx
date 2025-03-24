"use client"

import { useState, useEffect } from "react"
import { dataProvider } from "@/lib/data-provider"
import ProductsGrid from "./products-grid"
import FilterButton from "./filter-button"
import MobileFilters from "./mobile-filters"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Loader2 } from "lucide-react"

interface ProductsBrowserProps {
  initialCategory?: string
  initialBrands?: string[]
}

export default function ProductsBrowser({ initialCategory, initialBrands = [] }: ProductsBrowserProps) {
  const [products, setProducts] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [filteredCount, setFilteredCount] = useState(0) // Track the count of filtered products
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [filters, setFilters] = useState({
    laserTypes: initialCategory ? [initialCategory] : [],
    brands: initialBrands,
    priceRange: [0, 35000] as [number, number],
    powerRange: [0, 150] as [number, number],
    speedRange: [0, 2000] as [number, number],
    features: [] as string[],
    minRating: 0,
  })
  const [sort, setSort] = useState("newest")
  const [page, setPage] = useState(1)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Fetch categories and brands on mount
  useEffect(() => {
    const fetchCategoriesAndBrands = async () => {
      const [categoriesResponse, brandsResponse] = await Promise.all([
        dataProvider.getCategories(),
        dataProvider.getBrands(),
      ])
      setCategories(categoriesResponse.data || [])
      setBrands(brandsResponse.data || [])
    }

    fetchCategoriesAndBrands()
  }, [])

  // Fetch products when filters, sort, or page changes
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const { data, count } = await dataProvider.getMachines({
          category: filters.laserTypes.length > 0 ? filters.laserTypes[0] : null,
          company: filters.brands.length > 0 ? filters.brands.join(",") : null,
          priceRange: filters.priceRange,
          powerRange: filters.powerRange,
          speedRange: filters.speedRange,
          features: filters.features.length > 0 ? filters.features : null,
          minRating: filters.minRating > 0 ? filters.minRating : null,
          sort: sort,
          page: page,
          limit: 12,
        })
        setProducts(data || [])
        setTotalCount(count || 0)
        setFilteredCount(count || 0) // Update the filtered count
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [filters, sort, page])

  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  const handleSortChange = (newSort: string) => {
    setSort(newSort)
    setPage(1) // Reset to first page when sort changes
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">
          {initialCategory ? `${initialCategory} Machines` : "All Machines"}
          {filteredCount > 0 && <span className="text-gray-500 ml-2 text-lg">({filteredCount})</span>}
        </h1>
        <div className="flex items-center gap-2">
          {isMobile ? (
            <MobileFilters
              categories={categories}
              brands={brands}
              onApplyFilters={handleApplyFilters}
              activeFilters={filters}
              onSortChange={handleSortChange}
              activeSort={sort}
            />
          ) : (
            <>
              <FilterButton
                categories={categories}
                brands={brands}
                onApplyFilters={handleApplyFilters}
                activeFilters={filters}
                filteredCount={filteredCount} // Pass the filtered count to the FilterButton
              />
              {/* Sort dropdown would go here */}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length > 0 ? (
        <ProductsGrid products={products} />
      ) : (
        <div className="text-center py-20">
          <h2 className="text-xl font-medium mb-2">No machines found</h2>
          <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
        </div>
      )}

      {/* Pagination would go here */}
    </div>
  )
}

