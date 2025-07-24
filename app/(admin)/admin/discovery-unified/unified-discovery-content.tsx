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
  CheckCircle
} from "lucide-react"

// Import the existing components
import { ManufacturerSitesContent } from '../manufacturer-sites/manufacturer-sites-content'
import { DiscoveredURLsContent } from '../discovered-urls/discovered-urls-content'

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Product Discovery Pipeline</h1>
        <p className="text-muted-foreground">
          Complete workflow from manufacturer sites to product import
        </p>
      </div>


      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Review & Select URLs</CardTitle>
              <CardDescription>
                Choose which discovered URLs to scrape for full product data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiscoveredURLsContent 
                onUrlsChange={(count) => setDiscoveredUrlsCount(count)}
                onProductsScraped={() => {
                  setActiveTab('products')
                }}
                preSelectedManufacturerId={selectedManufacturerId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Review & Import Products</CardTitle>
              <CardDescription>
                Review extracted product data and import to your catalog
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Click below to open the Product Discovery page
                </p>
                <a 
                  href="/admin/discovery" 
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Open Product Discovery
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How the Discovery Pipeline Works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Configure Sites:</strong> Add manufacturer websites with their product listing URLs
            </li>
            <li>
              <strong>Discover URLs:</strong> Crawl sites to find product pages (uses only 1-2 credits per page)
            </li>
            <li>
              <strong>Select & Scrape:</strong> Choose which products to extract (uses ~20 credits per product)
            </li>
            <li>
              <strong>Review & Import:</strong> Validate extracted data and add products to your catalog
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}