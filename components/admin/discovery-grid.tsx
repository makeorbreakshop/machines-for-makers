'use client'

import { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye,
  ExternalLink,
  Copy,
  Calendar,
  Globe
} from "lucide-react"
import { DiscoveredProduct } from "@/app/(admin)/admin/discovery/page"
import { DiscoveryDetailModal } from "./discovery-detail-modal"

interface DiscoveryGridProps {
  data: DiscoveredProduct[]
}

export function DiscoveryGrid({ data }: DiscoveryGridProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<DiscoveredProduct | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

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
    const imageUrl = product.normalized_data?.['Image'] || 
                    product.raw_data?.image || 
                    product.raw_data?.image_url ||
                    product.raw_data?.main_image
    return imageUrl || '/placeholder-machine.jpg'
  }

  const getProductName = (product: DiscoveredProduct) => {
    return product.normalized_data?.['Machine Name'] ||
           product.raw_data?.name ||
           product.raw_data?.title ||
           product.raw_data?.machine_name ||
           'Unnamed Product'
  }

  const getProductPrice = (product: DiscoveredProduct) => {
    const price = product.normalized_data?.['Price ($)'] || product.raw_data?.price
    if (typeof price === 'number') {
      return `$${price.toLocaleString()}`
    }
    if (typeof price === 'string') {
      return price
    }
    return 'Price not available'
  }

  const openDetailModal = (product: DiscoveredProduct) => {
    setSelectedProduct(product)
    setIsDetailModalOpen(true)
  }

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

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={getProductImage(product)}
                  alt={getProductName(product)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-machine.jpg'
                  }}
                />
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={selectedItems.has(product.id)}
                    onCheckedChange={() => toggleSelection(product.id)}
                    className="bg-white/80"
                  />
                </div>
                <div className="absolute top-2 right-2">
                  {getStatusBadge(product.status)}
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                    {getProductName(product)}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{product.scan_log.site.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(product.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="text-sm font-medium">
                    {getProductPrice(product)}
                  </div>
                  
                  {product.machine_type && (
                    <Badge variant="outline" className="text-xs">
                      {product.machine_type}
                    </Badge>
                  )}
                  
                  {/* Validation Indicators */}
                  <div className="flex gap-1">
                    {product.validation_errors.length > 0 && (
                      <Badge variant="destructive" className="text-xs px-1 py-0">
                        {product.validation_errors.length} errors
                      </Badge>
                    )}
                    {product.validation_warnings.length > 0 && (
                      <Badge variant="secondary" className="text-xs px-1 py-0 bg-yellow-100 text-yellow-700">
                        {product.validation_warnings.length} warnings
                      </Badge>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-1 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={() => openDetailModal(product)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="px-2"
                      onClick={() => window.open(product.source_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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