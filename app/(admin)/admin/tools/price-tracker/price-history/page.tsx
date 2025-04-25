"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"
import { 
  Filter, 
  RefreshCw, 
  ArrowDownToLine
} from "lucide-react"
import { supabaseClient } from "@/lib/supabase/client"

// Create a proper interface for a machine
interface Machine {
  id: string;
  "Machine Name": string;
  [key: string]: any; // Allow other properties
}

// Create an interface for history items
interface PriceHistoryItem {
  id: string;
  machine_id: string;
  variant_attribute?: string;
  scraped_from_url?: string;
  validation_basis_price?: number | string;
  previous_price?: number | string;
  price?: number | string;
  status?: string;
  review_reason?: string;
  tier?: string;
  extraction_method?: string;
  extracted_confidence?: number;
  date: string;
  machineName?: string; // Added field for the machine name from join
  [key: string]: any; // Allow other properties
}

export default function PriceHistoryPage() {
  // State for price history items
  const [historyItems, setHistoryItems] = useState<PriceHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("history")
  
  // Filtering state
  const [filters, setFilters] = useState({
    status: [] as string[],
    batchId: null as string | null,
    startDate: null as Date | null,
    endDate: null as Date | null,
    search: "",
    machineName: "",
    brand: "",
    minPriceChange: null as number | null,
    maxPriceChange: null as number | null,
    extractionMethod: [] as string[],
    confidence: null as number | null,
  })
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  
  // URL parameters
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Handle URL parameters for filtering
  useEffect(() => {
    if (!searchParams) return;
    
    // Check if a specific mode is requested
    const mode = searchParams.get('mode')
    if (mode) {
      setActiveTab(mode)
      
      // Apply mode-specific filters
      if (mode === 'review') {
        setFilters(prev => ({
          ...prev,
          status: ['NEEDS_REVIEW']
        }))
      } else if (mode === 'batch') {
        const batchId = searchParams.get('batchId')
        if (batchId) {
          setFilters(prev => ({
            ...prev,
            batchId
          }))
        }
      }
    }
    
    // Apply other URL parameters as filters
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const confidence = searchParams.get('confidence')
    
    // Update filters based on URL parameters
    setFilters(prev => ({
      ...prev,
      status: status ? status.split(',') : prev.status,
      search: search || prev.search,
      confidence: confidence ? parseFloat(confidence) : prev.confidence,
    }))
    
  }, [searchParams])
  
  // Fetch price history with filters using Supabase directly
  const fetchPriceHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Start with the basic query to price_history
      let query = supabaseClient
        .from('price_history')
        .select(`
          *,
          machines!inner("Machine Name")
        `, { count: 'exact' })
        .order('date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)
      
      // Add filters
      if (filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      
      if (filters.batchId) {
        query = query.eq('batch_id', filters.batchId)
      }
      
      if (filters.search) {
        // This will search in related machines table
        query = query.or(`machines."Machine Name".ilike.%${filters.search}%,company.ilike.%${filters.search}%`)
      }
      
      if (filters.machineName) {
        query = query.textSearch('machines."Machine Name"', filters.machineName)
      }
      
      if (filters.brand) {
        query = query.ilike('company', `%${filters.brand}%`)
      }
      
      if (filters.minPriceChange !== null && filters.minPriceChange !== undefined) {
        query = query.gte('price_change', filters.minPriceChange)
      }
      
      if (filters.maxPriceChange !== null && filters.maxPriceChange !== undefined) {
        query = query.lte('price_change', filters.maxPriceChange)
      }
      
      if (filters.extractionMethod.length > 0) {
        query = query.in('extraction_method', filters.extractionMethod)
      }
      
      if (filters.confidence !== null && filters.confidence !== undefined) {
        query = query.gte('extracted_confidence', filters.confidence)
      }
      
      if (filters.startDate && filters.endDate) {
        query = query
          .gte('date', filters.startDate.toISOString())
          .lte('date', filters.endDate.toISOString())
      }

      // Execute the query
      const { data, error, count } = await query
      
      if (error) {
        throw error
      }
      
      // Transform the data to include the machine name
      const enhancedItems = data.map((item: any) => ({
        ...item,
        machineName: item.machines ? item.machines["Machine Name"] : 'Unknown'
      }))
      
      setHistoryItems(enhancedItems)
      setTotal(count || 0)
    } catch (err: any) {
      setError(err.message || 'Error fetching data')
      console.error('Error fetching data:', err)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }
  
  // Initial fetch
  useEffect(() => {
    fetchPriceHistory()
  }, [page, limit, filters, activeTab])
  
  // Filter handlers
  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }))
    
    // Reset to first page when filters change
    setPage(1)
  }
  
  // Mode handlers
  const handleSetMode = (mode: string) => {
    setActiveTab(mode)
    
    // Apply mode-specific filters
    if (mode === 'review') {
      setFilters(prev => ({
        ...prev,
        status: ['NEEDS_REVIEW'],
        batchId: null
      }))
    } else if (mode === 'batch') {
      // Keep batch ID if it exists
    } else {
      // Default history mode - no special filters
      setFilters(prev => ({
        ...prev,
        status: [],
        batchId: null
      }))
    }
  }
  
  // Export data to CSV
  const handleExportCSV = async () => {
    toast.info("Exporting data to CSV...")
    
    try {
      // Fetch the same data but without pagination
      let query = supabaseClient
        .from('price_history')
        .select(`
          *,
          machines!inner("Machine Name")
        `)
        .order('date', { ascending: false })
      
      // Apply the same filters as the current view
      if (filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      
      if (filters.batchId) {
        query = query.eq('batch_id', filters.batchId)
      }
      
      if (filters.search) {
        query = query.or(`machines."Machine Name".ilike.%${filters.search}%,company.ilike.%${filters.search}%`)
      }
      
      if (filters.machineName) {
        query = query.textSearch('machines."Machine Name"', filters.machineName)
      }
      
      if (filters.brand) {
        query = query.ilike('company', `%${filters.brand}%`)
      }
      
      if (filters.minPriceChange !== null) {
        query = query.gte('price_change', filters.minPriceChange)
      }
      
      if (filters.maxPriceChange !== null) {
        query = query.lte('price_change', filters.maxPriceChange)
      }
      
      if (filters.extractionMethod.length > 0) {
        query = query.in('extraction_method', filters.extractionMethod)
      }
      
      if (filters.confidence !== null) {
        query = query.gte('extracted_confidence', filters.confidence)
      }
      
      if (filters.startDate && filters.endDate) {
        query = query
          .gte('date', filters.startDate.toISOString())
          .lte('date', filters.endDate.toISOString())
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        toast.error("No data to export")
        return
      }
      
      // Process data for CSV
      const enhancedItems = data.map((item: any) => ({
        ...item,
        machineName: item.machines ? item.machines["Machine Name"] : 'Unknown'
      }))
      
      // Convert to CSV
      const headers = Object.keys(enhancedItems[0])
        .filter(key => typeof enhancedItems[0][key] !== 'object' && key !== 'machines')
      
      const csvContent = [
        headers.join(','),
        ...enhancedItems.map(item => 
          headers.map(key => {
            let value = item[key]
            // Handle special formatting or quotes for CSV
            if (value === null || value === undefined) return ''
            if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
            return value
          }).join(',')
        )
      ].join('\n')
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `price-history-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success("Export completed successfully")
    } catch (err: any) {
      console.error("Export error:", err)
      toast.error("Failed to export data")
    }
  }
  
  return (
    <div className="max-w-[1800px] mx-auto px-4 py-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
        <h1 className="text-2xl font-bold">Price History Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage machine price history across vendors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchPriceHistory()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>
      
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleSetMode} className="w-full">
          <div className="border-b px-4 pt-4">
            <TabsList className="inline-flex h-10 bg-muted/40 p-1 rounded-md">
              <TabsTrigger value="history" className="rounded-sm px-3 py-1.5 text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History Mode
              </TabsTrigger>
              <TabsTrigger value="review" className="rounded-sm px-3 py-1.5 text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Review Mode
              </TabsTrigger>
              <TabsTrigger value="batch" className="rounded-sm px-3 py-1.5 text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Batch Mode
              </TabsTrigger>
        </TabsList>
          </div>
          
          <TabsContent value="history" className="p-4">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold">Complete Price History</h2>
            </div>
            <p className="text-sm text-muted-foreground ml-7 mt-1 mb-3">
              View all price tracking history with custom filters and detailed insights
            </p>
        </TabsContent>
        
          <TabsContent value="review" className="p-4">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold">Prices Requiring Review</h2>
            </div>
            <p className="text-sm text-muted-foreground ml-7 mt-1 mb-3">
                Review and approve/reject price changes that require manual verification
              </p>
        </TabsContent>
        
          <TabsContent value="batch" className="p-4">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-xl font-semibold">Batch Results</h2>
            </div>
            <p className="text-sm text-muted-foreground ml-7 mt-1 mb-3">
              View results from specific batch runs and analyze extraction performance
            </p>
            
            {/* Batch selector */}
            <div className="ml-7 mt-4 flex items-end gap-3">
              <div className="flex-1 max-w-sm">
                <Label htmlFor="batchId" className="text-sm font-medium">Batch ID</Label>
                  <Input 
                    id="batchId"
                    value={filters.batchId || ''}
                    onChange={(e) => handleFilterChange({ batchId: e.target.value })}
                    placeholder="Enter batch ID"
                  className="mt-1"
                  />
              </div>
                  <Button 
                variant="default"
                size="sm"
                    onClick={() => fetchPriceHistory()}
                className="mb-[1px]"
                  >
                    Load Batch
                  </Button>
                </div>
        </TabsContent>
      </Tabs>
      </div>
      
      {/* Filters - Simplified placeholder, will be replaced with PriceHistoryFilters component */}
      <div className="bg-muted/20 rounded-lg border p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Filters</h3>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => handleFilterChange({
              status: [],
              search: "",
              machineName: "",
              brand: ""
            })}
          >
            Clear Filters
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Search</Label>
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            <Input 
              id="search"
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
                placeholder="Machine name or brand"
                className="pl-9"
            />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm"
                variant={filters.status.includes('SUCCESS') ? "default" : "outline"}
                className={filters.status.includes('SUCCESS') ? "bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 border-green-200" : ""}
                onClick={() => {
                  const newStatus = filters.status.includes('SUCCESS')
                    ? filters.status.filter(s => s !== 'SUCCESS')
                    : [...filters.status, 'SUCCESS'];
                  handleFilterChange({ status: newStatus });
                }}
              >
                Success
              </Button>
              <Button 
                size="sm"
                variant={filters.status.includes('FAILED') ? "default" : "outline"}
                className={filters.status.includes('FAILED') ? "bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900 border-red-200" : ""}
                onClick={() => {
                  const newStatus = filters.status.includes('FAILED')
                    ? filters.status.filter(s => s !== 'FAILED')
                    : [...filters.status, 'FAILED'];
                  handleFilterChange({ status: newStatus });
                }}
              >
                Failed
              </Button>
              <Button 
                size="sm"
                variant={filters.status.includes('NEEDS_REVIEW') ? "default" : "outline"}
                className={filters.status.includes('NEEDS_REVIEW') ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900 border-yellow-200" : ""}
                onClick={() => {
                  const newStatus = filters.status.includes('NEEDS_REVIEW')
                    ? filters.status.filter(s => s !== 'NEEDS_REVIEW')
                    : [...filters.status, 'NEEDS_REVIEW'];
                  handleFilterChange({ status: newStatus });
                }}
              >
                Review
              </Button>
            </div>
          </div>
          
          {/* Additional filters could be added here */}
          <div className="space-y-2 col-span-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" className="text-xs">Last 7 Days</Button>
              <Button variant="outline" size="sm" className="text-xs">Last 30 Days</Button>
              <Button variant="outline" size="sm" className="text-xs">Last 90 Days</Button>
              <Button variant="outline" size="sm" className="text-xs">Custom Range</Button>
            </div>
          </div>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      {/* Results Table - Placeholder, will be replaced with PriceHistoryTable component */}
      <div className="border rounded-md p-4">
        {loading ? (
          <div className="text-center p-8">Loading data...</div>
        ) : error ? (
          <div className="text-center p-8 text-red-600">
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchPriceHistory}>
              Try Again
            </Button>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="text-center p-8">
            <p>No results found matching your criteria</p>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">Found {total} results</p>
            <div className="rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full table-fixed">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[90px]">Status</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">Machine</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[90px]">Variant</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">URL</th>
                    <th className="p-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]" title="Validation basis price used for comparison">Comparison Price</th>
                    <th className="p-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">Current</th>
                    <th className="p-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">Change</th>
                    <th className="p-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">Review Reason</th>
                    <th className="p-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-[320px]">Method</th>
                    <th className="p-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">Confidence</th>
                    <th className="p-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">Date</th>
                    <th className="p-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historyItems.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-muted/10"}>
                      <td className="p-2 whitespace-nowrap">
                        {item.status === 'SUCCESS' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Success
                          </span>
                        )}
                        {item.status === 'FAILED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Failed
                          </span>
                        )}
                        {item.status === 'NEEDS_REVIEW' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Review
                          </span>
                        )}
                        {!item.status && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap font-medium max-w-[140px] truncate" title={item.machineName || 'Unknown Machine ID: ' + item.machine_id}>
                        {item.machineName || `ID: ${item.machine_id?.substring(0, 8)}...`}
                      </td>
                      <td className="p-2 whitespace-nowrap text-sm max-w-[90px] truncate" title={item.variant_attribute || "DEFAULT"}>
                        {item.variant_attribute || "DEFAULT"}
                      </td>
                      <td className="p-2 max-w-[120px] truncate text-sm">
                        {item.scraped_from_url ? (
                          <a 
                            href={item.scraped_from_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline group"
                            title={item.scraped_from_url}
                          >
                            <span className="truncate group-hover:underline">{item.scraped_from_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 ml-1 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">No URL</span>
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap text-right font-medium" title="Validation basis price used for comparison">
                        {item.validation_basis_price !== undefined && item.validation_basis_price !== null 
                          ? (
                            <span className="text-muted-foreground">
                              ${typeof item.validation_basis_price === 'number' 
                                ? item.validation_basis_price.toFixed(2) 
                                : parseFloat(String(item.validation_basis_price)).toFixed(2)}
                            </span>
                          ) 
                          : item.previous_price !== undefined && item.previous_price !== null 
                            ? (
                              <span className="text-muted-foreground">
                                ${typeof item.previous_price === 'number' 
                                  ? item.previous_price.toFixed(2) 
                                  : parseFloat(String(item.previous_price)).toFixed(2)}
                                <span className="text-xs ml-1 text-yellow-600">(legacy)</span>
                              </span>
                            ) 
                            : (
                              <span className="text-muted-foreground">-</span>
                            )}
                      </td>
                      <td className="p-2 whitespace-nowrap text-right font-medium">
                        {item.price ? `$${typeof item.price === 'number' 
                          ? item.price.toFixed(2) 
                          : parseFloat(String(item.price)).toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2 whitespace-nowrap text-right">
                        {(() => {
                          // Determine which price value to use for comparison
                          const previousPrice = item.validation_basis_price !== undefined && item.validation_basis_price !== null 
                            ? (typeof item.validation_basis_price === 'number' 
                                ? item.validation_basis_price 
                                : parseFloat(String(item.validation_basis_price)))
                            : item.previous_price !== undefined && item.previous_price !== null 
                              ? (typeof item.previous_price === 'number' 
                                  ? item.previous_price 
                                  : parseFloat(String(item.previous_price)))
                              : null;
                          
                          const currentPrice = item.price 
                            ? (typeof item.price === 'number' 
                                ? item.price 
                                : parseFloat(String(item.price)))
                            : null;
                          
                          if (previousPrice !== null && currentPrice !== null) {
                            const change = currentPrice - previousPrice;
                            const displayChange = Math.abs(change).toFixed(2);
                            const isIncrease = change > 0;
                            const isDecrease = change < 0;
                            
                            return (
                              <div className="flex items-center justify-end">
                                {isIncrease && (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                                {isDecrease && (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                                <span className={isIncrease 
                                  ? "text-red-600" 
                                  : isDecrease 
                                    ? "text-green-600" 
                                    : ""
                                }>
                                  {isIncrease ? '+' : isDecrease ? '-' : ''}
                                  ${displayChange}
                                </span>
                              </div>
                            );
                          }
                          
                          return '-';
                        })()}
                      </td>
                      <td className="p-2 text-center text-xs whitespace-normal">
                        <div className="max-w-[120px] truncate" title={item.review_reason || '-'}>
                          {item.status === 'NEEDS_REVIEW' ? (
                            <span className="text-yellow-700">
                              {item.review_reason || 'Requires review'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="max-w-[320px] mx-auto">
                          <span className={`px-2 py-1 text-xs rounded-md inline-block ${
                            item.tier?.toLowerCase().includes('static') 
                              ? 'bg-blue-50 text-blue-700' 
                              : item.tier?.toLowerCase().includes('slice_fast')
                                ? 'bg-green-50 text-green-700'
                                : item.tier?.toLowerCase().includes('slice_balanced')
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : item.tier?.toLowerCase().includes('js')
                                    ? 'bg-purple-50 text-purple-700'
                                    : item.tier?.toLowerCase().includes('full')
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-gray-50 text-gray-700'
                          }`}
                          title={item.extraction_method || item.tier || '-'}>
                            <span className="text-xs whitespace-normal break-words line-clamp-2 text-left">
                              {item.extraction_method || item.tier || '-'}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        {item.extracted_confidence ? (
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-14 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                              <div 
                                className={`h-full rounded-full ${
                                  item.extracted_confidence >= 0.9 
                                    ? 'bg-green-500' 
                                    : item.extracted_confidence >= 0.7 
                                      ? 'bg-yellow-500' 
                                      : 'bg-red-500'
                                }`} 
                                style={{ width: `${Math.round(item.extracted_confidence * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium flex-shrink-0">{Math.round(item.extracted_confidence * 100)}%</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-2 whitespace-nowrap text-center text-sm text-muted-foreground">
                        {new Date(item.date).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td className="p-2 whitespace-nowrap text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="sr-only">Details</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="sr-only">Previous</span>
            </Button>
            
            <div className="flex items-center">
              {[...Array(Math.min(5, Math.ceil(total / limit)))].map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <Button
                    key={i}
                    variant={pageNumber === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNumber)}
                    className={`h-8 w-8 p-0 ${pageNumber === page ? 'pointer-events-none' : ''}`}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
              
              {Math.ceil(total / limit) > 5 && (
                <>
                  <span className="px-2">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.ceil(total / limit))}
                    className="h-8 w-8 p-0"
                  >
                    {Math.ceil(total / limit)}
                  </Button>
                </>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(prev => prev < Math.ceil(total / limit) ? prev + 1 : prev)}
              disabled={page >= Math.ceil(total / limit)}
              className="h-8 w-8 p-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 