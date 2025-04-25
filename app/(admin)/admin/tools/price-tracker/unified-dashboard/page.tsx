"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
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
  ArrowDownToLine,
  LineChart
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

export default function UnifiedDashboardPage() {
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
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive view of price history, reviews, and batch operations
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({
              status: [],
              batchId: null,
              startDate: null,
              endDate: null,
              search: "",
              machineName: "",
              brand: "",
              minPriceChange: null,
              maxPriceChange: null,
              extractionMethod: [],
              confidence: null,
            })}
            disabled={loading}
          >
            Reset Filters
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            disabled={loading}
          >
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPriceHistory()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleSetMode}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history">History View</TabsTrigger>
          <TabsTrigger value="review">Review Mode</TabsTrigger>
          <TabsTrigger value="batch">Batch Mode</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history">
          <PriceHistoryFilters 
            onFilterChange={handleFilterChange}
            filters={filters}
            loading={loading}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Full Price History</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceHistoryTable 
                items={historyItems} 
                loading={loading}
                error={error}
                mode="history"
                onRefresh={fetchPriceHistory}
              />
              
              {total > limit && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    page={page}
                    count={Math.ceil(total / limit)}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="review">
          <PriceHistoryFilters 
            onFilterChange={handleFilterChange}
            filters={{...filters, status: ['NEEDS_REVIEW']}}
            loading={loading}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Items Needing Review</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceHistoryTable 
                items={historyItems} 
                loading={loading}
                error={error}
                mode="review"
                onRefresh={fetchPriceHistory}
              />
              
              {total > limit && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    page={page}
                    count={Math.ceil(total / limit)}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="batch">
          <PriceHistoryFilters 
            onFilterChange={handleFilterChange}
            filters={filters}
            loading={loading}
            batchMode={true}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Batch Results</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceHistoryTable 
                items={historyItems} 
                loading={loading}
                error={error}
                mode="batch"
                onRefresh={fetchPriceHistory}
              />
              
              {total > limit && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    page={page}
                    count={Math.ceil(total / limit)}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-md">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
} 