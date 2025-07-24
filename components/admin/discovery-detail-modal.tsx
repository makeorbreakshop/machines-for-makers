'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Edit,
  RefreshCw
} from "lucide-react"
import { DiscoveredProduct } from "@/app/(admin)/admin/discovery/page"

interface DiscoveryDetailModalProps {
  product: DiscoveredProduct | null
  isOpen: boolean
  onClose: () => void
}

export function DiscoveryDetailModal({ 
  product, 
  isOpen, 
  onClose 
}: DiscoveryDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!product) return null

  const getProductName = () => {
    return product.normalized_data?.name ||
           product.raw_data?.name ||
           product.raw_data?.title ||
           'Unnamed Product'
  }

  const getProductImage = () => {
    const imageUrl = product.normalized_data?.images?.[0] || 
                    product.raw_data?.images?.[0] ||
                    product.raw_data?.image || 
                    product.raw_data?.image_url
    return imageUrl || '/placeholder.svg?height=200&width=200'
  }

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: [product.id] 
        })
      })
      
      if (response.ok) {
        // Refresh page or update state
        window.location.reload()
      } else {
        const error = await response.json()
        console.error('Failed to approve product:', error)
      }
    } catch (error) {
      console.error('Error approving product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/discovery/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: [product.id],
          reason: 'Rejected via review modal'
        })
      })
      
      if (response.ok) {
        // Refresh page or update state
        window.location.reload()
      } else {
        const error = await response.json()
        console.error('Failed to reject product:', error)
      }
    } catch (error) {
      console.error('Error rejecting product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReExtract = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement re-extraction endpoint
      console.log('Re-extracting product:', product.id)
      alert('Re-extraction feature coming soon!')
      onClose()
    } catch (error) {
      console.error('Error re-extracting product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderDataTable = (data: any, title: string) => {
    if (!data || typeof data !== 'object') return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                <div className="font-medium text-muted-foreground truncate">
                  {key}:
                </div>
                <div className="col-span-2 break-words">
                  {typeof value === 'object' ? 
                    JSON.stringify(value, null, 2) : 
                    String(value || 'N/A')
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{getProductName()}</span>
            <Badge variant={product.status === 'pending' ? 'secondary' : 'outline'}>
              {product.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Left Column - Image and Actions */}
          <div className="col-span-4 space-y-4">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={getProductImage()}
                alt={getProductName()}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg?height=200&width=200'
                }}
              />
            </div>

            {/* Product Info */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Source:</span>
                  <span className="text-muted-foreground truncate">
                    {product.scan_log.site.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {product.machine_type || 'Unknown'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Discovered:</span>
                  <span className="text-muted-foreground">
                    {new Date(product.created_at).toLocaleDateString()}
                  </span>
                </div>

                {product.similarity_score && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Similarity:</span>
                    <Badge variant="secondary">
                      {Math.round(product.similarity_score * 100)}%
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validation Status */}
            {(product.validation_errors.length > 0 || product.validation_warnings.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Validation Issues
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {product.validation_errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700">{error}</span>
                    </div>
                  ))}
                  {product.validation_warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-yellow-700">{warning}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button 
                onClick={handleApprove} 
                disabled={isLoading || product.status === 'approved'}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {product.status === 'approved' ? 'Already Approved' : 'Approve & Import'}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={isLoading || product.status === 'rejected'}
                className="w-full"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {product.status === 'rejected' ? 'Already Rejected' : 'Reject'}
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" disabled={isLoading}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReExtract}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Re-extract
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.open(product.source_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original Page
              </Button>
            </div>
          </div>

          {/* Right Column - Data Tabs */}
          <div className="col-span-8">
            <Tabs defaultValue="normalized" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="normalized">Normalized Data</TabsTrigger>
                <TabsTrigger value="raw">Raw Data</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0">
                <TabsContent value="normalized" className="h-full">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4">
                      {renderDataTable(product.normalized_data, "Normalized Product Data")}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="raw" className="h-full">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4">
                      {renderDataTable(product.raw_data, "Raw Extracted Data")}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="comparison" className="h-full">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Potential Duplicates</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {product.similarity_score ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Copy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Potential duplicate detected with {Math.round(product.similarity_score * 100)}% similarity</p>
                              <p className="text-sm mt-2">Manual review recommended</p>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No duplicates detected</p>
                              <p className="text-sm mt-2">This appears to be a unique product</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}