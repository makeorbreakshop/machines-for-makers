"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Fuse from 'fuse.js'
import type { Machine } from "@/lib/database-types"
import { useDebounce } from "../hooks/use-debounce"

interface SearchBarProps {
  products: Machine[]
  onSearch: (results: Machine[]) => void
  className?: string
}

interface FuseResult {
  item: Machine
  score: number
  refIndex: number
}

export function SearchBar({ products, onSearch, className }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 150) // Fast enough to feel instant but prevents excessive updates
  
  // Initialize Fuse instance with products and optimized settings
  const fuse = React.useMemo(() => {
    return new Fuse(products, {
      keys: [
        { name: 'Name', weight: 2 }, // Name matches are most important
        { name: 'Brand', weight: 1.5 }, // Brand matches are second most important
        { name: 'Description', weight: 1 } // Description matches are least important
      ],
      threshold: 0.4, // Slightly more lenient threshold for better matches
      distance: 100, // Allow for more distance between characters
      minMatchCharLength: 2, // Minimum of 2 characters to match
      shouldSort: true,
      includeScore: true,
      useExtendedSearch: true, // Enable extended search for better matching
      ignoreLocation: true, // Search entire strings rather than requiring matches at similar positions
    })
  }, [products])

  // Handle search input changes
  const handleSearch = React.useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Effect to perform search when debounced term changes
  React.useEffect(() => {
    // Skip the effect if products array is empty
    if (!products.length) return

    if (!debouncedSearchTerm.trim()) {
      // If search is empty, return all products
      onSearch(products)
      return
    }

    // Perform fuzzy search
    const results = fuse.search(debouncedSearchTerm) as FuseResult[]
    
    // Filter out poor matches (high scores mean poor matches)
    const goodResults = results.filter(result => result.score < 0.6)
    
    // Map results back to products, maintaining sort order by score
    const filteredProducts = goodResults.map(result => result.item)

    // Only call onSearch if we have different results
    onSearch(filteredProducts)
  }, [debouncedSearchTerm, fuse, onSearch, products])

  // Prevent unnecessary re-renders of the input
  const searchInput = React.useMemo(() => (
    <Input
      type="search"
      placeholder="Search machines..."
      className="pl-8 w-full"
      value={searchTerm}
      onChange={(e) => handleSearch(e.target.value)}
    />
  ), [searchTerm, handleSearch])

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      {searchInput}
    </div>
  )
} 