'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Globe, 
  Link as LinkIcon, 
  Package,
  ArrowRight,
  CheckCircle,
  Loader2
} from "lucide-react"

// Import the existing components
import { ManufacturerSitesContent } from '../manufacturer-sites/manufacturer-sites-content'
import { DiscoveredURLsContent } from '../discovered-urls/discovered-urls-content'
import { DiscoveryClientWrapper } from '../discovery/discovery-client-wrapper'

// Types
interface DiscoveredProduct {
  id: string
  source_url: string
  raw_data: any
  normalized_data: any
  validation_errors: string[]
  validation_warnings: string[]
  status: 'pending' | 'approved' | 'rejected' | 'duplicate' | 'imported'
  machine_type: string | null
  similarity_score: number | null
  created_at: string
  imported_machine_id: string | null
  scan_log: {
    site: {
      name: string
      base_url: string
    }
  }
}

export function UnifiedDiscoveryContent() {
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'sites')
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string | null>(null)
  
  // Update tab when URL changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])
  
  // Track progress through stages
  const [discoveredUrlsCount, setDiscoveredUrlsCount] = useState(0)
  const [scrapedProductsCount, setScrapedProductsCount] = useState(0)
  
  // Product discovery data
  const [discoveredProducts, setDiscoveredProducts] = useState<DiscoveredProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  // Fetch discovered products when products tab is active
  useEffect(() => {
    if (activeTab === 'products') {
      fetchDiscoveredProducts()
    }
  }, [activeTab])

  const fetchDiscoveredProducts = async () => {
    setProductsLoading(true)
    try {
      const response = await fetch('/api/admin/discovered-machines')
      if (response.ok) {
        const data = await response.json()
        setDiscoveredProducts(data.data || [])
        setScrapedProductsCount(data.data?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching discovered products:', error)
    } finally {
      setProductsLoading(false)
    }
  }

  return (
    <div className="space-y-6">


      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value)
        // Update URL to preserve tab state
        const url = new URL(window.location.href)
        url.searchParams.set('tab', value)
        window.history.replaceState({}, '', url.toString())
      }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sites" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Manufacturer Sites
          </TabsTrigger>
          <TabsTrigger value="urls" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Discovered URLs
            {discoveredUrlsCount > 0 && (
              <Badge variant="secondary" className="ml-2">{discoveredUrlsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Review
            {scrapedProductsCount > 0 && (
              <Badge variant="secondary" className="ml-2">{scrapedProductsCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Configure Manufacturer Sites</CardTitle>
              <CardDescription>
                Add manufacturer websites and discover their product URLs with minimal credit usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManufacturerSitesContent 
                onDiscoverUrls={(manufacturerId) => {
                  setSelectedManufacturerId(manufacturerId)
                  // The URL discovery modal will handle the redirect
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urls">
          <div className="space-y-4">
            <DiscoveredURLsContent 
              onUrlsChange={(count) => setDiscoveredUrlsCount(count)}
              onProductsScraped={() => {
                setActiveTab('products')
              }}
              preSelectedManufacturerId={selectedManufacturerId}
            />
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Step 3: Review & Import Products</h2>
              <p className="text-muted-foreground">
                Review extracted product data and import to your catalog
              </p>
            </div>
            {productsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading discovered products...</span>
              </div>
            ) : (
              <DiscoveryClientWrapper data={discoveredProducts} />
            )}
          </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}