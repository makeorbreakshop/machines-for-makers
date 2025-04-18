"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Clock,
  ArrowUpDown,
  BarChart
} from "lucide-react"

export default function PriceReviewPage() {
  // State for review items
  const [reviewItems, setReviewItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  
  // Filter states
  const [reviewReason, setReviewReason] = useState<string>("all")
  const [confidenceLevel, setConfidenceLevel] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")
  const [searchTerm, setSearchTerm] = useState<string>("")
  
  // UI states
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false)
  const [newPriceOverride, setNewPriceOverride] = useState<string>("")
  
  // API URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
  
  // Fetch items flagged for review
  const fetchReviewItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (reviewReason !== "all") params.append("reason", reviewReason)
      if (confidenceLevel !== "all") params.append("confidence", confidenceLevel)
      if (sortBy) {
        const [field, order] = sortBy.split("-")
        params.append("sort_by", field)
        params.append("sort_order", order)
      }
      if (searchTerm) params.append("search", searchTerm)
      
      const response = await fetch(`${API_BASE_URL}/api/v1/reviews?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch review items: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch review items')
      }
      
      setReviewItems(data.items || [])
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
  }, [reviewReason, confidenceLevel, sortBy])
  
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
    if (price === null || price === undefined) return 'N/A'
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
  
  // Get confidence badge
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          High ({Math.round(confidence * 100)}%)
        </Badge>
      )
    } else if (confidence >= 0.7) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Medium ({Math.round(confidence * 100)}%)
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Low ({Math.round(confidence * 100)}%)
        </Badge>
      )
    }
  }
  
  // Get tier badge
  const getTierBadge = (tier: string) => {
    const tierMap: Record<string, { color: string, label: string }> = {
      "STATIC": { color: "green", label: "Static" },
      "SLICE_FAST": { color: "blue", label: "Slice Fast" },
      "SLICE_BALANCED": { color: "purple", label: "Slice Balanced" },
      "JS_INTERACTION": { color: "orange", label: "JS Interaction" },
      "FULL_HTML": { color: "red", label: "Full HTML" }
    }
    
    const tierInfo = tierMap[tier] || { color: "gray", label: tier || "Unknown" }
    
    return (
      <Badge variant="outline" className={`bg-${tierInfo.color}-50 text-${tierInfo.color}-700 border-${tierInfo.color}-200`}>
        {tierInfo.label}
      </Badge>
    )
  }
  
  // Get review reason badge
  const getReasonBadge = (item: any) => {
    if (item.review_reason === "PRICE_CHANGE") {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          Large Price Change
        </Badge>
      )
    } else if (item.review_reason === "LOW_CONFIDENCE") {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Low Confidence
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          {item.review_reason || "Unknown"}
        </Badge>
      )
    }
  }
  
  // Calculate price change percentage
  const getPriceChangePercent = (oldPrice: number, newPrice: number) => {
    if (!oldPrice || !newPrice) return 0
    return ((newPrice - oldPrice) / oldPrice) * 100
  }
  
  // Get price change display with color
  const getPriceChangeDisplay = (oldPrice: number, newPrice: number) => {
    const changePercent = getPriceChangePercent(oldPrice, newPrice)
    
    if (changePercent > 0) {
      return <span className="text-red-600">+{changePercent.toFixed(2)}%</span>
    } else if (changePercent < 0) {
      return <span className="text-green-600">{changePercent.toFixed(2)}%</span>
    } else {
      return <span className="text-gray-600">0%</span>
    }
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Price Review Queue</h1>
          <p className="text-muted-foreground">
            Review and approve machine price changes flagged for manual review
          </p>
        </div>
        <Button onClick={handleRefresh} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-4">
        {/* Filter Panel */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by machine name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReviewItems()}
              />
              <Button 
                variant="outline" 
                className="w-full mt-1"
                onClick={() => fetchReviewItems()}
              >
                Search
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reviewReason">Review Reason</Label>
              <Select value={reviewReason} onValueChange={setReviewReason}>
                <SelectTrigger id="reviewReason">
                  <SelectValue placeholder="Filter by reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="PRICE_CHANGE">Large Price Change</SelectItem>
                  <SelectItem value="LOW_CONFIDENCE">Low Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confidenceLevel">Confidence Level</Label>
              <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                <SelectTrigger id="confidenceLevel">
                  <SelectValue placeholder="Filter by confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High (90%+)</SelectItem>
                  <SelectItem value="medium">Medium (70-89%)</SelectItem>
                  <SelectItem value="low">Low (Below 70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sortBy">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="change-desc">Price Change (Highest)</SelectItem>
                  <SelectItem value="change-asc">Price Change (Lowest)</SelectItem>
                  <SelectItem value="confidence-desc">Confidence (Highest)</SelectItem>
                  <SelectItem value="confidence-asc">Confidence (Lowest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <div className="md:col-span-3 space-y-6">
          {/* Review Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Items Flagged for Review</CardTitle>
              <CardDescription>
                {reviewItems.length} items need your review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Loading review items...</span>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center py-8 text-red-500">
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  {error}
                </div>
              ) : reviewItems.length === 0 ? (
                <div className="flex justify-center items-center py-8 text-muted-foreground">
                  No items requiring review at this time
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Old Price</TableHead>
                      <TableHead>New Price</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewItems.map((item) => (
                      <TableRow 
                        key={item.id}
                        className={selectedItem?.id === item.id ? "bg-accent/50" : ""}
                        onClick={() => handleSelectItem(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell className="font-medium">
                          {item.machine_name}
                          {item.variant_attribute && 
                            <Badge variant="outline" className="ml-2">{item.variant_attribute}</Badge>
                          }
                        </TableCell>
                        <TableCell>{formatPrice(item.old_price)}</TableCell>
                        <TableCell>{formatPrice(item.new_price)}</TableCell>
                        <TableCell>
                          {getPriceChangeDisplay(item.old_price, item.new_price)}
                        </TableCell>
                        <TableCell>{getReasonBadge(item)}</TableCell>
                        <TableCell>{getTierBadge(item.tier)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(item);
                              }}
                              title="Approve price change"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(item);
                              }}
                              title="Reject price change"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                                setNewPriceOverride(item.new_price ? item.new_price.toString() : "");
                                setIsOverrideDialogOpen(true);
                              }}
                              title="Override with manual price"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {/* Selected Item Details */}
          {selectedItem && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Price Details: {selectedItem.machine_name}</span>
                  {selectedItem.url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2"
                      asChild
                    >
                      <Link href={selectedItem.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> View Source
                      </Link>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Old Price</h3>
                    <p className="text-2xl font-bold">{formatPrice(selectedItem.old_price)}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">New Price</h3>
                    <p className="text-2xl font-bold">{formatPrice(selectedItem.new_price)}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Price Change</h3>
                    <p className="text-2xl font-bold">
                      {getPriceChangeDisplay(selectedItem.old_price, selectedItem.new_price)}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Extraction Method</h3>
                    <div>{getTierBadge(selectedItem.tier)}</div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Confidence</h3>
                    <div>{getConfidenceBadge(selectedItem.confidence)}</div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Checked Date</h3>
                    <p>{formatDate(selectedItem.checked_date)}</p>
                  </div>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="extraction-details">
                    <AccordionTrigger>Extraction Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Extraction Confidence:</div>
                          <div>{selectedItem.extracted_confidence ? 
                            `${(selectedItem.extracted_confidence * 100).toFixed(1)}%` : 'N/A'}</div>
                          
                          <div className="font-medium">Validation Confidence:</div>
                          <div>{selectedItem.validation_confidence ? 
                            `${(selectedItem.validation_confidence * 100).toFixed(1)}%` : 'N/A'}</div>
                          
                          <div className="font-medium">Currency:</div>
                          <div>{selectedItem.currency || 'USD'}</div>
                          
                          <div className="font-medium">Variant:</div>
                          <div>{selectedItem.variant_attribute || 'Default'}</div>
                          
                          <div className="font-medium">Review Reason:</div>
                          <div>{selectedItem.review_reason || 'Unknown'}</div>
                          
                          {selectedItem.failure_reason && (
                            <>
                              <div className="font-medium">Failure Reason:</div>
                              <div>{selectedItem.failure_reason}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Price Override Dialog */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Price</DialogTitle>
            <DialogDescription>
              Enter a manual price override for {selectedItem?.machine_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
            >
              Cancel
            </Button>
            <Button onClick={handleOverride}>
              Save Price Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 