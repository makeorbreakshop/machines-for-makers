'use client'

import { useState, useEffect, useCallback } from 'react'
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
  DollarSign,
  ChevronDown,
  ChevronRight,
  Link,
  Eye,
  Target
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
  duplicate_status: 'pending' | 'duplicate' | 'unique' | 'manual_review'
  existing_machine_id: string | null
  similarity_score: number | null
  duplicate_reason: string | null
  checked_at: string | null
  ml_classification: string | null
  ml_confidence: number | null
  ml_reason: string | null
  machine_type: string | null
  should_auto_skip: boolean
  manufacturer_sites: {
    id: string
    name: string
    base_url: string
  }
  existing_machine: {
    id: string
    "Machine Name": string
    "Company": string
    "Machine Category": string
    "Internal link": string
    "Image": string
    "Laser Power A": string
    "Price": string
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
  const [duplicateFilter, setDuplicateFilter] = useState<string>('all')
  const [scraping, setScraping] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [runningDuplicateCheck, setRunningDuplicateCheck] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [machines, setMachines] = useState<any[]>([])
  const [showMachineSelector, setShowMachineSelector] = useState<string | null>(null)
  const [machineSearch, setMachineSearch] = useState('')

  useEffect(() => {
    fetchURLs()
    fetchMachines()
  }, [manufacturerId, statusFilter, duplicateFilter])

  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/machines?limit=1000') // Get all machines for linking
      if (response.ok) {
        const data = await response.json()
        setMachines(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching machines:', error)
    }
  }

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
      if (duplicateFilter !== 'all') params.append('duplicate_status', duplicateFilter)
      
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

  const handleSelectUrl = useCallback((urlId: string, checked: boolean) => {
    const newSelected = new Set(selectedUrls)
    if (checked) {
      newSelected.add(urlId)
    } else {
      newSelected.delete(urlId)
    }
    setSelectedUrls(newSelected)
  }, [selectedUrls])

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

  const handleRunDuplicateCheck = async () => {
    setRunningDuplicateCheck(true)
    try {
      const response = await fetch('/api/admin/run-duplicate-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          manufacturer_id: manufacturerId 
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Duplicate detection results:', result)
        
        // Only refresh once after duplicate detection is complete
        await fetchURLs()
        
        alert(`Duplicate detection complete! Checked ${result.checked} URLs, found ${result.duplicates_found} duplicates.`)
      } else {
        const error = await response.json()
        alert(`Error running duplicate detection: ${error.error}`)
      }
    } catch (error) {
      console.error('Error running duplicate detection:', error)
      alert('Failed to run duplicate detection. Make sure the Python service is running.')
    } finally {
      setRunningDuplicateCheck(false)
    }
  }

  const toggleRowExpansion = (urlId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(urlId)) {
      newExpanded.delete(urlId)
    } else {
      newExpanded.add(urlId)
    }
    setExpandedRows(newExpanded)
  }

  const handleConfirmDuplicate = async (urlId: string) => {
    try {
      const response = await fetch('/api/admin/update-url-duplicate-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: urlId, 
          duplicate_status: 'duplicate',
          confirmed: true
        })
      })
      
      if (response.ok) {
        // Optimistic update - just update the specific URL in state
        setUrls(prevUrls => 
          prevUrls.map(url => 
            url.id === urlId 
              ? { ...url, duplicate_status: 'duplicate' as const }
              : url
          )
        )
      }
    } catch (error) {
      console.error('Error confirming duplicate:', error)
    }
  }

  const handleMarkAsUnique = async (urlId: string) => {
    try {
      const response = await fetch('/api/admin/update-url-duplicate-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: urlId, 
          duplicate_status: 'unique'
        })
      })
      
      if (response.ok) {
        // Optimistic update - mark as unique and remove existing machine link
        setUrls(prevUrls => 
          prevUrls.map(url => 
            url.id === urlId 
              ? { 
                  ...url, 
                  duplicate_status: 'unique' as const,
                  existing_machine: null,
                  existing_machine_id: null,
                  similarity_score: null
                }
              : url
          )
        )
      }
    } catch (error) {
      console.error('Error marking as unique:', error)
    }
  }

  const handleLinkToMachine = async (urlId: string, machineId: string) => {
    try {
      const response = await fetch('/api/admin/link-url-to-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url_id: urlId, 
          machine_id: machineId
        })
      })
      
      if (response.ok) {
        // Find the selected machine from our machines list
        const selectedMachine = machines.find(m => m.id === machineId)
        
        // Optimistic update - link to the selected machine
        setUrls(prevUrls => 
          prevUrls.map(url => 
            url.id === urlId 
              ? { 
                  ...url, 
                  duplicate_status: 'duplicate' as const,
                  existing_machine_id: machineId,
                  existing_machine: selectedMachine ? {
                    id: selectedMachine.id,
                    "Machine Name": selectedMachine["Machine Name"],
                    "Company": selectedMachine["Company"],
                    "Machine Category": selectedMachine["Machine Category"] || '',
                    "Internal link": selectedMachine["Internal link"] || '',
                    "Image": selectedMachine["Image"] || '',
                    "Laser Power A": selectedMachine["Laser Power A"] || '',
                    "Price": selectedMachine["Price"] || ''
                  } : null,
                  similarity_score: 1.0,
                  duplicate_reason: 'manual_link'
                }
              : url
          )
        )
        
        setShowMachineSelector(null)
        setMachineSearch('')
      }
    } catch (error) {
      console.error('Error linking to machine:', error)
    }
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
    failed: urls.filter(u => u.status === 'failed').length,
    // Duplicate detection stats
    duplicates: urls.filter(u => u.duplicate_status === 'duplicate').length,
    unique: urls.filter(u => u.duplicate_status === 'unique').length,
    duplicate_pending: urls.filter(u => u.duplicate_status === 'pending').length
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

      {/* Compact Stats */}
      <div className="flex items-center gap-6 text-sm mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Total:</span>
          <span className="font-semibold text-lg">{stats.total}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-yellow-600">Pending: {stats.pending}</span>
          <span className="text-green-600">Scraped: {stats.scraped}</span>
          <span className="text-gray-600">Skipped: {stats.skipped}</span>
          <span className="text-red-600">Failed: {stats.failed}</span>
        </div>
        <div className="flex items-center gap-4 border-l pl-4">
          <span className="text-green-600">Unique: {stats.unique}</span>
          <span className="text-orange-600">Duplicates: {stats.duplicates}</span>
          <span className="text-gray-600">Not Checked: {stats.duplicate_pending}</span>
        </div>
      </div>

      {/* ML Classification Stats */}
      {urls.some(u => u.ml_classification) && (
        <div className="flex items-center gap-6 text-sm mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium">AI Classification:</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-600">
              <Badge variant="default" className="text-xs">MACHINE</Badge> {urls.filter(u => u.ml_classification === 'MACHINE').length}
            </span>
            <span className="text-red-600">
              <Badge variant="destructive" className="text-xs">MATERIAL</Badge> {urls.filter(u => u.ml_classification === 'MATERIAL').length}
            </span>
            <span className="text-red-600">
              <Badge variant="destructive" className="text-xs">ACCESSORY</Badge> {urls.filter(u => u.ml_classification === 'ACCESSORY').length}
            </span>
            <span className="text-yellow-600">
              <Badge variant="secondary" className="text-xs">PACKAGE</Badge> {urls.filter(u => u.ml_classification === 'PACKAGE').length}
            </span>
            <span className="text-red-600">
              <Badge variant="destructive" className="text-xs">SERVICE</Badge> {urls.filter(u => u.ml_classification === 'SERVICE').length}
            </span>
          </div>
        </div>
      )}

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
          <div className="flex gap-4 flex-wrap">
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
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>

            <Select value={duplicateFilter} onValueChange={setDuplicateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by duplicates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All URLs</SelectItem>
                <SelectItem value="unique">Unique Only</SelectItem>
                <SelectItem value="duplicate">Duplicates Only</SelectItem>
                <SelectItem value="pending">Not Checked</SelectItem>
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

            <Button 
              variant="outline" 
              onClick={handleRunDuplicateCheck}
              disabled={runningDuplicateCheck}
            >
              {runningDuplicateCheck ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Run Duplicate Check'
              )}
            </Button>

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
            {filteredUrls.map(url => {
              const isExpanded = expandedRows.has(url.id)
              
              return (
                <div key={url.id} className="hover:bg-gray-50">
                  <div className="p-4 flex items-center gap-4">
                    {url.status === 'pending' && (
                      <Checkbox
                        checked={selectedUrls.has(url.id)}
                        onCheckedChange={(checked) => handleSelectUrl(url.id, checked as boolean)}
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline">{url.manufacturer_sites.name}</Badge>
                        <Badge variant="secondary">{url.category.replace('_', ' ')}</Badge>
                        
                        {/* Scraping Status */}
                        {url.status === 'pending' && <Badge variant="default">Pending</Badge>}
                        {url.status === 'scraped' && <Badge variant="default" className="bg-green-500">Scraped</Badge>}
                        {url.status === 'skipped' && <Badge variant="secondary">Skipped</Badge>}
                        {url.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                        
                        {/* Duplicate Status */}
                        {url.duplicate_status === 'unique' && <Badge variant="default" className="bg-green-500">Unique</Badge>}
                        {url.duplicate_status === 'duplicate' && <Badge variant="destructive">Duplicate</Badge>}
                        {url.duplicate_status === 'pending' && <Badge variant="outline">Not Checked</Badge>}
                        {url.duplicate_status === 'manual_review' && <Badge variant="default" className="bg-yellow-500">Manual Review</Badge>}
                        
                        {/* Similarity Score */}
                        {url.similarity_score && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(url.similarity_score * 100)}% match
                          </Badge>
                        )}
                        
                        {/* ML Classification Badge */}
                        {url.ml_classification && (
                          <Badge 
                            variant={
                              url.ml_classification === 'MACHINE' ? 'default' :
                              url.ml_classification === 'MATERIAL' ? 'destructive' :
                              url.ml_classification === 'ACCESSORY' ? 'destructive' :
                              url.ml_classification === 'PACKAGE' ? 'secondary' :
                              url.ml_classification === 'SERVICE' ? 'destructive' :
                              'outline'
                            }
                            className="text-xs"
                            title={`${url.ml_reason || 'ML Classification'} (Confidence: ${url.ml_confidence ? Math.round(url.ml_confidence * 100) : 0}%)`}
                          >
                            {url.ml_classification}
                            {url.machine_type && url.ml_classification === 'MACHINE' && (
                              <span className="ml-1 text-xs opacity-70">({url.machine_type})</span>
                            )}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm font-mono text-gray-600 mb-2">{url.url}</div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {url.duplicate_status === 'duplicate' && url.existing_machine && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleRowExpansion(url.id)}
                            className="flex items-center gap-1"
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <Target className="h-3 w-3" />
                            View Match
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowMachineSelector(showMachineSelector === url.id ? null : url.id)}
                          className="flex items-center gap-1"
                        >
                          <Link className="h-3 w-3" />
                          Link to Machine
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRowExpansion(url.id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Details
                        </Button>
                      </div>
                      
                      {url.error_message && (
                        <div className="text-sm text-red-600 mt-2">
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

                  {/* Expandable Section */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t bg-gray-50">
                      <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
                        {url.existing_machine ? (
                          <div className="flex items-start gap-4">
                            {/* Machine Image */}
                            <div className="flex-shrink-0">
                              <img
                                src={url.existing_machine["Image"] || '/placeholder-machine.jpg'}
                                alt={url.existing_machine["Machine Name"]}
                                className="w-20 h-20 object-cover rounded border"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-machine.jpg'
                                }}
                              />
                            </div>
                            
                            {/* Machine Details */}
                            <div className="flex-1">
                              <div className="font-medium text-lg">{url.existing_machine["Machine Name"]}</div>
                              <div className="text-sm text-gray-600 mb-2">by {url.existing_machine["Company"]}</div>
                              
                              {/* Specifications */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                                {url.existing_machine["Machine Category"] && (
                                  <div>
                                    <span className="text-gray-500">Category:</span> {url.existing_machine["Machine Category"]}
                                  </div>
                                )}
                                {url.existing_machine["Laser Power A"] && (
                                  <div>
                                    <span className="text-gray-500">Power:</span> {url.existing_machine["Laser Power A"]}W
                                  </div>
                                )}
                                {url.existing_machine["Price"] && (
                                  <div>
                                    <span className="text-gray-500">Price:</span> ${url.existing_machine["Price"]}
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-2">
                                {url.existing_machine["Internal link"] && (
                                  <a
                                    href={`/products/${url.existing_machine["Internal link"]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    View Product
                                  </a>
                                )}
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkAsUnique(url.id)}
                                  className="flex items-center gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Mark as Unique
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : url.duplicate_status === 'duplicate' ? (
                          <div className="text-sm text-orange-600">
                            Marked as duplicate but machine details not loaded
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">
                            No duplicate match found
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Machine Selector */}
                  {showMachineSelector === url.id && (() => {
                    const filteredMachines = machines.filter(m => 
                      m["Machine Name"]?.toLowerCase().includes(machineSearch.toLowerCase()) ||
                      m["Company"]?.toLowerCase().includes(machineSearch.toLowerCase())
                    ).slice(0, 10) // Limit to 10 results
                    
                    return (
                      <div className="px-4 pb-4 border-t bg-blue-50">
                        <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                          <div className="flex items-center gap-2 mb-3">
                            <Link className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Link to Existing Machine</span>
                          </div>
                          
                          <input
                            type="text"
                            placeholder="Search machines by name or brand..."
                            value={machineSearch}
                            onChange={(e) => setMachineSearch(e.target.value)}
                            className="w-full p-2 border rounded mb-3 text-sm"
                          />
                          
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {filteredMachines.map(machine => (
                              <div
                                key={machine.id}
                                onClick={() => handleLinkToMachine(url.id, machine.id)}
                                className="p-2 hover:bg-blue-100 cursor-pointer rounded border flex items-center gap-3"
                              >
                                <div className="flex-shrink-0 w-12 h-12">
                                  {machine["Image"] ? (
                                    <img
                                      src={machine["Image"]}
                                      alt={machine["Machine Name"]}
                                      className="w-12 h-12 object-cover rounded border"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center">
                                      <span className="text-gray-400 text-xs">No img</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{machine["Machine Name"]}</div>
                                  <div className="text-xs text-gray-600 truncate">{machine["Company"]}</div>
                                </div>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {machine["Category"]}
                                </Badge>
                              </div>
                            ))}
                            {filteredMachines.length === 0 && machineSearch && (
                              <div className="text-sm text-gray-500 p-2">No machines found</div>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowMachineSelector(null)
                              setMachineSearch('')
                            }}
                            className="mt-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}