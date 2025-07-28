'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { 
  Search,
  Loader2,
  Link,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  DollarSign,
  ExternalLink,
  Activity,
  Clock
} from "lucide-react"

interface URLDiscoveryModalProps {
  isOpen: boolean
  onClose: () => void
  manufacturerId: string
  manufacturerName: string
  baseUrl: string
}

interface DiscoveredURL {
  url: string
  category: string
  selected: boolean
  valid?: boolean
}

interface DiscoveryResults {
  domain: string
  pages_crawled: number
  credits_used: number
  total_urls_found: number
  urls: string[]
  categorized: Record<string, string[]>
  estimated_credits_per_product: number
  estimated_total_credits: number
  discovery_method?: 'sitemap' | 'crawling'
}

interface DiscoveryStatus {
  scan_id: string
  status: 'running' | 'completed' | 'failed'
  total_urls: number
  processed_urls: number
  discovered_products: number
  errors: string[]
  created_at: string
  completed_at?: string
  current_stage?: string
  credits_used?: number
  status_message?: string
}

export function URLDiscoveryModal({
  isOpen,
  onClose,
  manufacturerId,
  manufacturerName,
  baseUrl
}: URLDiscoveryModalProps) {
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [scanId, setScanId] = useState<string | null>(null)
  const [discoveryStatus, setDiscoveryStatus] = useState<DiscoveryStatus | null>(null)
  const [results, setResults] = useState<DiscoveryResults | null>(null)
  const [urls, setUrls] = useState<DiscoveredURL[]>([])
  const [filter, setFilter] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [maxPages, setMaxPages] = useState(5)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsDiscovering(false)
      setScanId(null)
      setDiscoveryStatus(null)
      setResults(null)
      setUrls([])
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }
    }
  }, [isOpen])

  // Calculate costs
  const selectedUrls = urls.filter(u => u.selected)
  const estimatedCredits = selectedUrls.length * (results?.estimated_credits_per_product || 20)
  const estimatedCost = estimatedCredits * 0.00005

  // Poll for discovery status
  useEffect(() => {
    if (scanId && isDiscovering) {
      // Start polling
      pollingInterval.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/admin/discovery-status/${scanId}`)
          if (!response.ok) throw new Error('Failed to get status')
          
          const status: DiscoveryStatus = await response.json()
          setDiscoveryStatus(status)
          
          // Check if discovery is complete
          if (status.status === 'completed' || status.status === 'failed') {
            setIsDiscovering(false)
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current)
              pollingInterval.current = null
            }
            
            // If completed, fetch the full results
            if (status.status === 'completed' && status.discovered_products > 0) {
              // For now, show completion message
              // In production, this would redirect to discovered products page
              setResults({
                domain: new URL(baseUrl).hostname,
                pages_crawled: status.processed_urls,
                credits_used: status.credits_used || 0,
                total_urls_found: status.total_urls,
                urls: [],
                categorized: {
                  'products': [`${status.discovered_products} products discovered`]
                },
                estimated_credits_per_product: 20,
                estimated_total_credits: status.discovered_products * 20,
                discovery_method: status.total_urls > 0 ? 'sitemap' : 'crawling'
              })
            }
          }
        } catch (error) {
          console.error('Status polling error:', error)
        }
      }, 2000) // Poll every 2 seconds
    }
    
    // Cleanup on unmount or when discovery stops
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }
    }
  }, [scanId, isDiscovering])
  
  
  const handleDiscoverURLs = async () => {
    setIsDiscovering(true)
    setScanId(null)
    setDiscoveryStatus(null)
    
    try {
      // Use the manufacturer sites crawl endpoint
      const response = await fetch(`/api/admin/manufacturer-sites/${manufacturerId}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_type: 'discovery',
          max_products: maxPages * 10, // Approximate products per page
          test_mode: false
        })
      })

      if (!response.ok) throw new Error('Discovery failed')
      
      const data = await response.json()
      
      // Check if we have immediate results
      if (data.results && data.results.urls) {
        setIsDiscovering(false)
        
        // Transform the results for display
        const categorizedUrls = data.results.categorized || {}
        const allUrls = data.results.urls.map(url => ({
          url,
          category: Object.entries(categorizedUrls).find(([_, urls]) => 
            (urls as string[]).includes(url)
          )?.[0] || 'unknown',
          selected: true
        }))
        
        setResults({
          domain: data.results.domain,
          pages_crawled: data.results.pages_crawled,
          credits_used: data.results.credits_used,
          total_urls_found: data.results.total_urls_found,
          urls: data.results.urls,
          categorized: categorizedUrls,
          estimated_credits_per_product: data.results.estimated_credits_per_product,
          estimated_total_credits: data.results.estimated_total_credits,
          discovery_method: data.results.discovery_method
        })
        
        setUrls(allUrls)
        
        // Show completion message
        toast({
          title: "Discovery Complete",
          description: `Found ${data.results.total_urls_found} product URLs using ${data.results.credits_used} credits`,
        })
      } else if (data.scanLogId) {
        // Fallback to polling if no immediate results
        setScanId(data.scanLogId)
        setDiscoveryStatus({
          scan_id: data.scanLogId,
          status: 'running',
          total_urls: 0,
          processed_urls: 0,
          discovered_products: 0,
          errors: [],
          created_at: new Date().toISOString(),
          current_stage: 'Initializing...',
          status_message: 'Starting URL discovery...'
        })
      }
    } catch (error) {
      console.error('Discovery error:', error)
      setIsDiscovering(false)
    }
  }

  const handleProceedWithSelected = async () => {
    const selected = urls.filter(u => u.selected)
    const selectedUrls = selected.map(u => u.url)
    
    // Create categories mapping
    const categories: Record<string, string> = {}
    selected.forEach(u => {
      categories[u.url] = u.category
    })
    
    // Save discovered URLs to database
    const response = await fetch('/api/admin/save-discovered-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manufacturer_id: manufacturerId,
        urls: selectedUrls,
        categories
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log(`Saved ${result.saved} URLs`)
    }
    
    onClose()
    // Redirect to URL review page
    window.location.href = `/admin/discovered-urls?manufacturer_id=${manufacturerId}`
  }

  const toggleUrl = (index: number) => {
    const newUrls = [...urls]
    newUrls[index].selected = !newUrls[index].selected
    setUrls(newUrls)
  }

  const toggleCategory = (category: string, selected: boolean) => {
    const newUrls = urls.map(u => 
      u.category === category ? { ...u, selected } : u
    )
    setUrls(newUrls)
  }

  const filteredUrls = urls.filter(u => {
    const matchesFilter = u.url.toLowerCase().includes(filter.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || u.category === selectedCategory
    return matchesFilter && matchesCategory
  })

  const categories = results ? Object.keys(results.categorized) : []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Discover Product URLs - {manufacturerName}
          </DialogTitle>
        </DialogHeader>

        {!results && !isDiscovering ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will discover product URLs from {baseUrl}.<br/>
                <strong>Process:</strong> First checks sitemap.xml (most efficient), then falls back to crawling if needed.<br/>
                <strong>Credits:</strong> Sitemap uses ~2 credits total. Crawling uses 1-2 credits per page.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Max pages to crawl</Label>
              <Input
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                min={1}
                max={20}
              />
              <p className="text-sm text-muted-foreground">
                Estimated credits: {maxPages * 2} ({maxPages} pages × 2 credits)
              </p>
            </div>

            <Button 
              onClick={handleDiscoverURLs}
              disabled={isDiscovering}
              className="w-full"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discovering URLs...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Start URL Discovery
                </>
              )}
            </Button>
          </div>
        ) : isDiscovering && discoveryStatus ? (
          // Real-time discovery progress
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 animate-pulse text-blue-500" />
              <h3 className="text-lg font-semibold">Discovery in Progress</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Stage:</span>
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {discoveryStatus.current_stage}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{discoveryStatus.processed_urls} / {discoveryStatus.total_urls || '?'} URLs</span>
                </div>
                <Progress 
                  value={discoveryStatus.total_urls > 0 
                    ? (discoveryStatus.processed_urls / discoveryStatus.total_urls) * 100 
                    : 0
                  } 
                  className="h-2"
                />
              </div>
              
              {discoveryStatus.status_message && (
                <Alert>
                  <AlertDescription>
                    {discoveryStatus.status_message}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">URLs Found</p>
                  <p className="text-lg font-semibold">{discoveryStatus.total_urls}</p>
                </div>
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Products Discovered</p>
                  <p className="text-lg font-semibold">{discoveryStatus.discovered_products}</p>
                </div>
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                  <p className="text-lg font-semibold">{discoveryStatus.credits_used || 0}</p>
                </div>
              </div>
              
              {discoveryStatus.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {discoveryStatus.errors[0]}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Started {new Date(discoveryStatus.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDiscovering(false)
                if (pollingInterval.current) {
                  clearInterval(pollingInterval.current)
                }
              }}
              className="w-full"
            >
              Cancel Discovery
            </Button>
          </div>
        ) : results && discoveryStatus?.status === 'completed' ? (
          // Discovery completed - show summary
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Discovery Complete!</strong><br/>
                Successfully discovered {discoveryStatus.discovered_products} products from {manufacturerName}.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded p-3">
                <p className="text-sm text-muted-foreground">URLs Processed</p>
                <p className="text-lg font-semibold">{discoveryStatus.processed_urls}</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-sm text-muted-foreground">Products Found</p>
                <p className="text-lg font-semibold">{discoveryStatus.discovered_products}</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-sm text-muted-foreground">Credits Used</p>
                <p className="text-lg font-semibold">{discoveryStatus.credits_used || 0}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  onClose()
                  // Redirect to discovered products review page
                  window.location.href = `/admin/discovered-products?site_id=${manufacturerId}`
                }}
              >
                Review Discovered Products
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="space-y-4">
              {results.discovery_method && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Discovery method: {results.discovery_method === 'sitemap' ? 'Sitemap' : 'Web Crawling'}</strong>
                    {results.discovery_method === 'sitemap' && 
                      <span> - Most efficient method! Found all URLs with minimal credits.</span>
                    }
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-4 gap-4">
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Pages Crawled</p>
                  <p className="text-lg font-semibold">{results.pages_crawled}</p>
                </div>
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                  <p className="text-lg font-semibold">{results.credits_used}</p>
                </div>
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">URLs Found</p>
                  <p className="text-lg font-semibold">{results.total_urls_found}</p>
                </div>
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Selected</p>
                  <p className="text-lg font-semibold">{selectedUrls.length}</p>
                </div>
              </div>
            </div>

            {/* Cost Estimate */}
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                <strong>Estimated cost to scrape selected URLs:</strong><br/>
                {selectedUrls.length} URLs × {results.estimated_credits_per_product} credits = {estimatedCredits} credits (${estimatedCost.toFixed(2)})
              </AlertDescription>
            </Alert>

            {/* Filters */}
            <div className="flex gap-2">
              <Input
                placeholder="Filter URLs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1"
              />
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  {categories.map(cat => (
                    <TabsTrigger key={cat} value={cat}>
                      {cat.replace('_', ' ')}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Category Actions */}
            {selectedCategory !== 'all' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleCategory(selectedCategory, true)}
                >
                  Select All in Category
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleCategory(selectedCategory, false)}
                >
                  Deselect All in Category
                </Button>
              </div>
            )}

            {/* URL List */}
            <ScrollArea className="h-[400px] border rounded p-4">
              <div className="space-y-2">
                {filteredUrls.map((urlObj, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                  >
                    <Checkbox
                      checked={urlObj.selected}
                      onCheckedChange={() => toggleUrl(urls.indexOf(urlObj))}
                    />
                    <Badge variant="outline" className="shrink-0">
                      {urlObj.category.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm flex-1 truncate">
                      {urlObj.url}
                    </span>
                    <a 
                      href={urlObj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleProceedWithSelected}
                disabled={selectedUrls.length === 0}
              >
                Proceed with {selectedUrls.length} URLs
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}