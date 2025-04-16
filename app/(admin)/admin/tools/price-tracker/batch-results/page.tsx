"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { format } from "date-fns"
import { toast } from "sonner"
import { 
  RefreshCw, 
  FileJson, 
  FileSpreadsheet,
  Check,
  X,
  Minus,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Timer,
  Info
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function BatchResultsPage() {
  const searchParams = useSearchParams()
  const batchId = searchParams?.get("batch_id")
  const [batchData, setBatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  
  // Filter states
  const [showSuccessful, setShowSuccessful] = useState(true)
  const [showFailed, setShowFailed] = useState(true)
  const [showUnchanged, setShowUnchanged] = useState(true)
  const [showUpdated, setShowUpdated] = useState(true)
  
  // API URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
  
  const fetchBatchResults = async () => {
    try {
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/api/v1/batch-results/${batchId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch batch results: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch batch results')
      }
      
      setBatchData(data.batch_data)
      
      // If batch is complete, stop auto-refresh
      if (data.batch_data.end_time) {
        if (refreshInterval) {
          clearInterval(refreshInterval)
          setRefreshInterval(null)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching batch results')
      console.error('Error fetching batch results:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Init and cleanup refresh interval
  useEffect(() => {
    if (!batchId) return
    
    // Initial fetch
    fetchBatchResults()
    
    // Cleanup
    return () => {
      if (refreshInterval) clearInterval(refreshInterval)
    }
  }, [batchId])
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchBatchResults()
    toast.info("Refreshing batch results...")
  }
  
  // Export JSON
  const exportJson = () => {
    if (!batchData) return
    
    const dataStr = JSON.stringify(batchData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `batch-${batchId}.json`
    
    const link = document.createElement('a')
    link.setAttribute('href', dataUri)
    link.setAttribute('download', exportFileDefaultName)
    link.click()
    
    toast.success("Exported JSON file")
  }
  
  // Export CSV
  const exportCsv = () => {
    if (!batchData) return
    
    const entries = batchData.entries
    let csvContent = 'Machine ID,Machine Name,Status,Old Price,New Price,Method,Duration,URL,Error\n'
    
    Object.entries(entries).forEach(([machineId, entry]: [string, any]) => {
      let status = ''
      
      if (entry.success === true) {
        status = entry.old_price === entry.new_price ? 'Unchanged' : 'Updated'
      } else if (entry.success === false) {
        status = 'Failed'
      } else {
        status = 'Processing'
      }
      
      const row = [
        machineId,
        `"${(entry.machine_name || '').replace(/"/g, '""')}"`,
        status,
        entry.old_price !== null ? entry.old_price : '',
        entry.new_price !== null ? entry.new_price : '',
        entry.extraction_method || '',
        entry.duration_seconds || '',
        `"${(entry.url || '').replace(/"/g, '""')}"`,
        `"${(entry.error || '').replace(/"/g, '""')}"`
      ]
      
      csvContent += row.join(',') + '\n'
    })
    
    const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent)
    const exportFileDefaultName = `batch-${batchId}.csv`
    
    const link = document.createElement('a')
    link.setAttribute('href', dataUri)
    link.setAttribute('download', exportFileDefaultName)
    link.click()
    
    toast.success("Exported CSV file")
  }
  
  // Format price
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }
  
  // Get status icon
  const getStatusIcon = (entry: any) => {
    if (!entry) return <Minus className="h-4 w-4 text-gray-400" />
    
    if (entry.success === true) {
      return entry.old_price === entry.new_price ? 
        <Minus className="h-4 w-4 text-gray-500" /> : 
        <Check className="h-4 w-4 text-green-500" />
    } else if (entry.success === false) {
      return <X className="h-4 w-4 text-red-500" />
    } else {
      return <Timer className="h-4 w-4 text-blue-500 animate-spin" />
    }
  }
  
  // Get status text
  const getStatusText = (entry: any) => {
    if (!entry) return 'Unknown'
    
    if (entry.success === true) {
      return entry.old_price === entry.new_price ? 'Unchanged' : 'Updated'
    } else if (entry.success === false) {
      return 'Failed'
    } else {
      return 'Processing'
    }
  }
  
  // Get status badge
  const getStatusBadge = (entry: any) => {
    if (!entry) return (
      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
        Unknown
      </Badge>
    )
    
    if (entry.success === true) {
      return entry.old_price === entry.new_price ? (
        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
          Unchanged
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Updated
        </Badge>
      )
    } else if (entry.success === false) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Failed
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Processing
        </Badge>
      )
    }
  }
  
  // Filter entries
  const filterEntries = () => {
    if (!batchData || !batchData.entries) return []
    
    return Object.entries(batchData.entries).filter(([_, entry]: [string, any]) => {
      if (entry.success === true) {
        if (entry.old_price === entry.new_price) {
          return showUnchanged
        } else {
          return showUpdated
        }
      } else if (entry.success === false) {
        return showFailed
      }
      return true
    })
  }
  
  if (!batchId) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Batch Results</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">No batch ID provided</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Batch Results</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-32 gap-4">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-gray-500">Loading batch results...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Batch Results</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-32 gap-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-red-500">{error}</p>
              <Button onClick={handleRefresh}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const stats = batchData?.stats || {}
  const progressPercent = stats.progress_percentage || 0
  const entries = filterEntries()
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Batch Results</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson}>
            <FileJson className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Batch Summary</CardTitle>
          <CardDescription>
            Batch ID: {batchId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center p-3 mb-4 text-sm border rounded-md bg-blue-50 border-blue-200 text-blue-800">
            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
            <p>Auto-refresh has been disabled to prevent high CPU usage. Use the Refresh button to get updated results.</p>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Total Machines</p>
              <p className="text-2xl font-bold">{stats.total_machines || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Completed</p>
              <p className="text-2xl font-bold">{stats.completed_machines || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Successful</p>
              <p className="text-2xl font-bold text-green-600">{stats.successful_machines || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed_machines || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Unchanged</p>
              <p className="text-2xl font-bold text-gray-600">{stats.unchanged_prices || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Updated</p>
              <p className="text-2xl font-bold text-blue-600">{stats.updated_prices || 0}</p>
            </div>
          </div>
          
          <div className="space-y-1 mb-4">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-successful" 
                checked={showSuccessful}
                onCheckedChange={(checked) => setShowSuccessful(checked === true)}
              />
              <Label htmlFor="show-successful">Show all successful</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-failed" 
                checked={showFailed}
                onCheckedChange={(checked) => setShowFailed(checked === true)}
              />
              <Label htmlFor="show-failed">Show failed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-unchanged" 
                checked={showUnchanged}
                onCheckedChange={(checked) => setShowUnchanged(checked === true)}
              />
              <Label htmlFor="show-unchanged">Show unchanged</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-updated" 
                checked={showUpdated}
                onCheckedChange={(checked) => setShowUpdated(checked === true)}
              />
              <Label htmlFor="show-updated">Show updated</Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Machine Results</CardTitle>
          <CardDescription>
            Showing {entries.length} of {Object.keys(batchData?.entries || {}).length} machines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Old Price</TableHead>
                  <TableHead>New Price</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No results found with the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(([machineId, entry]: [string, any]) => (
                    <TableRow key={machineId}>
                      <TableCell>
                        {getStatusBadge(entry)}
                      </TableCell>
                      <TableCell className="font-medium max-w-48 truncate">
                        {entry.machine_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{formatPrice(entry.old_price)}</TableCell>
                      <TableCell>{formatPrice(entry.new_price)}</TableCell>
                      <TableCell>
                        {entry.success && entry.old_price !== null && entry.new_price !== null ? (
                          <span className={
                            entry.new_price > entry.old_price 
                              ? 'text-red-500' 
                              : entry.new_price < entry.old_price 
                                ? 'text-green-500' 
                                : ''
                          }>
                            {entry.new_price === entry.old_price ? (
                              '-'
                            ) : (
                              <>
                                {entry.new_price > entry.old_price ? '+' : ''}
                                {formatPrice(entry.new_price - entry.old_price)}
                              </>
                            )}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.extraction_method || '-'}
                      </TableCell>
                      <TableCell>
                        {entry.duration_seconds ? `${entry.duration_seconds.toFixed(1)}s` : '-'}
                      </TableCell>
                      <TableCell>
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value={machineId} className="border-0">
                            <AccordionTrigger className="py-0">
                              <span className="sr-only">Details</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 py-2 text-sm">
                                {entry.error && (
                                  <div className="bg-red-50 p-3 rounded-md text-red-700 whitespace-pre-wrap">
                                    <p className="font-semibold">Error:</p>
                                    <p>{entry.error}</p>
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                  <div className="font-medium">URL:</div>
                                  <div className="truncate">{entry.url || 'N/A'}</div>
                                  
                                  {entry.html_size && (
                                    <>
                                      <div className="font-medium">HTML Size:</div>
                                      <div>{(entry.html_size / 1024).toFixed(1)} KB</div>
                                    </>
                                  )}
                                  
                                  {entry.http_status && (
                                    <>
                                      <div className="font-medium">HTTP Status:</div>
                                      <div>{entry.http_status}</div>
                                    </>
                                  )}
                                  
                                  {entry.extraction_attempts && (
                                    <>
                                      <div className="font-medium">Extraction Attempts:</div>
                                      <div>{entry.extraction_attempts.join(', ')}</div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 