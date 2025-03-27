"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal, Filter } from "lucide-react"
import UnifiedFilter from "@/components/unified-filter"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"
import type { Category, Brand } from "@/lib/database-types"

interface FilterButtonProps {
  categories: Category[]
  brands: Brand[]
  onApplyFilters: (filters: any) => void
  activeFilters?: {
    laserTypes: string[]
    priceRange: [number, number]
    powerRange: [number, number]
    speedRange: [number, number]
    features: string[]
    isTopPick: boolean
  }
  filteredCount?: number
}

export default function FilterButton({
  categories,
  brands,
  onApplyFilters,
  activeFilters,
  filteredCount = 0,
}: FilterButtonProps) {
  const defaultFilters = {
    laserTypes: [],
    priceRange: [0, 15000] as [number, number],
    powerRange: [0, 150] as [number, number],
    speedRange: [0, 2000] as [number, number],
    features: [],
    isTopPick: false
  }

  return (
    <div className="md:hidden">
      <UnifiedFilter
        categories={categories}
        brands={brands}
        onApplyFilters={onApplyFilters}
        initialFilters={activeFilters ?? defaultFilters}
        filteredCount={filteredCount}
      />
    </div>
  )
}

