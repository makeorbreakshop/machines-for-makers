"use client"

import { Button } from "@/components/ui/button"

export default function ClearFiltersButtonClient() {
  const handleClearFilters = () => {
    // In server component context, this doesn't need to do anything
    console.log("Filters cleared")
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClearFilters}>
      Clear Filters
    </Button>
  )
} 