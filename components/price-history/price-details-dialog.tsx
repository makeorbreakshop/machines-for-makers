"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ExternalLink, CheckCircle, XCircle, Edit } from "lucide-react"
import { toast } from "sonner"
import { PriceHistoryItem } from "./price-history-table"

interface PriceDetailsDialogProps {
  item: PriceHistoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'history' | 'review' | 'batch'
  onRefresh: () => void
}

export function PriceDetailsDialog({
  item,
  open,
  onOpenChange,
  mode,
  onRefresh
}: PriceDetailsDialogProps) {
  const [reviewNotes, setReviewNotes] = useState("")
  const [overridePrice, setOverridePrice] = useState("")
  const [isOverrideMode, setIsOverrideMode] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // API URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
  
  // Format price as currency
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  }
  
  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  }
  
  // Calculate price change percentage
  const calculatePriceChangePercentage = (
    newPrice: number | null | undefined, 
    oldPrice: number | null | undefined
  ): string => {
    if (!newPrice || !oldPrice || oldPrice === 0) return "-";
    const change = ((newPrice - oldPrice) / oldPrice) * 100;
    return change.toFixed(2) + "%";
  }
  
  // Reset form state when dialog opens/closes or item changes
  const resetForm = () => {
    setReviewNotes("")
    setOverridePrice("")
    setIsOverrideMode(false)
    setLoading(false)
  }
  
  // Handle close
  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }
  
  // Handle approve action
  const handleApprove = async () => {
    if (!item) return;
    
    try {
      setLoading(true)
      
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews/${item.machine_id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: reviewNotes,
          variant_attribute: item.variant_attribute
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to approve price: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to approve price')
      }
      
      toast.success(`Approved price for ${item.machine_name}`)
      handleClose()
      onRefresh()
    } catch (err: any) {
      console.error('Error approving price:', err)
      toast.error(err.message || "Error approving price")
    } finally {
      setLoading(false)
    }
  }
  
  // Handle reject action
  const handleReject = async () => {
    if (!item) return;
    
    try {
      setLoading(true)
      
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews/${item.machine_id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: reviewNotes,
          variant_attribute: item.variant_attribute
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to reject price: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reject price')
      }
      
      toast.success(`Rejected price for ${item.machine_name}`)
      handleClose()
      onRefresh()
    } catch (err: any) {
      console.error('Error rejecting price:', err)
      toast.error(err.message || "Error rejecting price")
    } finally {
      setLoading(false)
    }
  }
  
  // Handle override action
  const handleOverride = async () => {
    if (!item) return;
    
    try {
      setLoading(true)
      
      // Validate override price
      const price = parseFloat(overridePrice);
      if (isNaN(price) || price <= 0) {
        toast.error("Please enter a valid price")
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews/${item.machine_id}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price,
          notes: reviewNotes,
          variant_attribute: item.variant_attribute
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to override price: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to override price')
      }
      
      toast.success(`Overrode price for ${item.machine_name} to ${formatPrice(price)}`)
      handleClose()
      onRefresh()
    } catch (err: any) {
      console.error('Error overriding price:', err)
      toast.error(err.message || "Error overriding price")
    } finally {
      setLoading(false)
    }
  }
  
  // Toggle override mode
  const toggleOverrideMode = () => {
    setIsOverrideMode(!isOverrideMode)
    if (!isOverrideMode && item?.price) {
      setOverridePrice(item.price.toString())
    }
  }
  
  // Determine if review actions should be available
  const showReviewActions = mode === 'review' && item?.status === 'NEEDS_REVIEW';
  
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Price Extraction Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm">Machine</h3>
              <p>{item.machine_name}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Brand</h3>
              <p>{item.brand}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Variant</h3>
              <p>{item.variant_attribute || "Default"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Date</h3>
              <p>{formatDate(item.date)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Status</h3>
              <div className="mt-1">
                {item.status === 'SUCCESS' && (
                  <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>
                )}
                {item.status === 'FAILED' && (
                  <Badge variant="destructive">Failed</Badge>
                )}
                {item.status === 'NEEDS_REVIEW' && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Needs Review</Badge>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Batch ID</h3>
              <p className="truncate">{item.batch_id || "-"}</p>
            </div>
          </div>
          
          <Separator />
          
          {/* Price Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm">Previous Price</h3>
              <p className="text-lg">{formatPrice(item.validation_basis_price || item.old_price)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Current Price</h3>
              <p className="text-lg">{formatPrice(item.price || item.new_price)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Price Change</h3>
              <p>{formatPrice(item.price_change)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Percentage Change</h3>
              <p>
                {item.percentage_change 
                  ? `${item.percentage_change.toFixed(2)}%` 
                  : calculatePriceChangePercentage(item.price, item.validation_basis_price)}
              </p>
            </div>
          </div>
          
          <Separator />
          
          {/* Extraction Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm">Extraction Method</h3>
              <p>{item.extraction_method || item.tier || "Unknown"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Raw Extracted Text</h3>
              <p className="text-sm text-muted-foreground">{item.raw_price_text || "N/A"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Extraction Confidence</h3>
              <p>{item.extracted_confidence ? `${Math.round(item.extracted_confidence * 100)}%` : "N/A"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Validation Confidence</h3>
              <p>{item.validation_confidence ? `${Math.round(item.validation_confidence * 100)}%` : "N/A"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">HTTP Status</h3>
              <p>{item.http_status || "N/A"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Duration</h3>
              <p>{item.extraction_duration_seconds ? `${item.extraction_duration_seconds.toFixed(2)}s` : "N/A"}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm">Product URL</h3>
            {(item.url || item.product_link) ? (
              <a 
                href={item.url || item.product_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span className="truncate">{item.url || item.product_link}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            ) : (
              <p className="text-muted-foreground">No URL available</p>
            )}
          </div>
          
          {/* Error or Review Info */}
          {item.status === 'FAILED' && (item.failure_reason || item.error) && (
            <div>
              <h3 className="font-semibold text-sm text-red-600">Failure Reason</h3>
              <p className="text-red-600">{item.failure_reason || item.error}</p>
            </div>
          )}
          
          {item.status === 'NEEDS_REVIEW' && item.review_reason && (
            <div>
              <h3 className="font-semibold text-sm text-amber-600">Review Reason</h3>
              <p className="text-amber-600">{item.review_reason}</p>
            </div>
          )}
          
          {/* Review Actions - Only show if in review mode and status is NEEDS_REVIEW */}
          {showReviewActions && (
            <>
              <Separator />
              
              {isOverrideMode ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="overridePrice">Override Price (USD)</Label>
                    <Input 
                      id="overridePrice"
                      value={overridePrice}
                      onChange={(e) => setOverridePrice(e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter new price"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reviewNotes">Notes</Label>
                    <Textarea 
                      id="reviewNotes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Reason for manual override (optional)"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsOverrideMode(false)}
                    >
                      Cancel Override
                    </Button>
                    <Button 
                      onClick={handleOverride}
                      disabled={loading}
                    >
                      Save Override
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reviewNotes">Review Notes</Label>
                    <Textarea 
                      id="reviewNotes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Optional notes about this review decision"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleReject}
                      disabled={loading}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={toggleOverrideMode}
                      disabled={loading}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Override
                    </Button>
                    <Button 
                      onClick={handleApprove}
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 