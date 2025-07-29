"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { 
  FilterState, 
  decodeFilters, 
  updateURLWithFilters, 
  saveFiltersToStorage, 
  loadFiltersFromStorage,
  clearFiltersFromStorage,
  hasActiveFilters
} from '@/lib/utils'

const defaultFilterState: FilterState = {
  categoryFilter: [],
  brandFilter: [],
  statusFilter: []
}

export function usePersistentFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState<FilterState>(defaultFilterState)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize filters from URL or localStorage on mount
  useEffect(() => {
    if (isInitialized) return

    // First priority: URL search params
    const urlParams = new URLSearchParams(searchParams?.toString() || '')
    const urlFilters = decodeFilters(urlParams)
    const hasUrlFilters = hasActiveFilters(urlFilters)

    if (hasUrlFilters) {
      setFilters(urlFilters)
      // Also save to localStorage for backup
      saveFiltersToStorage(urlFilters)
    } else {
      // Second priority: localStorage
      const storedFilters = loadFiltersFromStorage()
      if (storedFilters && hasActiveFilters(storedFilters)) {
        setFilters(storedFilters)
        // Update URL to reflect stored filters
        const newParams = updateURLWithFilters(storedFilters, urlParams)
        if (newParams) {
          router.replace(`${pathname}?${newParams}`, { scroll: false })
        }
      }
    }

    setIsInitialized(true)
  }, [searchParams, pathname, router, isInitialized])

  // Update URL and localStorage when filters change
  const updateFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    
    // Update URL
    const urlParams = new URLSearchParams(searchParams?.toString() || '')
    const newParams = updateURLWithFilters(newFilters, urlParams)
    const newUrl = newParams ? `${pathname}?${newParams}` : pathname
    router.replace(newUrl, { scroll: false })
    
    // Save to localStorage
    if (hasActiveFilters(newFilters)) {
      saveFiltersToStorage(newFilters)
    } else {
      clearFiltersFromStorage()
    }
  }, [searchParams, pathname, router])

  // Individual filter setters
  const setCategoryFilter = useCallback((categories: string[]) => {
    updateFilters({ ...filters, categoryFilter: categories })
  }, [filters, updateFilters])

  const setBrandFilter = useCallback((brands: string[]) => {
    updateFilters({ ...filters, brandFilter: brands })
  }, [filters, updateFilters])

  const setStatusFilter = useCallback((statuses: string[]) => {
    updateFilters({ ...filters, statusFilter: statuses })
  }, [filters, updateFilters])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    updateFilters(defaultFilterState)
  }, [updateFilters])

  // Check if filters are active
  const hasFilters = hasActiveFilters(filters)

  return {
    // Filter state
    categoryFilter: filters.categoryFilter,
    brandFilter: filters.brandFilter,
    statusFilter: filters.statusFilter,
    
    // Filter setters
    setCategoryFilter,
    setBrandFilter,
    setStatusFilter,
    
    // Utilities
    clearAllFilters,
    hasFilters,
    isInitialized
  }
}