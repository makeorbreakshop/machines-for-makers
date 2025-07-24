'use client'

import { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye,
  ExternalLink,
  Copy,
  Calendar,
  Globe,
  DollarSign,
  Package,
  Image,
  FileText,
  Coins,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { DiscoveredProduct } from "@/app/(admin)/admin/discovery/page"
import { DiscoveryDetailModal } from "./discovery-detail-modal"

interface DiscoveryGridProps {
  data: DiscoveredProduct[]
  defaultSiteFilter?: string
}

export function DiscoveryGrid({ data, defaultSiteFilter }: DiscoveryGridProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<DiscoveredProduct | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedItems(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === data.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(data.map(item => item.id)))
    }
  }

  const handleBulkApprove = async () => {
    try {
      const response = await fetch('/api/admin/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: Array.from(selectedItems) 
        })
      })
      
      if (response.ok) {
        // Refresh page or update state
        window.location.reload()
      } else {
        console.error('Failed to approve products')
      }
    } catch (error) {
      console.error('Error approving products:', error)
    }
  }

  const handleBulkReject = async () => {
    try {
      const response = await fetch('/api/admin/discovery/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: Array.from(selectedItems),
          reason: 'Bulk rejected'
        })
      })
      
      if (response.ok) {
        // Refresh page or update state
        window.location.reload()
      } else {
        console.error('Failed to reject products')
      }
    } catch (error) {
      console.error('Error rejecting products:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      case 'duplicate':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><Copy className="h-3 w-3 mr-1" />Duplicate</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getProductImage = (product: DiscoveredProduct) => {
    const imageUrl = product.normalized_data?.images?.[0] || 
                    product.raw_data?.images?.[0] ||
                    product.raw_data?.image || 
                    product.raw_data?.image_url ||
                    product.raw_data?.main_image
    return imageUrl || '/placeholder.svg?height=200&width=200'
  }

  const getProductName = (product: DiscoveredProduct) => {
    return product.normalized_data?.name ||
           product.raw_data?.name ||
           product.raw_data?.title ||
           product.raw_data?.machine_name ||
           'Unnamed Product'
  }

  const getProductPrice = (product: DiscoveredProduct) => {
    const price = product.normalized_data?.price || product.raw_data?.price
    if (typeof price === 'number') {
      return `$${price.toLocaleString()}`
    }
    if (typeof price === 'string') {
      return price
    }
    return 'Price not available'
  }

  const toggleCardExpansion = (id: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCards(newExpanded)
  }

  const handleUpdateStatus = async (machineId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/admin/discovered-machines/${machineId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Refresh the page
      window.location.reload()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const openDetailModal = (product: DiscoveredProduct) => {
    setSelectedProduct(product)
    setIsDetailModalOpen(true)
  }

  // Helper function to format specifications with database mapping
  const formatSpecificationMapping = (product: DiscoveredProduct) => {
    const mappings = [
      {
        dbField: 'Machine Name',
        rawValue: product.raw_data?.name || product.raw_data?.title || 'N/A',
        formattedValue: product.normalized_data?.name || 'Not mapped',
        description: 'Product display name'
      },
      {
        dbField: 'Company',
        rawValue: product.raw_data?.brand || product.raw_data?.manufacturer || 'N/A',
        formattedValue: product.normalized_data?.brand || 'Not mapped',
        description: 'Brand name from brands table'
      },
      {
        dbField: 'Price',
        rawValue: product.raw_data?.price || product.raw_data?.offers?.[0]?.price || 'N/A',
        formattedValue: product.normalized_data?.price ? `$${product.normalized_data.price}` : 'Not mapped',
        description: 'Numeric price in USD'
      },
      {
        dbField: 'Laser Type A',
        rawValue: product.raw_data?.specifications?.laser_type || product.raw_data?.laser_type || 'N/A',
        formattedValue: product.normalized_data?.laser_type_a || 'Not mapped',
        description: 'Must be: Diode, CO2, Fiber, Galvo, UV, or Other'
      },
      {
        dbField: 'Laser Power A',
        rawValue: product.raw_data?.specifications?.power || product.raw_data?.power || 'N/A',
        formattedValue: product.normalized_data?.laser_power_a || 'Not mapped',
        description: 'Format: "40W" or "5.5W"'
      },
      {
        dbField: 'Work Area',
        rawValue: product.raw_data?.specifications?.work_area || product.raw_data?.work_area || 'N/A',
        formattedValue: product.normalized_data?.work_area || 'Not mapped',
        description: 'Format: "400 x 400 mm"'
      },
      {
        dbField: 'Speed',
        rawValue: product.raw_data?.specifications?.speed || product.raw_data?.speed || 'N/A',
        formattedValue: product.normalized_data?.speed || 'Not mapped',
        description: 'Format: "12000 mm/min"'
      },
      {
        dbField: 'Machine Category',
        rawValue: product.raw_data?.category || product.machine_type || 'N/A',
        formattedValue: product.normalized_data?.machine_category || 'Not mapped',
        description: 'Must be: laser, 3d-printer, or cnc'
      },
      {
        dbField: 'Laser Category',
        rawValue: product.raw_data?.subcategory || 'N/A',
        formattedValue: product.normalized_data?.laser_category || 'Not mapped',
        description: 'desktop-diode-laser, desktop-co2-laser, etc.'
      }
    ];
    
    return mappings;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium">
              {selectedItems.size} items selected
            </span>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={handleBulkApprove}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Bulk Approve
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkReject}>
                <XCircle className="h-4 w-4 mr-1" />
                Bulk Reject
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedItems(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Header with select all */}
        <div className="flex items-center gap-3 px-1">
          <Checkbox
            checked={selectedItems.size === data.length && data.length > 0}
            onCheckedChange={toggleSelectAll}
            disabled={data.length === 0}
          />
          <span className="text-sm text-muted-foreground">
            Select all ({data.length} products)
          </span>
        </div>

        {/* Compact Product List */}
        <div className="space-y-3">
          {data.map((product) => {
            const productImage = product.normalized_data?.images?.[0] || 
                                product.raw_data?.images?.[0] || 
                                product.raw_data?.image || 
                                product.raw_data?.image_url;
            const isExpanded = expandedCards.has(product.id);
            const price = product.normalized_data?.price ? `$${product.normalized_data.price.toLocaleString()}` : getProductPrice(product);
            
            return (
              <Card key={product.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  {/* Compact Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={selectedItems.has(product.id)}
                        onCheckedChange={() => toggleSelection(product.id)}
                        disabled={product.status === 'imported'}
                        className="flex-shrink-0"
                      />
                      {productImage && (
                        <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={productImage}
                            alt={getProductName(product)}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">
                            {getProductName(product)}
                          </h3>
                          {getStatusBadge(product.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="font-medium">{price}</span>
                          <span>{product.normalized_data?.brand || product.raw_data?.brand || 'Unknown Brand'}</span>
                          <span>{product.scan_log.site.name}</span>
                          {product.raw_data?._credits_used && (
                            <span className="text-blue-600">{product.raw_data._credits_used} credits</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {product.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(product.id, 'approved')}
                            className="text-green-600 h-8 px-3"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(product.id, 'rejected')}
                            className="text-red-600 h-8 px-3"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCardExpansion(product.id)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <Tabs defaultValue="mapping" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
                        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                        <TabsTrigger value="validation">Validation</TabsTrigger>
                        <TabsTrigger value="images">Images</TabsTrigger>
                      </TabsList>

                      <TabsContent value="mapping" className="mt-4">
                        <ScrollArea className="h-[400px] w-full">
                          <div className="space-y-4">
                            <div className="text-xs text-muted-foreground mb-2">
                              Shows how raw scraped data maps to database fields
                            </div>
                            {formatSpecificationMapping(product).map((mapping, idx) => (
                              <div key={idx} className="border rounded-md p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {mapping.dbField}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {mapping.description}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <div className="font-medium text-gray-600 mb-1">Raw Value:</div>
                                    <div className="bg-gray-50 p-2 rounded text-gray-800 font-mono break-all">
                                      {String(mapping.rawValue)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-600 mb-1">Formatted:</div>
                                    <div className={`p-2 rounded font-mono break-all ${
                                      mapping.formattedValue === 'Not mapped' 
                                        ? 'bg-red-50 text-red-700' 
                                        : 'bg-green-50 text-green-700'
                                    }`}>
                                      {mapping.formattedValue}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="raw" className="mt-4">
                        <ScrollArea className="h-[400px] w-full">
                          <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                            {JSON.stringify(product.raw_data, null, 2)}
                          </pre>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="validation" className="mt-4">
                        <ScrollArea className="h-[400px] w-full">
                          <div className="space-y-4">
                            {product.validation_errors.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2 text-red-600 flex items-center gap-1">
                                  <XCircle className="h-4 w-4" />
                                  Errors ({product.validation_errors.length})
                                </h4>
                                <div className="space-y-2">
                                  {product.validation_errors.map((error, idx) => (
                                    <div key={idx} className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                                      {error}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {product.validation_warnings && product.validation_warnings.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2 text-yellow-600 flex items-center gap-1">
                                  <AlertTriangle className="h-4 w-4" />
                                  Warnings ({product.validation_warnings.length})
                                </h4>
                                <div className="space-y-2">
                                  {product.validation_warnings.map((warning, idx) => (
                                    <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-700">
                                      {warning}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {product.validation_errors.length === 0 && (!product.validation_warnings || product.validation_warnings.length === 0) && (
                              <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p className="text-sm text-green-700 font-medium">No validation issues</p>
                                <p className="text-xs text-green-600 mt-1">Ready for import</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="images" className="mt-4">
                        <ScrollArea className="h-[400px] w-full">
                          <div className="space-y-4">
                            {((product.normalized_data?.images && product.normalized_data.images.length > 0) || 
                              (product.raw_data?.images && product.raw_data.images.length > 0)) ? (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(product.normalized_data?.images || product.raw_data?.images || []).map((img, idx) => (
                                  <div key={idx} className="space-y-2">
                                    <img
                                      src={img}
                                      alt={`${getProductName(product)} ${idx + 1}`}
                                      className="w-full h-32 object-cover rounded border"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="text-xs text-muted-foreground truncate">
                                      Image {idx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No images found</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {data.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p>No discovered products to review at this time.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <DiscoveryDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedProduct(null)
        }}
      />
    </>
  )
}