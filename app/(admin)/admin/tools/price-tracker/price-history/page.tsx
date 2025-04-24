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

// Importing components that we'll create next
import dynamic from "next/dynamic"

// Lazy load components to fix module not found errors during build
const PriceHistoryTable = dynamic(
  () => import("@/components/price-history/price-history-table").then(mod => mod.PriceHistoryTable),
  { ssr: false, loading: () => <div className="text-center p-8">Loading table...</div> }
)

const PriceHistoryFilters = dynamic(
  () => import("@/components/price-history/price-history-filters").then(mod => mod.PriceHistoryFilters),
  { ssr: false, loading: () => <div className="bg-slate-50 p-4 rounded-md mb-6">Loading filters...</div> }
)

export default function PriceHistoryPage() {
  // State for price history items
  const [historyItems, setHistoryItems] = useState<any[]>([])
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
  
  // API URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
  
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
  
  // Fetch price history with filters
  const fetchPriceHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters
      const queryParams = new URLSearchParams()
      queryParams.append('limit', limit.toString())
      queryParams.append('skip', ((page - 1) * limit).toString())
      
      // Add filters
      if (filters.status.length > 0) {
        queryParams.append('status', filters.status.join(','))
      }
      
      if (filters.batchId) {
        queryParams.append('batchId', filters.batchId)
      }
      
      if (filters.search) {
        queryParams.append('search', filters.search)
      }
      
      if (filters.machineName) {
        queryParams.append('machineName', filters.machineName)
      }
      
      if (filters.brand) {
        queryParams.append('brand', filters.brand)
      }
      
      if (filters.minPriceChange !== null) {
        queryParams.append('minPriceChange', filters.minPriceChange.toString())
      }
      
      if (filters.maxPriceChange !== null) {
        queryParams.append('maxPriceChange', filters.maxPriceChange.toString())
      }
      
      if (filters.extractionMethod.length > 0) {
        queryParams.append('extractionMethod', filters.extractionMethod.join(','))
      }
      
      if (filters.confidence !== null) {
        queryParams.append('confidence', filters.confidence.toString())
      }
      
      if (filters.startDate && filters.endDate) {
        queryParams.append('startDate', filters.startDate.toISOString())
        queryParams.append('endDate', filters.endDate.toISOString())
      }
      
      // Determine which endpoint to use based on mode
      let endpoint = `${API_BASE_URL}/api/v1/price-history`;
      
      if (activeTab === 'review') {
        endpoint = `${API_BASE_URL}/api/v1/reviews`;
      } else if (activeTab === 'batch' && filters.batchId) {
        endpoint = `${API_BASE_URL}/api/v1/batch-results/${filters.batchId}`;
      }
      
      // Fetch from the appropriate endpoint
      const response = await fetch(`${endpoint}?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Transform data based on the endpoint used
      let items = [];
      let totalCount = 0;
      
      if (activeTab === 'review') {
        items = data.machines || [];
        totalCount = data.total || 0;
      } else if (activeTab === 'batch' && filters.batchId) {
        items = data.results || [];
        totalCount = items.length;
      } else {
        items = data.items || [];
        totalCount = data.total || 0;
      }
      
      setHistoryItems(items)
      setTotal(totalCount)
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
  const handleExportCSV = () => {
    toast.info("Exporting data to CSV...")
    // Will implement export functionality later
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Price History Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchPriceHistory()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleSetMode} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history">History Mode</TabsTrigger>
          <TabsTrigger value="review">Review Mode</TabsTrigger>
          <TabsTrigger value="batch">Batch Mode</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Price History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View all price tracking history with custom filters
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="review" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Prices Requiring Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review and approve/reject price changes that require manual verification
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="batch" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View results from specific batch runs
              </p>
              
              {/* Simple batch selector */}
              <div className="mt-2">
                <Label htmlFor="batchId">Batch ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    id="batchId"
                    value={filters.batchId || ''}
                    onChange={(e) => handleFilterChange({ batchId: e.target.value })}
                    placeholder="Enter batch ID"
                  />
                  <Button 
                    variant="secondary"
                    onClick={() => fetchPriceHistory()}
                  >
                    Load Batch
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Filters - Simplified placeholder, will be replaced with PriceHistoryFilters component */}
      <div className="bg-slate-50 p-4 rounded-md mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <Input 
              id="search"
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              placeholder="Search machines or brands"
            />
          </div>
          
          <div>
            <Label>Status</Label>
            <div className="flex gap-2 mt-2">
              <Button 
                size="sm"
                variant={filters.status.includes('SUCCESS') ? "default" : "outline"}
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
            <p className="mb-4">Found {total} results</p>
            {/* Placeholder for table - will be replaced with PriceHistoryTable component */}
            <div className="bg-slate-100 p-8 rounded text-center">
              Price History Table will be displayed here
            </div>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
} 