"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { PriceHistoryChart } from "@/components/product/price-history-chart"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Check, RefreshCw, Rocket, LineChart, Trash2, AlertCircle, Bug, XCircle, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Script from "next/script"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Add type definitions for the window object with priceTrackerAPI
declare global {
  interface Window {
    priceTrackerAPI?: {
      updateMachinePrice: (machineId: string) => Promise<any>;
      updateAllPrices: (daysThreshold?: number, machineLimit?: number | null) => Promise<any>;
    };
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default function PriceTrackerAdmin() {
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [selectedMachine, setSelectedMachine] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [recentlyUpdated, setRecentlyUpdated] = useState<any[]>([])
  const [filterFeatured, setFilterFeatured] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [debugDialogOpen, setDebugDialogOpen] = useState(false)
  const [pythonApiReady, setPythonApiReady] = useState(false)
  const [batchUpdateDialogOpen, setBatchUpdateDialogOpen] = useState(false)
  const [daysThreshold, setDaysThreshold] = useState(7)
  const [batchPreviewCount, setBatchPreviewCount] = useState<number | null>(null)
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false)
  const [machineLimit, setMachineLimit] = useState<number | null>(10)
  const [previewMachineIds, setPreviewMachineIds] = useState<string[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  
  // Fetch machines
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        setLoading(true)
        
        let query = supabase
          .from("machines")
          .select("id, \"Machine Name\", \"Company\", Price, \"Is A Featured Resource?\", product_link, \"Affiliate Link\"")
          .order("\"Machine Name\"", { ascending: true })
          
        if (filterFeatured) {
          query = query.eq("Is A Featured Resource?", "true")
        }
        
        if (searchTerm) {
          query = query.ilike("\"Machine Name\"", `%${searchTerm}%`)
        }
          
        const { data, error } = await query
        
        if (error) throw error
        
        setMachines(data || [])
      } catch (error) {
        console.error("Error fetching machines:", error)
        toast.error("Failed to load machines")
      } finally {
        setLoading(false)
      }
    }
    
    fetchMachines()
  }, [searchTerm, filterFeatured])
  
  // Fetch recently updated machines
  useEffect(() => {
    const fetchRecentlyUpdated = async () => {
      try {
        // Get the most recent price history entries
        const { data: recentEntries, error } = await supabase
          .from("price_history")
          .select("id, machine_id, price, date, is_all_time_low, is_all_time_high")
          .order("date", { ascending: false })
          .limit(10)
        
        if (error) throw error
        
        if (recentEntries && recentEntries.length > 0) {
          // Get machine names and current prices
          const machineIds = [...new Set(recentEntries.map(item => item.machine_id))]
          const { data: machineData, error: machineError } = await supabase
            .from("machines")
            .select("id, \"Machine Name\", \"Company\", Price")
            .in("id", machineIds)
          
          if (machineError) throw machineError
          
          // For each recent entry, find the previous entry
          const combinedData = await Promise.all(recentEntries.map(async (entry) => {
            // Get previous price history entry for this machine
            const { data: prevEntries, error: prevError } = await supabase
              .from("price_history")
              .select("price")
              .eq("machine_id", entry.machine_id)
              .lt("date", entry.date)  // Entries before the current one
              .order("date", { ascending: false })
              .limit(1)
              
            const previousPrice = prevEntries && prevEntries.length > 0 
              ? prevEntries[0].price 
              : entry.price // If no previous entry, use current price
              
            const machine = machineData?.find(m => m.id === entry.machine_id)
            
            // Calculate price change
            const priceChange = prevEntries && prevEntries.length > 0 
              ? entry.price - previousPrice
              : 0
            
            // Format price change for display
            const priceChangeClass = priceChange > 0 
              ? 'text-red-500' 
              : priceChange < 0 
                ? 'text-green-500' 
                : ''
            
            return {
              id: entry.id,
              machine_id: entry.machine_id,
              recordedPrice: previousPrice, // Previous price
              price: entry.price,           // Price at time of update
              currentPrice: machine ? machine.Price : null, // Current price from machines table
              date: entry.date,
              is_all_time_low: entry.is_all_time_low,
              is_all_time_high: entry.is_all_time_high,
              machineName: machine ? machine["Machine Name"] : "Unknown",
              company: machine ? machine["Company"] : "Unknown",
              priceChange,
              priceChangeClass
            }
          }))
          
          setRecentlyUpdated(combinedData)
        } else {
          setRecentlyUpdated([])
        }
      } catch (error) {
        console.error("Error fetching recent updates:", error)
      }
    }
    
    fetchRecentlyUpdated()
  }, [refreshing])
  
  // Initial setup
  useEffect(() => {
    if (pythonApiReady) {
      previewBatchUpdate(daysThreshold, machineLimit)
    }
  }, [pythonApiReady, daysThreshold, machineLimit])
  
  // Handle machine selection
  const selectMachine = async (machine: any) => {
    setSelectedMachine(machine)
    
    try {
      const { data, error } = await supabase
        .from("price_history")
        .select("*")
        .eq("machine_id", machine.id)
        .order("date", { ascending: false })
      
      if (error) throw error
      
      setPriceHistory(data || [])
    } catch (error) {
      console.error("Error fetching price history:", error)
      toast.error("Failed to load price history")
    }
  }
  
  // Function to trigger manual price update for a machine
  const updatePrice = async (machine: any, debug = false) => {
    try {
      setDebugInfo(null)
      
      if (!pythonApiReady || !window.priceTrackerAPI) {
        toast.error("Python Price Extractor API is not connected")
        return
      }
      
      // Show loading state
      toast.info(`Updating price for ${machine["Machine Name"]} with Python API...`)
      
      const result = await window.priceTrackerAPI.updateMachinePrice(machine.id)
      
      if (result.success) {
        // Set debug info for either success or debug mode
        if (debug || result.method) {
          setDebugInfo({
            machine: machine["Machine Name"],
            success: true,
            price: result.new_price,
            details: {
              method: result.method,
              oldPrice: result.old_price,
              newPrice: result.new_price,
              priceChange: result.price_change,
              percentageChange: result.percentage_change,
              message: result.message
            }
          })
          
          if (debug) {
            setDebugDialogOpen(true)
          }
        }
        
        // Show appropriate success message
        if (result.old_price === result.new_price) {
          toast.info(`Price unchanged for ${machine["Machine Name"]}: ${formatPrice(result.new_price)}`)
        } else {
          toast.success(`Price updated for ${machine["Machine Name"]}: ${formatPrice(result.old_price)} → ${formatPrice(result.new_price)}`)
        }
        
        // Refresh machine data to show new price
        const { data, error } = await supabase
          .from("machines")
          .select("id, \"Machine Name\", \"Company\", Price, \"Is A Featured Resource?\", product_link, \"Affiliate Link\"")
          .eq("id", machine.id)
          .single()
          
        if (!error && data) {
          // Update the machine in the list
          setMachines(prev => prev.map(m => m.id === data.id ? data : m))
          
          // Update selected machine if it's the current one
          if (selectedMachine?.id === machine.id) {
            setSelectedMachine(data)
            selectMachine(data)
          }
        }
        
        setRefreshing(prev => !prev)
      } else {
        // Handle error from Python API
        setDebugInfo({
          machine: machine["Machine Name"],
          error: result.error || "Unknown error",
          details: {
            error: result.error,
            url: machine.product_link
          }
        })
        
        setDebugDialogOpen(true)
        toast.error(`Failed to update price: ${result.error}`)
      }
    } catch (error) {
      console.error("Error updating price:", error)
      
      // Set debug info for the error
      setDebugInfo({
        machine: machine["Machine Name"],
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          error: error instanceof Error ? error.stack : "No stack trace available",
          url: machine.product_link
        }
      })
      
      setDebugDialogOpen(true)
      toast.error(`Failed to update price: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  // Function to run update for all featured machines
  const updateAllPrices = async () => {
    // Open the batch update dialog instead of immediately starting the update
    setBatchUpdateDialogOpen(true)
    // Reset preview count
    setBatchPreviewCount(null)
    // Start loading preview
    previewBatchUpdate(daysThreshold, machineLimit)
  }
  
  // Function to preview batch update (count of machines)
  const previewBatchUpdate = async (days: number, limit: number | null = null) => {
    try {
      setBatchPreviewLoading(true)
      
      if (!pythonApiReady || !window.priceTrackerAPI) {
        toast.error("Python Price Extractor API is not connected")
        return
      }
      
      // Use a simplified endpoint to just get machine count
      const response = await fetch(`${process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'}/api/v1/batch-configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          days_threshold: days,
          limit: limit 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setBatchPreviewCount(data.configuration?.machine_count || 0)
        // Store the machine IDs for use in executeBatchUpdate
        setPreviewMachineIds(data.configuration?.machine_ids || [])
      } else {
        setBatchPreviewCount(0)
        setPreviewMachineIds([])
        toast.error("Failed to preview batch update")
      }
    } catch (error) {
      console.error("Error previewing batch update:", error)
      setBatchPreviewCount(0)
      setPreviewMachineIds([])
    } finally {
      setBatchPreviewLoading(false)
    }
  }
  
  // Function to execute the batch update after confirmation
  const executeBatchUpdate = async () => {
    try {
      if (!pythonApiReady || !window.priceTrackerAPI) {
        toast.error("Python Price Extractor API is not connected")
        return
      }
      
      // Use Python API for batch update with the machine IDs from preview
      toast.info("Starting batch update with Python API...")
      
      // Create custom request directly to the API
      const response = await fetch(`${process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'}/api/v1/batch-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          days_threshold: daysThreshold,
          limit: machineLimit,
          machine_ids: previewMachineIds // Pass the machine IDs from preview
        })
      })
      
      const batchResult = await response.json()
      
      if (batchResult.success) {
        toast.success(`Python API batch update started in the background`)
        
        // Close the dialog
        setBatchUpdateDialogOpen(false)
        
        // Explicitly fetch batch jobs with a longer delay to ensure the batch is created
        const fetchBatchJobs = async () => {
          try {
            setLoadingBatches(true)
            const apiUrl = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
            const response = await fetch(`${apiUrl}/api/v1/batches`)
            
            if (!response.ok) {
              throw new Error(`Failed to fetch batch jobs: ${response.statusText}`)
            }
            
            const data = await response.json()
            
            if (!data.success) {
              throw new Error(data.error || 'Failed to fetch batch jobs')
            }
            
            setBatches(data.batches || [])
            
            // If batches are loaded but empty, try one more time after a delay
            if (data.batches.length === 0) {
              setTimeout(fetchBatchJobs, 3000)
            }
          } catch (error) {
            console.error("Error fetching batch jobs:", error)
            toast.error("Failed to load batch jobs")
          } finally {
            setLoadingBatches(false)
          }
        }
        
        // Wait a bit longer before fetching batch jobs to ensure the batch is created
        setTimeout(() => {
          fetchBatchJobs()
          // Also refresh other data
          if (selectedMachine) {
            selectMachine(selectedMachine)
          }
          setRefreshing(prev => !prev)
        }, 3000)
      } else {
        toast.error(`Python API batch update failed: ${batchResult.error}`)
        // Close the dialog
        setBatchUpdateDialogOpen(false)
      }
    } catch (error) {
      console.error("Error updating prices:", error)
      toast.error(`Failed to update prices: ${error instanceof Error ? error.message : "Unknown error"}`)
      // Close the dialog
      setBatchUpdateDialogOpen(false)
    }
  }
  
  // Function to delete a price record
  const deletePrice = async (recordId: string) => {
    try {
      const response = await fetch(`/api/price-history/delete?id=${recordId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete price record")
      }
      
      toast.success("Price record deleted")
      
      // Refresh data
      setRefreshing(prev => !prev)
      
      // If this is part of the selected machine's history, refresh that too
      if (selectedMachine) {
        selectMachine(selectedMachine)
      }
    } catch (error) {
      console.error("Error deleting price record:", error)
      toast.error(`Failed to delete price record: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  // Function to clean up invalid price records
  const cleanupInvalidPrices = async () => {
    if (!window.confirm("This will remove all price records with values less than $10. Continue?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/price-history/clean?secret=admin-panel`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to clean up price records")
      }
      
      const message = result.recordsDeleted > 0
        ? `Removed ${result.recordsDeleted} invalid price records`
        : "No invalid price records found"
        
      toast.success(message)
      
      // Refresh data
      setRefreshing(prev => !prev)
      
      // If we have a selected machine, refresh that too
      if (selectedMachine) {
        selectMachine(selectedMachine)
      }
    } catch (error) {
      console.error("Error cleaning up price records:", error)
      toast.error(`Failed to clean up price records: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy h:mm a")
  }
  
  // Format price for display
  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(price)
  }
  
  // Handle API script loaded
  const handleScriptLoad = () => {
    setPythonApiReady(true)
    console.log("Python Price Extractor API script loaded")
    toast.success("Python Price Extractor API connected")
  }
  
  // Handle API script error
  const handleScriptError = () => {
    console.error("Failed to load Python Price Extractor API script")
    toast.error("Failed to connect to Python Price Extractor API")
  }
  
  // Fetch batch jobs
  useEffect(() => {
    const fetchBatchJobs = async () => {
      try {
        setLoadingBatches(true)
        const apiUrl = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
        
        console.log("Fetching batch jobs from:", `${apiUrl}/api/v1/batches`)
        
        const response = await fetch(`${apiUrl}/api/v1/batches`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch batch jobs: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log("Batch jobs response:", data)
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch batch jobs')
        }
        
        setBatches(data.batches || [])
        
        // If no batches were found, log this info
        if (!data.batches || data.batches.length === 0) {
          console.log("No batch jobs found in response")
        }
      } catch (error) {
        console.error("Error fetching batch jobs:", error)
        toast.error(`Failed to load batch jobs: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setLoadingBatches(false)
      }
    }
    
    // Fetch batch jobs when the component mounts and when refreshing state changes
    if (pythonApiReady) {
      fetchBatchJobs()
    }
  }, [pythonApiReady, refreshing])
  
  // Get batch status badge
  const getBatchStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>
      case 'in_progress':
      case 'started':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">In Progress</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>
    }
  }
  
  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return 'Invalid date'
    }
  }
  
  return (
    <div className="space-y-6 p-6">
      <Script 
        src="/admin/tools/price-tracker/price-tracker-api.js"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />
      
      <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {debugInfo?.success ? (
                <span className="flex items-center">
                  <Check className="w-5 h-5 mr-2 text-green-500" />
                  Price Extraction Debug: {debugInfo?.machine}
                </span>
              ) : (
                <span className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                  Price Extraction Failed: {debugInfo?.machine}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {debugInfo?.success ? (
                `Successfully extracted price: ${formatPrice(debugInfo?.price)}`
              ) : (
                `Error: ${debugInfo?.error}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          {debugInfo && (
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                {debugInfo.success && debugInfo.details && (
                  <AccordionItem value="price-info">
                    <AccordionTrigger>Price Information</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">Method Used:</div>
                        <div>{debugInfo.details.method || "Unknown"}</div>
                        
                        <div className="font-medium">Old Price:</div>
                        <div>{formatPrice(debugInfo.details.oldPrice)}</div>
                        
                        <div className="font-medium">New Price:</div>
                        <div>{formatPrice(debugInfo.details.newPrice)}</div>
                        
                        {debugInfo.details.priceChange !== null && (
                          <>
                            <div className="font-medium">Price Change:</div>
                            <div className={debugInfo.details.priceChange > 0 ? 'text-red-500' : debugInfo.details.priceChange < 0 ? 'text-green-500' : ''}>
                              {debugInfo.details.priceChange > 0 ? '+' : ''}{formatPrice(debugInfo.details.priceChange)}
                              {debugInfo.details.percentageChange !== null && (
                                <span className="ml-1">
                                  ({debugInfo.details.percentageChange > 0 ? '+' : ''}{debugInfo.details.percentageChange.toFixed(2)}%)
                                </span>
                              )}
                            </div>
                          </>
                        )}
                        
                        {debugInfo.details.message && (
                          <>
                            <div className="font-medium">Message:</div>
                            <div>{debugInfo.details.message}</div>
                          </>
                        )}
                        
                        {debugInfo.details.responseTimeMs && (
                          <>
                            <div className="font-medium">Response Time:</div>
                            <div>{debugInfo.details.responseTimeMs}ms</div>
                          </>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {debugInfo.details?.url && (
                  <AccordionItem value="url">
                    <AccordionTrigger>URL</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted rounded-md p-2 overflow-x-auto">
                        <a 
                          href={debugInfo.details.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all"
                        >
                          {debugInfo.details.url}
                        </a>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                {debugInfo.details?.error && (
                  <AccordionItem value="error">
                    <AccordionTrigger>Error Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-red-50 text-red-900 rounded-md p-2 overflow-auto">
                        <p className="font-medium">{debugInfo.details.error}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                {debugInfo.details?.debug && (
                  <AccordionItem value="api">
                    <AccordionTrigger>Python API Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted rounded-md p-2 overflow-x-auto">
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(debugInfo.details.debug, null, 2)}</pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Batch Update Dialog */}
      <Dialog open={batchUpdateDialogOpen} onOpenChange={setBatchUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Batch Update Configuration</DialogTitle>
            <DialogDescription>
              Configure and start a batch price update for machines.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="days-threshold">Update machines not updated in the last:</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="days-threshold"
                  type="number"
                  min="0"
                  value={daysThreshold}
                  onChange={(e) => {
                    const newValue = Number(e.target.value)
                    setDaysThreshold(newValue)
                    previewBatchUpdate(newValue, machineLimit)
                  }}
                  className="w-20"
                />
                <span>days</span>
              </div>
              <p className="text-sm text-gray-500">
                Set to 0 to update all machines regardless of last update time.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machine-limit">Limit number of machines:</Label>
              <Select 
                value={machineLimit === null ? "all" : machineLimit.toString()} 
                defaultValue="10"
                onValueChange={(value) => {
                  const limit = value === "all" ? null : parseInt(value)
                  setMachineLimit(limit)
                  previewBatchUpdate(daysThreshold, limit)
                }}
              >
                <SelectTrigger id="machine-limit" className="w-full">
                  <SelectValue placeholder="Select limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 machines</SelectItem>
                  <SelectItem value="25">25 machines</SelectItem>
                  <SelectItem value="50">50 machines</SelectItem>
                  <SelectItem value="100">100 machines</SelectItem>
                  <SelectItem value="all">All machines</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Limit the number of machines to update at once.
              </p>
            </div>
            
            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-1">Machines to update:</h4>
              {batchPreviewLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-500">Loading preview...</span>
                </div>
              ) : (
                <p className="text-sm">
                  {batchPreviewCount === null 
                    ? "Loading..."
                    : batchPreviewCount === 0 
                      ? "No machines found to update."
                      : `${batchPreviewCount} machine${batchPreviewCount === 1 ? '' : 's'} will be updated.`
                  }
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setBatchUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={executeBatchUpdate}
              disabled={batchPreviewLoading || batchPreviewCount === 0}
            >
              Start Batch Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Price Tracker Admin</h1>
        <Button onClick={updateAllPrices}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Update All Prices
        </Button>
      </div>
      
      <p className="text-gray-500">
        Manage and test the price tracking feature. You can update prices manually or view price history.
      </p>
      
      <Tabs defaultValue="machines">
        <TabsList>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="recent">Recent Updates</TabsTrigger>
          <TabsTrigger value="batch-jobs">Batch Jobs</TabsTrigger>
          <TabsTrigger value="preview">Chart Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="machines" className="space-y-4">
          <Card className="col-span-3">
            <CardHeader className="space-y-4">
              <CardTitle>Machines</CardTitle>
              <CardDescription>
                View and manage price history for machines.
              </CardDescription>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured-filter"
                    checked={filterFeatured}
                    onCheckedChange={setFilterFeatured}
                  />
                  <Label htmlFor="featured-filter">Show featured machines only</Label>
                </div>
                
                <div className="flex-1 max-w-sm">
                  <Input
                    placeholder="Search machines..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Source URL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading machines...
                        </TableCell>
                      </TableRow>
                    ) : machines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          No machines found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      machines.map(machine => (
                        <TableRow key={machine.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="font-medium">{machine["Machine Name"]}</span>
                              <span className="text-sm text-gray-500">{machine["Company"]}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatPrice(machine["Price"])}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {machine.product_link || machine["Affiliate Link"] || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => selectMachine(machine)}
                              >
                                <LineChart className="w-4 h-4 mr-1" /> 
                                History
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => updatePrice(machine, true)}
                              >
                                <Bug className="w-4 h-4 mr-1" /> 
                                Debug
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => updatePrice(machine)}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" /> 
                                Update
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {selectedMachine && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedMachine["Machine Name"]} - Price History</CardTitle>
                <CardDescription>
                  Current price: {formatPrice(selectedMachine["Price"])}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {priceHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No price history available. Use the "Update" button to record the current price.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <PriceHistoryChart 
                      machineId={selectedMachine.id}
                      currentPrice={selectedMachine["Price"] || 0}
                    />
                    
                    <Separator />
                    
                    <div className="rounded-md border max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {priceHistory.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{formatDate(record.date)}</TableCell>
                              <TableCell>{formatPrice(record.price)}</TableCell>
                              <TableCell className="max-w-xs truncate">{record.source}</TableCell>
                              <TableCell>
                                {record.is_all_time_low && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    All-time Low
                                  </Badge>
                                )}
                                {record.is_all_time_high && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    All-time High
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this price record?")) {
                                      deletePrice(record.id)
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setSelectedMachine(null)}>
                  Back to Machines
                </Button>
                <Button onClick={() => updatePrice(selectedMachine)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Price
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Price Updates</CardTitle>
              <CardDescription>
                The 10 most recent price updates across all machines.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Previous Price</TableHead>
                      <TableHead>New Price</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentlyUpdated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No recent updates found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentlyUpdated.map((record, index) => (
                        <TableRow key={`${record.machine_id}-${index}`}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="font-medium">{record.machineName}</span>
                              <span className="text-sm text-gray-500">{record.company}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatPrice(record.recordedPrice)}</TableCell>
                          <TableCell>
                            {formatPrice(record.price)}
                            {record.priceChange !== 0 && (
                              <span className={`ml-2 text-sm ${record.priceChangeClass}`}>
                                ({record.priceChange > 0 ? '+' : ''}
                                {formatPrice(record.priceChange)})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>
                            {record.is_all_time_low && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                All-time Low
                              </Badge>
                            )}
                            {record.is_all_time_high && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                All-time High
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this price record?")) {
                                  deletePrice(record.id)
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline" 
                onClick={() => setRefreshing(prev => !prev)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              <Button
                variant="secondary"
                onClick={cleanupInvalidPrices}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Clean Invalid Records
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="batch-jobs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Batch Price Update Jobs</CardTitle>
                  <CardDescription>View and manage batch price update operations</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setRefreshing(prev => !prev)}
                  disabled={loadingBatches}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingBatches ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBatches ? (
                <div className="flex justify-center p-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No batch jobs found</p>
                  <p className="text-sm mt-2">Start a new batch update using the "Update All Prices" button</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Machines</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      // Calculate duration if available
                      const duration = batch.start_time && batch.end_time 
                        ? new Date(batch.end_time).getTime() - new Date(batch.start_time).getTime() 
                        : null;
                      
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono text-xs">{batch.id}</TableCell>
                          <TableCell>{getBatchStatusBadge(batch.status)}</TableCell>
                          <TableCell>{batch.total_machines || 'N/A'}</TableCell>
                          <TableCell>
                            {batch.start_time 
                              ? <span title={new Date(batch.start_time).toLocaleString()}>
                                  {formatRelativeTime(batch.start_time)}
                                </span>
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            {duration 
                              ? `${Math.floor(duration / 1000)} seconds`
                              : batch.status.toLowerCase() === 'completed' 
                                ? 'Unknown' 
                                : 'In progress'
                            }
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              asChild
                            >
                              <a href={`/admin/tools/price-tracker/batch-results?batch_id=${batch.id}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Chart Preview</CardTitle>
              <CardDescription>
                Preview how the price history chart will look on product pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedMachine ? (
                <div className="max-w-xl mx-auto">
                  <PriceHistoryChart 
                    machineId={selectedMachine.id}
                    currentPrice={selectedMachine["Price"] || 0}
                  />
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <LineChart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="mb-4">Select a machine to preview its price history chart.</p>
                  <Button variant="outline" onClick={() => {
                    const tabsElement = document.querySelector('[data-value="machines"]') as HTMLElement;
                    if (tabsElement) tabsElement.click();
                  }}>
                    Select a Machine
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 