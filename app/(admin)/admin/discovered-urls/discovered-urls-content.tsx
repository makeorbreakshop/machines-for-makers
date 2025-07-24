'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  DollarSign
} from "lucide-react"

interface DiscoveredURL {
  id: string
  manufacturer_id: string
  url: string
  category: string
  status: 'pending' | 'scraped' | 'skipped' | 'failed'
  discovered_at: string
  scraped_at: string | null
  error_message: string | null
  machine_id: string | null
  manufacturer_sites: {
    id: string
    name: string
    base_url: string
  }
  machines: {
    id: string
    "Machine Name": string
    slug: string
  } | null
}

interface DiscoveredURLsContentProps {
  onUrlsChange?: (count: number) => void
  onProductsScraped?: () => void
  preSelectedManufacturerId?: string | null
}

export function DiscoveredURLsContent({ 
  onUrlsChange, 
  onProductsScraped,
  preSelectedManufacturerId 
}: DiscoveredURLsContentProps = {}) {
  const searchParams = useSearchParams()
  const manufacturerId = preSelectedManufacturerId || searchParams.get('manufacturer_id')
  
  const [urls, setUrls] = useState<DiscoveredURL[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [scraping, setScraping] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchURLs()
  }, [manufacturerId, statusFilter])

  useEffect(() => {
    // Report URL count changes
    onUrlsChange?.(urls.filter(u => u.status === 'pending').length)
  }, [urls, onUrlsChange])

  const fetchURLs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (manufacturerId) params.append('manufacturer_id', manufacturerId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await fetch(`/api/admin/save-discovered-urls?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setUrls(data)
      } else if (data && typeof data === 'object' && 'error' in data) {
        console.error('API error:', data.error)
        setUrls([])
      } else {
        console.warn('Unexpected response format, using empty array:', data)
        setUrls([])
      }
    } catch (error) {
      console.error('Error fetching URLs:', error)
      setUrls([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingUrls = filteredUrls
        .filter(u => u.status === 'pending')
        .map(u => u.id)
      setSelectedUrls(new Set(pendingUrls))
    } else {
      setSelectedUrls(new Set())
    }
  }

  const handleSelectUrl = (urlId: string, checked: boolean) => {
    const newSelected = new Set(selectedUrls)
    if (checked) {
      newSelected.add(urlId)
    } else {
      newSelected.delete(urlId)
    }
    setSelectedUrls(newSelected)
  }

  const handleScrapeSelected = async () => {
    if (selectedUrls.size === 0) return
    
    setScraping(true)
    try {
      // Get selected URL objects
      const urlsToScrape = urls.filter(u => selectedUrls.has(u.id))
      
      // Get the first manufacturer ID (they should all be the same if filtered)
      const manufacturerIdToUse = manufacturerId || urlsToScrape[0]?.manufacturer_id
      
      // Call the new scrape endpoint
      const response = await fetch('http://localhost:8000/api/v1/scrape-discovered-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlsToScrape.map(u => u.url),
          manufacturer_id: manufacturerIdToUse,
          max_workers: 3
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Scraping started:', result)
        
        // Clear selection
        setSelectedUrls(new Set())
        
        // Show success message
        alert(`Started scraping ${urlsToScrape.length} URLs. Check the Product Discovery page to review extracted products.`)
        
        // Notify parent component if provided
        if (onProductsScraped) {
          setTimeout(() => onProductsScraped(), 2000)
        }
        
        // Refresh after a delay to see status updates
        setTimeout(() => fetchURLs(), 3000)
      } else {
        const error = await response.json()
        alert(`Error starting scrape: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error scraping URLs:', error)
      alert('Failed to start scraping. Make sure the Python service is running.')
    } finally {
      setScraping(false)
    }
  }

  const handleSkipSelected = async () => {
    if (selectedUrls.size === 0) return
    
    // Update status to skipped for selected URLs
    const updatePromises = Array.from(selectedUrls).map(id => 
      fetch(`/api/admin/update-url-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'skipped' })
      })
    )
    
    await Promise.all(updatePromises)
    await fetchURLs()
    setSelectedUrls(new Set())
  }

  const filteredUrls = urls.filter(url => {
    if (categoryFilter !== 'all' && url.category !== categoryFilter) return false
    return true
  })

  const categories = Array.from(new Set(urls.map(u => u.category)))
  const manufacturers = Array.from(new Set(urls.map(u => u.manufacturer_sites.name)))

  const stats = {
    total: urls.length,
    pending: urls.filter(u => u.status === 'pending').length,
    scraped: urls.filter(u => u.status === 'scraped').length,
    skipped: urls.filter(u => u.status === 'skipped').length,
    failed: urls.filter(u => u.status === 'failed').length
  }

  const estimatedCredits = selectedUrls.size * 20 // ~20 credits per product
  const estimatedCost = estimatedCredits * 0.00005 // $0.05 per 1000 credits

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discovered URLs</h1>
        <p className="text-muted-foreground">
          Review and selectively scrape discovered product URLs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total URLs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scraped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.scraped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Skipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>URL Management</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setRefreshing(true)
                fetchURLs().then(() => setRefreshing(false))
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scraped">Scraped</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!manufacturerId && (
              <Select>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Manufacturers</SelectItem>
                  {manufacturers.map(mfr => (
                    <SelectItem key={mfr} value={mfr}>{mfr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selection Actions */}
          {selectedUrls.size > 0 && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <strong>{selectedUrls.size} URLs selected</strong><br/>
                  Estimated cost: {estimatedCredits} credits (${estimatedCost.toFixed(2)})
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleScrapeSelected}
                    disabled={scraping}
                  >
                    {scraping ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      'Scrape Selected'
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleSkipSelected}
                  >
                    Skip Selected
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Select All for pending */}
          {stats.pending > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedUrls.size === stats.pending}
                onCheckedChange={handleSelectAll}
              />
              <label className="text-sm">Select all pending URLs ({stats.pending})</label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* URL List */}
      <Card>
        <CardContent className="p-0">
          {filteredUrls.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="mb-4">No discovered URLs yet.</p>
              <p>Go to <a href="/admin/manufacturer-sites" className="text-blue-600 hover:underline">Manufacturer Sites</a> and use the "Discover URLs" button to find product pages.</p>
            </div>
          ) : (
          <div className="divide-y">
            {filteredUrls.map(url => (
              <div key={url.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                {url.status === 'pending' && (
                  <Checkbox
                    checked={selectedUrls.has(url.id)}
                    onCheckedChange={(checked) => handleSelectUrl(url.id, checked as boolean)}
                  />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{url.manufacturer_sites.name}</Badge>
                    <Badge variant="secondary">{url.category.replace('_', ' ')}</Badge>
                    {url.status === 'pending' && <Badge variant="default">Pending</Badge>}
                    {url.status === 'scraped' && <Badge variant="default" className="bg-green-500">Scraped</Badge>}
                    {url.status === 'skipped' && <Badge variant="secondary">Skipped</Badge>}
                    {url.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                  </div>
                  
                  <div className="text-sm font-mono text-gray-600">{url.url}</div>
                  
                  {url.machines && (
                    <div className="text-sm text-green-600 mt-1">
                      ✓ Created: {url.machines["Machine Name"]}
                    </div>
                  )}
                  
                  {url.error_message && (
                    <div className="text-sm text-red-600 mt-1">
                      Error: {url.error_message}
                    </div>
                  )}
                </div>
                
                <a 
                  href={url.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}