'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Search,
  Loader2,
  Link,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  DollarSign,
  ExternalLink
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
}

export function URLDiscoveryModal({
  isOpen,
  onClose,
  manufacturerId,
  manufacturerName,
  baseUrl
}: URLDiscoveryModalProps) {
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [results, setResults] = useState<DiscoveryResults | null>(null)
  const [urls, setUrls] = useState<DiscoveredURL[]>([])
  const [filter, setFilter] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [maxPages, setMaxPages] = useState(5)

  // Calculate costs
  const selectedUrls = urls.filter(u => u.selected)
  const estimatedCredits = selectedUrls.length * (results?.estimated_credits_per_product || 20)
  const estimatedCost = estimatedCredits * 0.00005

  const handleDiscoverURLs = async () => {
    setIsDiscovering(true)
    
    try {
      const response = await fetch('/api/admin/discover-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer_id: manufacturerId,
          base_url: baseUrl,
          max_pages: maxPages
        })
      })

      if (!response.ok) throw new Error('Discovery failed')
      
      const data: DiscoveryResults = await response.json()
      setResults(data)
      
      // Convert to URL objects with categories
      const urlObjects: DiscoveredURL[] = []
      for (const [category, categoryUrls] of Object.entries(data.categorized)) {
        for (const url of categoryUrls) {
          urlObjects.push({
            url,
            category,
            selected: category !== 'accessories' // Auto-select non-accessories
          })
        }
      }
      
      setUrls(urlObjects)
    } catch (error) {
      console.error('Discovery error:', error)
    } finally {
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

        {!results ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will crawl {baseUrl} to find product pages. 
                Only basic HTML will be fetched (1-2 credits per page).
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
        ) : (
          <div className="space-y-4">
            {/* Summary */}
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
              <Button variant="outline" onClick={() => setResults(null)}>
                Back
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