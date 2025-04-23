"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { toast } from "sonner"
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Edit, 
  AlertTriangle,
  ExternalLink,
  Filter,
  ChevronDown,
  Download,
  MoreVertical,
  Clock,
  ArrowUp,
  ArrowDown
} from "lucide-react"

export default function PriceReviewPage() {
  // State for review items
  const [reviewItems, setReviewItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  
  // Filter states
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  
  // Filter checkboxes
  const [showSuccessful, setShowSuccessful] = useState(false)
  const [showFailed, setShowFailed] = useState(false)
  const [showUnchanged, setShowUnchanged] = useState(false)
  const [showUpdated, setShowUpdated] = useState(false)
  const [showNeedsReview, setShowNeedsReview] = useState(true)
  
  // UI states
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false)
  const [newPriceOverride, setNewPriceOverride] = useState<string>("")
  
  // API URL - use same API as batch results
  const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
  
  // Fetch items flagged for review from all batches
  const fetchReviewItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch from the regular reviews endpoint that exists
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch review items: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch review items')
      }
      
      // Enrich the data to include the proper price information
      // This ensures we have both old_price and new_price like in batch results
      const formattedItems = data.items.map((item: any) => {
        // Make sure old_price and new_price are properly set
        // The backend sends us correct values but we need to make sure they're properly used
        const oldPrice = item.old_price !== null && item.old_price !== undefined ? item.old_price : null;
        const newPrice = item.new_price !== null && item.new_price !== undefined ? item.new_price : null;
        
        // Calculate extracted price display
        if (item.extracted_price === undefined && item.new_price && item.extracted_confidence) {
          item.extracted_price = item.new_price;
        }
        
        return {
          ...item,
          old_price: oldPrice,
          new_price: newPrice,
          status: item.review_reason ? 'review' : (item.status || 'review'),
          variant_attribute: item.variant || 'Default',
          url: item.url || item.product_url || item.scraped_from_url,
          extraction: item.extraction_method || item.tier,
        };
      });
      
      setReviewItems(formattedItems)
    } catch (err: any) {
      setError(err.message || 'Error fetching review items')
      console.error('Error fetching review items:', err)
      toast.error("Failed to load review items")
    } finally {
      setLoading(false)
    }
  }
  
  // Initial fetch
  useEffect(() => {
    fetchReviewItems()
  }, [])
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchReviewItems()
    toast.info("Refreshing review items...")
  }
  
  // Handle item selection
  const handleSelectItem = (item: any) => {
    setSelectedItem(item)
  }
  
  // Handle approve action
  const handleApprove = async (item: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews/${item.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to approve price: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to approve price')
      }
      
      toast.success(`Approved price update for ${item.machine_name}`)
      
      // Refresh the list
      fetchReviewItems()
      
      // Clear selection if it was the selected item
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(null)
      }
    } catch (err: any) {
      console.error('Error approving price:', err)
      toast.error(err.message || "Error approving price")
    }
  }
  
  // Handle reject action
  const handleReject = async (item: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews/${item.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to reject price: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reject price')
      }
      
      toast.success(`Rejected price update for ${item.machine_name}`)
      
      // Refresh the list
      fetchReviewItems()
      
      // Clear selection if it was the selected item
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(null)
      }
    } catch (err: any) {
      console.error('Error rejecting price:', err)
      toast.error(err.message || "Error rejecting price")
    }
  }
  
  // Handle price override
  const handleOverride = async () => {
    if (!selectedItem) return
    
    try {
      const price = parseFloat(newPriceOverride)
      
      if (isNaN(price) || price <= 0) {
        toast.error("Please enter a valid price")
        return
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews/${selectedItem.id}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to override price: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to override price')
      }
      
      toast.success(`Overrode price for ${selectedItem.machine_name} to ${formatPrice(price)}`)
      
      // Close dialog
      setIsOverrideDialogOpen(false)
      setNewPriceOverride("")
      
      // Refresh the list
      fetchReviewItems()
      
      // Clear selection
      setSelectedItem(null)
    } catch (err: any) {
      console.error('Error overriding price:', err)
      toast.error(err.message || "Error overriding price")
    }
  }
  
  // Format price
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a')
    } catch (e) {
      return dateString
    }
  }
  
  // Format duration
  const formatDuration = (durationMs: number) => {
    if (!durationMs) return '-'
    
    let durationText = ""
    if (durationMs < 1000) {
      durationText = `${durationMs}ms`
    } else if (durationMs < 60000) {
      durationText = `${Math.round(durationMs / 1000)}s`
    } else {
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      durationText = `${minutes}m ${seconds}s`
    }
    
    return (
      <div className="flex items-center justify-center text-sm">
        <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
        <span>{durationText}</span>
      </div>
    )
  }
  
  // Get confidence percentage
  const getConfidencePercentage = (confidence: number) => {
    if (confidence === undefined || confidence === null) return 0
    return Math.round(confidence * 100)
  }
  
  // Get status display
  const getStatusDisplay = (item: any) => {
    if (item.status === 'review') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Review</Badge>
    }
    if (item.status === 'success') {
      return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Success</Badge>
    }
    if (item.status === 'failed') {
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Failed</Badge>
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">{item.status || 'Unknown'}</Badge>
  }
  
  // Get confidence bar
  const getConfidenceBar = (confidence: number) => {
    if (confidence === undefined || confidence === null) return null
    
    const percent = getConfidencePercentage(confidence)
    let colorClass = "bg-red-500"
    
    if (percent >= 90) {
      colorClass = "bg-green-500"
    } else if (percent >= 70) {
      colorClass = "bg-yellow-500"
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
              </div>
              <span className="text-xs">{percent}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Confidence: {percent}%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  // Get price change display
  const getPriceChangeDisplay = (oldPrice: number, newPrice: number) => {
    if (!oldPrice || !newPrice) return '-'
    
    const diff = newPrice - oldPrice
    const changePercent = (diff / oldPrice) * 100
    
    const colorClass = diff > 0 ? "text-red-600" : (diff < 0 ? "text-green-600" : "text-gray-600")
    
    const formattedDiff = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(diff))
    
    const percentFormatted = new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(Math.abs(changePercent) / 100)
    
    const Icon = diff > 0 ? ArrowUp : ArrowDown
    
    return (
      <div className={`flex justify-end items-center space-x-1 ${colorClass}`}>
        {diff !== 0 && <Icon className="h-4 w-4" />}
        <span>{formattedDiff}</span>
        <span className="text-xs opacity-70">({percentFormatted})</span>
      </div>
    )
  }
  
  // Get filtered items
  const getFilteredItems = () => {
    return reviewItems.filter(item => {
      // Apply search filter
      if (searchTerm && !item.machine_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by status
      if (showNeedsReview && !showSuccessful && !showFailed && !showUnchanged && !showUpdated) {
        return item.status === 'review';
      }
      
      if (showSuccessful && item.status === 'success') return true;
      if (showFailed && item.status === 'failed') return true;
      if (showUnchanged && item.status === 'unchanged') return true;
      if (showUpdated && item.status === 'updated') return true;
      if (showNeedsReview && item.status === 'review') return true;
      
      return !showSuccessful && !showFailed && !showUnchanged && !showUpdated && !showNeedsReview;
    });
  }
  
  const filteredItems = getFilteredItems();
  const totalItems = reviewItems.length;
  const needsReviewCount = reviewItems.filter(item => item.status === 'review').length;
  
  return (
    <div className="w-full px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-4">
        <h1 className="text-2xl font-bold">Price Review Queue</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setFiltersVisible(!filtersVisible)}
            className="h-9 px-3"
          >
            <Filter className="h-4 w-4 mr-2" /> 
            Filters
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 px-3"
            asChild
          >
            <Link href="/admin/tools/price-tracker/batch-results">
              <Clock className="h-4 w-4 mr-2" /> Batch Results
            </Link>
          </Button>
          <Button 
            onClick={handleRefresh} 
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>
      
      {/* Filter section - collapsible */}
      {filtersVisible && (
        <Card className="mb-4">
          <CardContent className="pt-6 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search" className="text-xs">Search</Label>
                <div className="flex space-x-2">
                  <Input
                    id="search"
                    placeholder="Machine name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-needs-review" 
                  checked={showNeedsReview} 
                  onCheckedChange={(checked) => setShowNeedsReview(checked === true)}
                />
                <Label htmlFor="show-needs-review" className="text-sm">Show needs review</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-successful" 
                  checked={showSuccessful} 
                  onCheckedChange={(checked) => setShowSuccessful(checked === true)}
                />
                <Label htmlFor="show-successful" className="text-sm">Show successful</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-failed" 
                  checked={showFailed} 
                  onCheckedChange={(checked) => setShowFailed(checked === true)}
                />
                <Label htmlFor="show-failed" className="text-sm">Show failed</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-unchanged" 
                  checked={showUnchanged} 
                  onCheckedChange={(checked) => setShowUnchanged(checked === true)}
                />
                <Label htmlFor="show-unchanged" className="text-sm">Show unchanged</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-updated" 
                  checked={showUpdated} 
                  onCheckedChange={(checked) => setShowUpdated(checked === true)}
                />
                <Label htmlFor="show-updated" className="text-sm">Show updated</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Status summary */}
      <Card className="mb-4">
        <CardContent className="pt-6 grid grid-cols-5 gap-4">
          <div>
            <h3 className="text-xs text-muted-foreground mb-1">Items Flagged for Review</h3>
            <p className="text-2xl font-bold">{needsReviewCount}</p>
          </div>
          <div>
            <h3 className="text-xs text-muted-foreground mb-1">Total Items</h3>
            <p className="text-2xl font-bold">{totalItems}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Items Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="py-3 px-6 bg-gray-50 rounded-t-md">
          <CardTitle className="text-sm font-medium">Items Flagged for Review ({filteredItems.length})</CardTitle>
        </CardHeader>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-8 text-red-500">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex justify-center items-center py-8 text-muted-foreground">
              No items requiring review
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                  <TableHead className="py-2 font-medium">Status</TableHead>
                  <TableHead className="py-2 font-medium">Machine</TableHead>
                  <TableHead className="py-2 font-medium">Variant</TableHead>
                  <TableHead className="py-2 font-medium text-right">Old Price</TableHead>
                  <TableHead className="py-2 font-medium text-right">New Price</TableHead>
                  <TableHead className="py-2 font-medium text-right">Extracted Price</TableHead>
                  <TableHead className="py-2 font-medium text-right">Change</TableHead>
                  <TableHead className="py-2 font-medium text-center">Extraction</TableHead>
                  <TableHead className="py-2 font-medium text-center">Confidence</TableHead>
                  <TableHead className="py-2 font-medium text-center">Duration</TableHead>
                  <TableHead className="py-2 font-medium text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <TableCell className="py-3">{getStatusDisplay(item)}</TableCell>
                    <TableCell className="py-3 font-medium max-w-[180px] truncate">
                      {item.machine_name}
                    </TableCell>
                    <TableCell className="py-3">{item.variant_attribute}</TableCell>
                    <TableCell className="py-3 text-right font-mono">
                      {formatPrice(item.old_price)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono">
                      {formatPrice(item.new_price)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono">
                      {item.extracted_price ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="font-medium text-amber-600 text-right">
                                {formatPrice(item.extracted_price)}
                                {item.extracted_confidence && (
                                  <span className="text-xs ml-1">
                                    ({getConfidencePercentage(item.extracted_confidence)}%)
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Price extracted with {getConfidencePercentage(item.extracted_confidence || 0)}% confidence</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : item.new_price && item.confidence ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="font-medium text-amber-600 text-right">
                                {formatPrice(item.new_price)}
                                <span className="text-xs ml-1">
                                  ({getConfidencePercentage(item.confidence)}%)
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Price extracted with {getConfidencePercentage(item.confidence)}% confidence</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {item.price_change !== null && item.price_change !== undefined ? (
                        getPriceChangeDisplay(item.old_price, item.new_price)
                      ) : item.old_price && item.new_price ? (
                        getPriceChangeDisplay(item.old_price, item.new_price)
                      ) : "-"}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <span className="text-xs text-gray-600">{item.extraction || item.tier || '-'}</span>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {item.confidence !== undefined ? getConfidenceBar(item.confidence) : '-'}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {item.duration ? formatDuration(item.duration) : '-'}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="flex justify-center space-x-1">
                        {item.status === 'review' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                              onClick={() => handleApprove(item)}
                              title="Approve price change"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                              onClick={() => handleReject(item)}
                              title="Reject price change"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedItem(item);
                                setNewPriceOverride(item.new_price ? item.new_price.toString() : "");
                                setIsOverrideDialogOpen(true);
                              }}
                              title="Override with manual price"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {item.url && (
                              <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Source
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => window.open(`/admin/machines/${item.machine_id}`, '_blank')}>
                              Edit Machine
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSelectItem(item)}>
                              View Details
                            </DropdownMenuItem>
                            {/* Only show batch link if we have a batch_id */}
                            {item.batch_id && (
                              <DropdownMenuItem onClick={() => window.open(`/admin/tools/price-tracker/batch-results/${item.batch_id}`, '_blank')}>
                                View Batch
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
      
      {/* Price Override Dialog */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Override Price</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {selectedItem && (
              <div className="mb-4 text-sm">
                <div className="font-medium">{selectedItem.machine_name}</div>
                <div className="text-muted-foreground">{selectedItem.variant_attribute || 'Default'}</div>
                <div className="mt-2 flex space-x-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Current</div>
                    <div>{formatPrice(selectedItem.old_price)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Detected</div>
                    <div>{formatPrice(selectedItem.new_price)}</div>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="priceOverride">New Price ($)</Label>
              <Input
                id="priceOverride"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newPriceOverride}
                onChange={(e) => setNewPriceOverride(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsOverrideDialogOpen(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button onClick={handleOverride} size="sm">
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 