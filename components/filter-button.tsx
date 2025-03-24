"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal } from "lucide-react"
import FilterModal from "./filter-modal"
import type { Category, Brand } from "@/lib/database-types"

interface FilterButtonProps {
  categories: Category[]
  brands: Brand[]
  onApplyFilters: (filters: any) => void
  activeFilters?: {
    laserTypes: string[]
    brands: string[]
    priceRange: [number, number]
    powerRange?: [number, number]
    speedRange?: [number, number]
    features?: string[]
    minRating?: number
  }
  filteredCount?: number // Add prop for the count of filtered machines
}

export default function FilterButton({
  categories,
  brands,
  onApplyFilters,
  activeFilters,
  filteredCount = 0, // Default to 0 if not provided
}: FilterButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState<{
    laserTypes: string[]
    brands: string[]
    priceRange: [number, number]
    powerRange: [number, number]
    speedRange: [number, number]
    features: string[]
    minRating: number
  }>({
    laserTypes: activeFilters?.laserTypes || [],
    brands: activeFilters?.brands || [],
    priceRange: activeFilters?.priceRange || [0, 35000],
    powerRange: activeFilters?.powerRange || [0, 150],
    speedRange: activeFilters?.speedRange || [0, 2000],
    features: activeFilters?.features || [],
    minRating: activeFilters?.minRating || 0,
  })

  // Update local filters when activeFilters prop changes
  useEffect(() => {
    if (activeFilters) {
      setFilters({
        laserTypes: activeFilters.laserTypes || [],
        brands: activeFilters.brands || [],
        priceRange: activeFilters.priceRange || [0, 35000],
        powerRange: activeFilters.powerRange || [0, 150],
        speedRange: activeFilters.speedRange || [0, 2000],
        features: activeFilters.features || [],
        minRating: activeFilters.minRating || 0,
      })
    }
  }, [activeFilters])

  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters)
    onApplyFilters(newFilters)
    setIsModalOpen(false)
  }

  const activeFilterCount =
    (filters.laserTypes?.length || 0) +
    (filters.brands?.length || 0) +
    (filters.priceRange?.[0] > 0 || filters.priceRange?.[1] < 35000 ? 1 : 0) +
    (filters.powerRange?.[0] > 0 || filters.powerRange?.[1] < 150 ? 1 : 0) +
    (filters.speedRange?.[0] > 0 || filters.speedRange?.[1] < 2000 ? 1 : 0) +
    (filters.features?.length || 0) +
    (filters.minRating > 0 ? 1 : 0)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 rounded-full h-auto py-2 px-4 border-gray-300 hover:border-gray-400 bg-white"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5 ml-1">{activeFilterCount}</span>
        )}
      </Button>

      <FilterModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categories={categories || []}
        brands={brands || []}
        onApplyFilters={handleApplyFilters}
        initialFilters={filters}
        filteredCount={filteredCount} // Pass the filtered count to the modal
      />
    </>
  )
}

