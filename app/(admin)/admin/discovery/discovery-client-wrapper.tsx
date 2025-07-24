'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { DiscoveryCompactGrid } from "@/components/admin/discovery-compact-grid"
import { DiscoveredProduct } from "./page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Search, Filter } from "lucide-react"

interface DiscoveryClientWrapperProps {
  data: DiscoveredProduct[]
}

interface Filters {
  status: string
  site: string
  search: string
  hasErrors: boolean
}

export function DiscoveryClientWrapper({ data }: DiscoveryClientWrapperProps) {
  const searchParams = useSearchParams()
  const initialSiteFilter = searchParams.get('site')
  
  const [filters, setFilters] = useState<Filters>({
    status: 'pending',
    site: initialSiteFilter || 'all',
    search: '',
    hasErrors: false
  })

  // Get unique sites from data
  const sites = useMemo(() => {
    const uniqueSites = Array.from(new Set(data.map(product => product.scan_log.site.name)))
    return uniqueSites.sort()
  }, [data])

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(product => {
      // Status filter
      if (filters.status !== 'all' && product.status !== filters.status) {
        return false
      }
      
      // Site filter
      if (filters.site !== 'all' && product.scan_log.site.name !== filters.site) {
        return false
      }
      
      // Search filter (searches name, brand, and URL)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const productName = (product.normalized_data?.name || product.raw_data?.name || '').toLowerCase()
        const brand = (product.normalized_data?.brand || product.raw_data?.brand || '').toLowerCase()
        const url = product.source_url.toLowerCase()
        
        if (!productName.includes(searchTerm) && 
            !brand.includes(searchTerm) && 
            !url.includes(searchTerm)) {
          return false
        }
      }
      
      // Errors filter
      if (filters.hasErrors && product.validation_errors.length === 0) {
        return false
      }
      
      return true
    })
  }, [data, filters])

  const clearFilters = () => {
    setFilters({
      status: 'pending',
      site: 'all',
      search: '',
      hasErrors: false
    })
  }

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== 'all' && value !== '' && value !== false
  ).length

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Site Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Site</label>
            <Select 
              value={filters.site} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, site: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site} value={site}>{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Actions</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, hasErrors: !prev.hasErrors }))}
                className={filters.hasErrors ? 'bg-yellow-100 border-yellow-300' : ''}
              >
                {filters.hasErrors ? 'Show All' : 'Errors Only'}
              </Button>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length} products
        </div>
      </div>

      {/* Results */}
      <DiscoveryCompactGrid data={filteredData} defaultSiteFilter={initialSiteFilter || undefined} />
    </div>
  )
}