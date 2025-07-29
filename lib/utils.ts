import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as USD currency
 * @param price The price value to format
 * @param currency The currency code (default: 'USD')
 * @returns Formatted price string
 */
export function formatPrice(price: number | null | undefined, currency: string = 'USD'): string {
  if (price === null || price === undefined) {
    return 'N/A';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Filter persistence utilities for maintaining table filter state
 * across page navigation using URL search parameters and localStorage backup.
 */

export interface FilterState {
  categoryFilter: string[]
  brandFilter: string[]
  statusFilter: string[]
}

const FILTER_STORAGE_KEY = 'machines-table-filters'
const FILTER_EXPIRY_KEY = 'machines-table-filters-expiry'
const FILTER_EXPIRY_HOURS = 24 // Filters expire after 24 hours

/**
 * Encodes filter arrays into URL-safe strings
 */
export function encodeFilters(filters: FilterState): Record<string, string> {
  const encoded: Record<string, string> = {}
  
  if (filters.categoryFilter.length > 0) {
    encoded.categories = filters.categoryFilter.join(',')
  }
  if (filters.brandFilter.length > 0) {
    encoded.brands = filters.brandFilter.join(',')
  }
  if (filters.statusFilter.length > 0) {
    encoded.status = filters.statusFilter.join(',')
  }
  
  return encoded
}

/**
 * Decodes URL parameters back into filter arrays
 */
export function decodeFilters(searchParams: URLSearchParams): FilterState {
  return {
    categoryFilter: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    brandFilter: searchParams.get('brands')?.split(',').filter(Boolean) || [],
    statusFilter: searchParams.get('status')?.split(',').filter(Boolean) || [],
  }
}

/**
 * Updates URL search parameters with current filter state
 */
export function updateURLWithFilters(filters: FilterState, currentParams?: URLSearchParams): string {
  const params = new URLSearchParams(currentParams)
  
  // Remove existing filter params
  params.delete('categories')
  params.delete('brands')
  params.delete('status')
  
  // Add new filter params
  const encoded = encodeFilters(filters)
  Object.entries(encoded).forEach(([key, value]) => {
    params.set(key, value)
  })
  
  return params.toString()
}

/**
 * Saves filter state to localStorage with expiry
 */
export function saveFiltersToStorage(filters: FilterState): void {
  if (typeof window === 'undefined') return
  
  try {
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + FILTER_EXPIRY_HOURS)
    
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
    localStorage.setItem(FILTER_EXPIRY_KEY, expiry.toISOString())
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error)
  }
}

/**
 * Loads filter state from localStorage, checking for expiry
 */
export function loadFiltersFromStorage(): FilterState | null {
  if (typeof window === 'undefined') return null
  
  try {
    const expiryStr = localStorage.getItem(FILTER_EXPIRY_KEY)
    if (expiryStr) {
      const expiry = new Date(expiryStr)
      if (new Date() > expiry) {
        // Filters have expired, clear them
        clearFiltersFromStorage()
        return null
      }
    }
    
    const filtersStr = localStorage.getItem(FILTER_STORAGE_KEY)
    if (filtersStr) {
      return JSON.parse(filtersStr)
    }
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error)
  }
  
  return null
}

/**
 * Clears filter state from localStorage
 */
export function clearFiltersFromStorage(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(FILTER_STORAGE_KEY)
    localStorage.removeItem(FILTER_EXPIRY_KEY)
  } catch (error) {
    console.warn('Failed to clear filters from localStorage:', error)
  }
}

/**
 * Checks if any filters are active
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return filters.categoryFilter.length > 0 || 
         filters.brandFilter.length > 0 || 
         filters.statusFilter.length > 0
}
