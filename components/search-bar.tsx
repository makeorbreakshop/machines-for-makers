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
  const [isSearching, setIsSearching] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const debouncedSearchTerm = useDebounce(searchTerm, 150)
  
  // Memoize the Fuse instance with optimized settings
  const fuse = React.useMemo(() => {
    return new Fuse(products, {
      keys: [
        { name: 'Machine Name', weight: 1 }
      ],
      threshold: 0.3, // More strict matching
      distance: 150, // Increased for better partial matches
      minMatchCharLength: 2,
      shouldSort: true,
      includeScore: true,
      useExtendedSearch: true,
      ignoreLocation: true,
      findAllMatches: true, // Find all possible matches
      getFn: (obj, path) => {
        // Custom getter to handle undefined/null values
        const value = Fuse.config.getFn(obj, path)
        return value ? String(value).toLowerCase() : ''
      }
    })
  }, [products])

  // Memoize the search function
  const performSearch = React.useCallback((term: string) => {
    if (!products.length) return []
    
    const trimmedTerm = term.trim().toLowerCase()
    if (!trimmedTerm) return products

    try {
      const results = fuse.search(trimmedTerm) as FuseResult[]
      
      // Filter results based on score and relevance
      const goodResults = results
        .filter(result => result.score < 0.4) // Only keep good matches
        .sort((a, b) => {
          // Prioritize exact matches in machine name
          const aExact = (a.item['Machine Name'] || '').toLowerCase().includes(trimmedTerm)
          const bExact = (b.item['Machine Name'] || '').toLowerCase().includes(trimmedTerm)
          if (aExact && !bExact) return -1
          if (!aExact && bExact) return 1
          return a.score - b.score
        })
        .map(result => result.item)

      return goodResults
    } catch (error) {
      console.error('Search error:', error)
      return products // Fallback to all products on error
    }
  }, [fuse, products])

  // Effect to handle search
  React.useEffect(() => {
    const handleSearch = async () => {
      setIsSearching(true)
      try {
        const results = performSearch(debouncedSearchTerm)
        onSearch(results)
      } catch (error) {
        console.error('Search error:', error)
        onSearch(products) // Fallback to all products
      } finally {
        setIsSearching(false)
      }
    }

    handleSearch()
  }, [debouncedSearchTerm, performSearch, onSearch, products])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Command/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Escape to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchTerm('')
        searchInputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <div className={cn("relative group", className)}>
      <Search 
        className={cn(
          "absolute left-2 top-2.5 h-4 w-4 transition-colors",
          isSearching ? "text-primary" : "text-muted-foreground"
        )}
      />
      <Input
        ref={searchInputRef}
        type="search"
        placeholder="Search machines... (⌘K)"
        className={cn(
          "pl-8 w-full transition-all",
          "focus:ring-2 focus:ring-primary/20",
          isSearching && "bg-primary/5"
        )}
        value={searchTerm}
        onChange={handleInputChange}
      />
    </div>
  )
} 