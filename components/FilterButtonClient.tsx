"use client"

import { useState } from "react"
import FilterButton from "./filter-button"
import type { Category, Brand } from "@/lib/database-types"

interface FilterButtonClientProps {
  categories: Category[]
  brands: Brand[]
  filteredCount?: number
}

export default function FilterButtonClient({
  categories,
  brands,
  filteredCount = 0,
}: FilterButtonClientProps) {
  // We'll handle the onApplyFilters function here in the client component
  const handleApplyFilters = (filters: any) => {
    // In server component usage, we don't need to do anything with the filters
    // This function exists just to satisfy the prop requirements
    console.log("Filters applied:", filters)
  }

  return (
    <FilterButton
      categories={categories}
      brands={brands}
      onApplyFilters={handleApplyFilters}
      filteredCount={filteredCount}
    />
  )
} 