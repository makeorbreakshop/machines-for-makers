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
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { PriceHistoryChart } from "@/components/product/price-history-chart"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Check, RefreshCw, Rocket, LineChart, Trash2, AlertCircle, Bug, XCircle, ExternalLink, CheckCircle, X, Search, Eye, Code, TestTube, Zap, Mail, Copy, TrendingDown, DollarSign } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

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

// Define machine interface for table
interface TableMachine {
  id: string
  "Machine Name": string
  "Company": string | null
  "Price": number | null
  "Is A Featured Resource?": string | null
  product_link: string | null
  "Affiliate Link": string | null
}

// Format price for display
const formatPrice = (price: number | null) => {
  if (price === null) return "N/A"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(price)
}

// Define base columns for the machines table (functions will be added in component)
const createMachineColumns = (
  openPriceHistoryModal: (machine: TableMachine) => void,
  updatePrice: (machine: TableMachine, debug?: boolean) => void,
  openMachineHistoryModal: (machineId: string, machineName: string) => void
): ColumnDef<TableMachine>[] => [
  {
    accessorKey: "Machine Name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="pl-0"
        >
          Machine
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const machine = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{machine["Machine Name"]}</span>
          <span className="text-sm text-gray-500">{machine["Company"]}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "Price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Current Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const price = row.getValue("Price") as number
      return formatPrice(price)
    },
  },
  {
    accessorKey: "Company",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Brand
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: "source_url",
    header: "Source URL",
    cell: ({ row }) => {
      const machine = row.original
      const url = machine.product_link || machine["Affiliate Link"]
      return (
        <div className="max-w-xs truncate">
          {url || "N/A"}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const machine = row.original
      return (
        <div className="flex justify-end gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              const url = machine.product_link || machine["Affiliate Link"];
              if (url) {
                window.open(url, '_blank');
              } else {
                toast.error("No URL available for this machine");
              }
            }}
            disabled={!machine.product_link && !machine["Affiliate Link"]}
          >
            <ExternalLink className="w-4 h-4 mr-1" /> 
            URL
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => openPriceHistoryModal(machine)}
          >
            <LineChart className="w-4 h-4 mr-1" /> 
            Graph
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => openMachineHistoryModal(machine.id, machine["Machine Name"])}
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
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]

// Generate brand filter options
const getBrandFilterOptions = (data: TableMachine[]) => {
  const brands = new Set<string>()
  
  data.forEach(machine => {
    if (machine["Company"]) {
      brands.add(machine["Company"])
    }
  })
  
  return Array.from(brands).map(brand => ({
    label: brand,
    value: brand,
  }))
}

export default function PriceTrackerAdmin() {
  const [machines, setMachines] = useState<TableMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [recentlyUpdated, setRecentlyUpdated] = useState<any[]>([])
  const [filterFeatured, setFilterFeatured] = useState(false)
  const [hasMoreRecords, setHasMoreRecords] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [recordsPerPage] = useState(50)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [debugDialogOpen, setDebugDialogOpen] = useState(false)
  const [priceHistoryModalOpen, setPriceHistoryModalOpen] = useState(false)
  const [priceHistoryMachine, setPriceHistoryMachine] = useState<any>(null)
  const [pythonApiReady, setPythonApiReady] = useState(false)
  const [batchUpdateDialogOpen, setBatchUpdateDialogOpen] = useState(false)
  const [daysThreshold, setDaysThreshold] = useState(7)
  const [batchPreviewCount, setBatchPreviewCount] = useState<number | null>(null)
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false)
  const [machineLimit, setMachineLimit] = useState<number | null>(10)
  const [maxWorkers, setMaxWorkers] = useState<number>(3)
  const [useScrapfly, setUseScrapfly] = useState<boolean>(true)
  const [previewMachineIds, setPreviewMachineIds] = useState<string[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [batchFilter, setBatchFilter] = useState<string>("all")
  
  // Bulk selection state
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [batchActionLoading, setBatchActionLoading] = useState(false)
  
  // Price correction dialog state
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false)
  const [correctionRecord, setCorrectionRecord] = useState<any>(null)
  const [correctPrice, setCorrectPrice] = useState("")
  const [correctionReason, setCorrectionReason] = useState("")
  
  // Debug tab state
  const [debugUrl, setDebugUrl] = useState("")
  const [debugMachineId, setDebugMachineId] = useState("")
  const [debugResults, setDebugResults] = useState<any>(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugMethodResults, setDebugMethodResults] = useState<any>(null)
  const [debugHtmlContent, setDebugHtmlContent] = useState("")
  const [customSelectors, setCustomSelectors] = useState("")
  const [manualPrice, setManualPrice] = useState("")
  const [extractionFailures, setExtractionFailures] = useState<any[]>([])
  const [failuresLoading, setFailuresLoading] = useState(false)
  
  // Email generation state
  const [emailHtml, setEmailHtml] = useState('')
  const [emailStats, setEmailStats] = useState<any>(null)
  const [subjectLine, setSubjectLine] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [copied, setCopied] = useState(false)
  const [priceDropsOnly, setPriceDropsOnly] = useState(true)
  const [minDiscountThreshold, setMinDiscountThreshold] = useState('5')
  const [dateRangeFilter, setDateRangeFilter] = useState('30')
  const [allTimeLowsOnly, setAllTimeLowsOnly] = useState(false)
  const [selectedDealsForEmail, setSelectedDealsForEmail] = useState<Set<string>>(new Set())
  const [emailTemplate, setEmailTemplate] = useState('')
  const [emailGenerationMode, setEmailGenerationMode] = useState(false)
  const [emailDeals, setEmailDeals] = useState<any[]>([])
  const [loadingEmailDeals, setLoadingEmailDeals] = useState(false)
  
  // Machine price history modal state
  const [machineHistoryModalOpen, setMachineHistoryModalOpen] = useState(false)
  const [machineHistoryData, setMachineHistoryData] = useState<any>(null)
  const [machineHistoryLoading, setMachineHistoryLoading] = useState(false)
  
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
  }, [filterFeatured])
  
  // Fetch recently updated machines
  const fetchRecentlyUpdated = async (offset = 0, append = false) => {
    try {
      if (!append) {
        setRecentlyUpdated([])
        setHasMoreRecords(true)
      }
      
      // Build query with status filter
      let query = supabase
        .from("price_history")
        .select("id, machine_id, price, previous_price, date, is_all_time_low, is_all_time_high, status, failure_reason, review_result, reviewed_by, batch_id")
        .order("date", { ascending: false })
      
      // Apply database-level filtering based on status
      if (statusFilter !== "all") {
        switch(statusFilter) {
          case 'PENDING_REVIEW':
            query = query.eq('status', 'PENDING_REVIEW')
            break
          case 'AUTO_APPLIED':
            query = query.eq('status', 'AUTO_APPLIED')
            break
          case 'SUCCESS':
            query = query.eq('status', 'SUCCESS')
            break
          case 'MANUAL_CORRECTION':
            query = query.eq('status', 'MANUAL_CORRECTION')
            break
          case 'REVIEWED_APPROVED':
            query = query.eq('status', 'REVIEWED').eq('review_result', 'APPROVED')
            break
          case 'REVIEWED_REJECTED':
            query = query.eq('status', 'REVIEWED').eq('review_result', 'REJECTED')
            break
          case 'FAILED':
            query = query.eq('status', 'FAILED').not('failure_reason', 'like', '%Pending review%')
            break
        }
      }
      
      // Apply batch filtering
      if (batchFilter !== "all") {
        if (batchFilter === "no-batch") {
          query = query.is('batch_id', null)
        } else {
          query = query.eq('batch_id', batchFilter)
        }
      }
      
      // Apply pagination
      const { data: recentEntries, error } = await query.range(offset, offset + recordsPerPage - 1)
        
      if (error) throw error
      
      // Check if we have more records
      setHasMoreRecords(recentEntries && recentEntries.length === recordsPerPage)
      
      if (recentEntries && recentEntries.length > 0) {
          // Get machine names and current prices
          const machineIds = [...new Set(recentEntries.map(item => item.machine_id))]
          const { data: machineData, error: machineError } = await supabase
            .from("machines")
            .select("id, \"Machine Name\", \"Company\", Price, product_link, \"Affiliate Link\", \"Laser Power A\", \"LaserPower B\"")
            .in("id", machineIds)
          
          if (machineError) throw machineError
          
          // For each recent entry, process the data
          const combinedData = await Promise.all(recentEntries.map(async (entry) => {
            const machine = machineData?.find(m => m.id === entry.machine_id)
            
            // Use previous_price from the entry if available, otherwise calculate
            let previousPrice = entry.previous_price
            let priceChange = 0
            
            if (previousPrice !== null && previousPrice !== undefined) {
              priceChange = entry.price - previousPrice
            } else {
              // Fallback: Get previous price history entry for this machine
              const { data: prevEntries } = await supabase
                .from("price_history")
                .select("price")
                .eq("machine_id", entry.machine_id)
                .lt("date", entry.date)  // Entries before the current one
                .order("date", { ascending: false })
                .limit(1)
                
              previousPrice = prevEntries && prevEntries.length > 0 
                ? prevEntries[0].price 
                : entry.price
              priceChange = prevEntries && prevEntries.length > 0 
                ? entry.price - previousPrice
                : 0
            }
            
            // Format price change for display
            const priceChangeClass = priceChange > 0 
              ? 'text-red-500' 
              : priceChange < 0 
                ? 'text-green-500' 
                : ''
            
            // Calculate percentage change
            const percentageChange = previousPrice && previousPrice > 0 
              ? ((entry.price - previousPrice) / previousPrice) * 100
              : 0;

            return {
              id: entry.id,
              machine_id: entry.machine_id,
              recordedPrice: previousPrice, // Previous price
              price: entry.price,           // Price at time of update
              currentPrice: machine ? machine.Price : null, // Current price from machines table
              date: entry.date,
              is_all_time_low: entry.is_all_time_low,
              is_all_time_high: entry.is_all_time_high,
              status: entry.status,
              failure_reason: entry.failure_reason,
              review_result: entry.review_result,
              reviewed_by: entry.reviewed_by,
              batch_id: entry.batch_id,
              machineName: machine ? machine["Machine Name"] : "Unknown",
              company: machine ? machine["Company"] : "Unknown",
              productUrl: machine ? (machine.product_link || machine["Affiliate Link"]) : null,
              affiliateLink: machine ? machine["Affiliate Link"] : null,
              productLink: machine ? machine.product_link : null,
              laserPower: machine ? (machine["Laser Power A"] || "N/A") : "N/A",
              priceChange,
              priceChangeClass,
              percentageChange
            }
          }))
          
        // Combine and set the data
        if (append) {
          setRecentlyUpdated(prev => [...prev, ...combinedData])
        } else {
          setRecentlyUpdated(combinedData)
        }
      } else {
        if (!append) {
          setRecentlyUpdated([])
        }
        setHasMoreRecords(false)
      }
    } catch (error) {
      console.error("Error fetching recent updates:", error)
      if (!append) {
        setRecentlyUpdated([])
      }
    }
  }
  
  // Load more records
  const loadMoreRecords = async () => {
    if (loadingMore || !hasMoreRecords) return
    
    setLoadingMore(true)
    try {
      await fetchRecentlyUpdated(recentlyUpdated.length, true)
    } finally {
      setLoadingMore(false)
    }
  }
  
  useEffect(() => {
    fetchRecentlyUpdated()
  }, [refreshing, statusFilter, batchFilter])
  
  // Clear selection when data changes
  useEffect(() => {
    clearSelection()
  }, [recentlyUpdated])
  
  // Fetch batches with price history counts
  useEffect(() => {
    const fetchBatchesWithCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select(`
            id,
            start_time,
            end_time,
            total_machines,
            status
          `)
          .order('start_time', { ascending: false })
          .limit(20)
        
        if (error) throw error
        
        // Get price history counts for each batch
        const batchesWithCounts = await Promise.all(
          (data || []).map(async (batch) => {
            const { count } = await supabase
              .from('price_history')
              .select('*', { count: 'exact', head: true })
              .eq('batch_id', batch.id)
            
            return {
              ...batch,
              price_history_count: count || 0
            }
          })
        )
        
        setBatches(batchesWithCounts)
      } catch (error) {
        console.error('Error fetching batches:', error)
      }
    }
    
    fetchBatchesWithCounts()
  }, [refreshing])
  
  // Initial setup
  useEffect(() => {
    if (pythonApiReady) {
      previewBatchUpdate(daysThreshold, machineLimit, maxWorkers)
    }
  }, [pythonApiReady, daysThreshold, machineLimit, maxWorkers])
  
  
  // Handle price history modal
  const openPriceHistoryModal = (machine: any) => {
    setPriceHistoryMachine(machine)
    setPriceHistoryModalOpen(true)
  }
  
  // Handle machine price history modal
  const openMachineHistoryModal = async (machineId: string, machineName: string) => {
    setMachineHistoryLoading(true)
    setMachineHistoryModalOpen(true)
    
    try {
      const response = await fetch(`/api/price-history/machine/${machineId}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch price history')
      }
      
      setMachineHistoryData(result)
    } catch (error) {
      console.error('Error fetching machine price history:', error)
      toast.error(`Failed to fetch price history: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMachineHistoryModalOpen(false)
    } finally {
      setMachineHistoryLoading(false)
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
    previewBatchUpdate(daysThreshold, machineLimit, maxWorkers)
  }
  
  // Function to preview batch update (count of machines)
  const previewBatchUpdate = async (days: number, limit: number | null = null, workers: number = 3) => {
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
          limit: limit,
          max_workers: workers
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
          max_workers: maxWorkers,
          machine_ids: previewMachineIds, // Pass the machine IDs from preview
          use_scrapfly: useScrapfly // Add Scrapfly pipeline toggle
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
  
  // Function to approve a price change
  const approvePrice = async (recordId: string) => {
    try {
      const response = await fetch(`/api/price-history/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: recordId,
          action: "approve"
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to approve price change")
      }
      
      toast.success(`Price change approved: ${formatPrice(result.newPrice)}`)
      
      // Refresh data
      setRefreshing(prev => !prev)
      
    } catch (error) {
      console.error("Error approving price change:", error)
      toast.error(`Failed to approve price change: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  // Function to reject a price change
  const rejectPrice = async (recordId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/price-history/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: recordId,
          action: "reject",
          reviewReason: reason || "Manually rejected by admin"
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to reject price change")
      }
      
      toast.success("Price change rejected")
      
      // Refresh data
      setRefreshing(prev => !prev)
      
    } catch (error) {
      console.error("Error rejecting price change:", error)
      toast.error(`Failed to reject price change: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Function to open price correction dialog
  const openCorrectionDialog = (record: any) => {
    setCorrectionRecord(record)
    setCorrectPrice("") // Start with empty price for user input
    setCorrectionReason("")
    setCorrectionDialogOpen(true)
  }

  // Function to correct a price
  const submitPriceCorrection = async () => {
    if (!correctionRecord || !correctPrice) {
      toast.error("Please provide a correct price")
      return
    }

    const priceValue = parseFloat(correctPrice)
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Please provide a valid price")
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
      
      const response = await fetch(`${apiUrl}/api/v1/correct-price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_history_id: correctionRecord.id,
          correct_price: priceValue,
          corrected_by: "admin",
          reason: correctionReason || `User corrected price from ${formatPrice(correctionRecord.price)} to ${formatPrice(priceValue)}`
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || result.error || "Failed to correct price")
      }
      
      toast.success(`Price corrected: ${formatPrice(result.original_price)} → ${formatPrice(result.corrected_price)}`)
      
      // Close dialog and refresh data
      setCorrectionDialogOpen(false)
      setRefreshing(prev => !prev)
      
    } catch (error) {
      console.error("Error correcting price:", error)
      toast.error(`Failed to correct price: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Function to retest failed and manually corrected machines from a specific batch
  const retestFailedAndCorrectedMachines = async (batchId: string) => {
    try {
      if (!pythonApiReady || !window.priceTrackerAPI) {
        toast.error("Python Price Extractor API is not connected")
        return
      }

      // Get manually corrected machines from this batch
      const { data: correctedMachines, error: correctedError } = await supabase
        .from("price_history")
        .select("machine_id")
        .eq("batch_id", batchId)
        .eq("status", "MANUAL_CORRECTION")

      if (correctedError) throw correctedError

      const correctedMachineIds = [...new Set(correctedMachines?.map(m => m.machine_id) || [])]

      // Get failed machines by parsing the batch log
      let failedMachineIds: string[] = []
      try {
        const apiUrl = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/v1/batch-failures/${batchId}`)
        
        if (response.ok) {
          const data = await response.json()
          failedMachineIds = data.failed_machine_ids || []
        }
      } catch (error) {
        console.warn("Could not fetch failed machines from log, continuing with corrected machines only")
      }

      // Combine both lists and remove duplicates
      const allMachineIds = [...new Set([...correctedMachineIds, ...failedMachineIds])]

      if (allMachineIds.length === 0) {
        toast.info("No failed or manually corrected machines found in this batch")
        return
      }

      // Confirm with user
      const confirmed = window.confirm(
        `This will re-test ${allMachineIds.length} machines:\n` +
        `• ${correctedMachineIds.length} manually corrected machines\n` +
        `• ${failedMachineIds.length} completely failed machines\n\n` +
        `This will validate our systematic fixes work correctly. Continue?`
      )

      if (!confirmed) return

      // Start the batch retest
      toast.info(`Starting retest of ${allMachineIds.length} machines from batch ${batchId.slice(0, 8)}...`)

      const response = await fetch(`${process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'}/api/v1/batch-retest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          original_batch_id: batchId,
          machine_ids: allMachineIds,
          description: `Retest of failed and manually corrected machines from batch ${batchId.slice(0, 8)}`
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Retest batch started successfully! New batch ID: ${result.batch_id.slice(0, 8)}`)
        
        // Refresh data
        setRefreshing(prev => !prev)
      } else {
        throw new Error(result.error || "Failed to start retest batch")
      }

    } catch (error) {
      console.error("Error starting retest:", error)
      toast.error(`Failed to start retest: ${error instanceof Error ? error.message : "Unknown error"}`)
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
      
    } catch (error) {
      console.error("Error deleting price record:", error)
      toast.error(`Failed to delete price record: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  // Function to delete individual price history entry from the modal
  const deletePriceHistoryEntry = async (recordId: string) => {
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
      
      // Refresh the modal data
      if (machineHistoryData && machineHistoryData.machine) {
        await openMachineHistoryModal(machineHistoryData.machine.id, machineHistoryData.machine["Machine Name"])
      }
      
      // Also refresh the main data
      setRefreshing(prev => !prev)
      
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
        // Machine data will be refreshed via the refreshing state
      }
    } catch (error) {
      console.error("Error cleaning up price records:", error)
      toast.error(`Failed to clean up price records: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  // Helper function to determine if a record should be shown for email
  const shouldShowDealForEmail = (record: any) => {
    // Only show valid statuses (like the /deals page)
    const validStatuses = ['AUTO_APPLIED', 'MANUAL_CORRECTION', 'SUCCESS'];
    if (!validStatuses.includes(record.status)) return false;
    
    // Apply filters
    if (priceDropsOnly && record.priceChange >= 0) return false;
    
    // Ensure minimum 1% drop (like /deals page) if price drops only
    if (priceDropsOnly && Math.abs(record.percentageChange || 0) < 1) return false;
    
    // Apply user's minimum discount threshold
    if (Math.abs(record.percentageChange || 0) < parseInt(minDiscountThreshold)) return false;
    
    // All-time lows filter
    if (allTimeLowsOnly && !record.is_all_time_low) return false;
    
    // Check date range
    const recordDate = new Date(record.date);
    const daysAgo = parseInt(dateRangeFilter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    if (recordDate < cutoffDate) return false;
    
    // Validate deal is still active (current price hasn't gone back up)
    // Allow 1% tolerance for minor fluctuations
    if (priceDropsOnly && record.currentPrice && record.price) {
      if (record.currentPrice > record.price * 1.01) return false;
    }
    
    return true;
  };

  // Get filtered deals based on current filters
  const getFilteredDeals = () => {
    return recentlyUpdated.filter(shouldShowDealForEmail);
  };

  // Fetch ALL deals that match email filters (not limited to 50)
  const fetchEmailDeals = async () => {
    try {
      // Build query for email generation with all filters applied
      let query = supabase
        .from("price_history")
        .select(`
          id, 
          machine_id, 
          price, 
          previous_price, 
          date, 
          is_all_time_low, 
          is_all_time_high, 
          status,
          machines!inner (
            id,
            "Machine Name",
            "Company",
            "Price",
            "product_link",
            "Affiliate Link",
            "Laser Power A",
            "LaserPower B"
          )
        `)
        .in('status', ['AUTO_APPLIED', 'MANUAL_CORRECTION', 'SUCCESS'])
        .not('previous_price', 'is', null)
        .not('price', 'is', null);

      // Apply date range filter
      const daysAgo = parseInt(dateRangeFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      query = query.gte('date', cutoffDate.toISOString());

      // Apply all-time lows filter
      if (allTimeLowsOnly) {
        query = query.eq('is_all_time_low', true);
      }

      // Order by date descending
      query = query.order('date', { ascending: false });

      // Fetch up to 1000 records for email generation
      const { data, error } = await query.limit(1000);

      if (error) throw error;

      // Process and filter the results
      const processedDeals = data?.map(record => {
        // Skip records where price hasn't changed
        if (record.price === record.previous_price) {
          return null;
        }

        const priceChange = record.previous_price - record.price;
        const percentageChange = record.previous_price > 0 
          ? (priceChange / record.previous_price) * 100 
          : 0;

        // Apply price drops only filter
        if (priceDropsOnly && priceChange <= 0) {
          return null;
        }

        // Apply minimum discount filter
        if (Math.abs(percentageChange) < parseInt(minDiscountThreshold)) {
          return null;
        }

        // Apply 1% minimum for price drops
        if (priceDropsOnly && Math.abs(percentageChange) < 1) {
          return null;
        }

        // Validate deal is still active (current price hasn't gone back up)
        if (priceDropsOnly && record.machines.Price > record.price * 1.01) {
          return null;
        }

        return {
          id: record.id,
          machine_id: record.machine_id,
          machineName: record.machines["Machine Name"],
          company: record.machines["Company"],
          price: record.price,
          recordedPrice: record.previous_price,
          currentPrice: record.machines.Price,
          date: record.date,
          is_all_time_low: record.is_all_time_low,
          is_all_time_high: record.is_all_time_high,
          status: record.status,
          productLink: record.machines.product_link,
          productUrl: record.machines.product_link,
          affiliateLink: record.machines["Affiliate Link"],
          laserPower: record.machines["Laser Power A"] ? 
            (record.machines["LaserPower B"] ? 
              `${record.machines["Laser Power A"]}W / ${record.machines["LaserPower B"]}W` : 
              `${record.machines["Laser Power A"]}W`) : 
            record.machines["LaserPower B"] ? 
              `${record.machines["LaserPower B"]}W` : 
              "N/A",
          priceChange,
          percentageChange,
          priceChangeClass: priceChange > 0 ? 'text-red-500' : priceChange < 0 ? 'text-green-500' : ''
        };
      }).filter(Boolean) || [];

      return processedDeals;
    } catch (error) {
      console.error("Error fetching email deals:", error);
      toast.error("Failed to fetch deals for email");
      return [];
    }
  };

  // Effect to refetch email deals when filters change
  useEffect(() => {
    if (emailGenerationMode) {
      const refetchDeals = async () => {
        setLoadingEmailDeals(true);
        const deals = await fetchEmailDeals();
        console.log('Email deals fetched:', deals.length, 'deals');
        console.log('First few deals:', deals.slice(0, 3));
        setEmailDeals(deals);
        setLoadingEmailDeals(false);
        
        // Auto-select top 10 deals when first entering email mode
        if (deals.length > 0 && selectedDealsForEmail.size === 0) {
          const topDeals = deals.slice(0, Math.min(10, deals.length));
          console.log('Auto-selecting top deals:', topDeals.map(d => d.id));
          setSelectedDealsForEmail(new Set(topDeals.map(d => d.id)));
        }
      };
      refetchDeals();
    } else {
      // Clear email deals selection when exiting email mode
      setSelectedDealsForEmail(new Set());
    }
  }, [emailGenerationMode, priceDropsOnly, minDiscountThreshold, dateRangeFilter, allTimeLowsOnly]);

  // Generate email from selected deals
  const generateEmailFromSelected = async () => {
    const selectedDeals = emailDeals.filter(record => 
      selectedDealsForEmail.has(record.id)
    );

    if (selectedDeals.length === 0) {
      toast.error('No deals selected for email');
      return;
    }

    // Sort by percentage discount (biggest first)
    selectedDeals.sort((a, b) => (a.percentageChange || 0) - (b.percentageChange || 0));

    // Calculate stats
    const stats = {
      totalDeals: selectedDeals.length,
      totalSavings: selectedDeals.reduce((sum, deal) => sum + Math.abs(deal.priceChange || 0), 0),
      avgDiscount: Math.round(selectedDeals.reduce((sum, deal) => sum + Math.abs(deal.percentageChange || 0), 0) / selectedDeals.length),
      allTimeLows: selectedDeals.filter(deal => deal.is_all_time_low).length
    };

    setEmailStats(stats);

    // Generate subject line
    const topDeal = selectedDeals[0];
    if (topDeal) {
      const discount = Math.abs(topDeal.percentageChange || 0).toFixed(0);
      setSubjectLine(`🔥 ${topDeal.company} ${topDeal.machineName} now ${discount}% off (+ ${stats.totalDeals - 1} more deals)`);
      setPreviewText(`Save up to $${Math.abs(topDeal.priceChange || 0).toLocaleString()} on laser cutters this week`);
    }

    // Generate email HTML
    const html = generateEmailHtml(selectedDeals, stats);
    setEmailHtml(html);

    // Switch to email template tab
    const emailTab = document.querySelector('[data-value="email-template"]') as HTMLElement;
    if (emailTab) {
      emailTab.click();
    } else {
      // If direct click doesn't work, try setting the tab value
      const tabsRoot = document.querySelector('[role="tablist"]');
      if (tabsRoot) {
        // Find the Email Template tab button
        const emailTabButton = Array.from(tabsRoot.querySelectorAll('button')).find(
          btn => btn.textContent?.includes('Email Template')
        );
        if (emailTabButton) {
          emailTabButton.click();
        }
      }
    }
    
    toast.success('Email generated! Check the Email Template tab.');
  };

  // Generate email HTML
  const generateEmailHtml = (deals: any[], stats: any) => {
    const heroItem = deals[0];
    const additionalItems = deals.slice(1, 10);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>This Week's Laser Cutter Deals</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background-color: #1a1a1a; color: #ffffff; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Machines for Makers</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">This Week's Best Deals</p>
        </div>

        <!-- Stats Bar -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="text-align: center; padding: 0 10px;">
                        <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${stats.totalDeals}</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Total Deals</div>
                    </td>
                    <td style="text-align: center; padding: 0 10px;">
                        <div style="font-size: 24px; font-weight: bold; color: #059669;">$${stats.totalSavings.toLocaleString()}</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Total Savings</div>
                    </td>
                    <td style="text-align: center; padding: 0 10px;">
                        <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${stats.avgDiscount}%</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Avg Discount</div>
                    </td>
                    ${stats.allTimeLows > 0 ? `
                    <td style="text-align: center; padding: 0 10px;">
                        <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">${stats.allTimeLows}</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">All-Time Lows</div>
                    </td>
                    ` : ''}
                </tr>
            </table>
        </div>

        <!-- Hero Deal -->
        ${heroItem ? `
        <div style="padding: 40px 20px; background-color: #fef3c7; border-radius: 8px; margin: 20px;">
            <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #92400e;">🔥 BIGGEST DISCOUNT THIS WEEK</h2>
            <h3 style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold;">
                ${heroItem.company} ${heroItem.machineName}
            </h3>
            <div style="margin-bottom: 20px;">
                <span style="font-size: 32px; font-weight: bold; color: #dc2626;">
                    $${heroItem.price ? heroItem.price.toLocaleString() : 'N/A'}
                </span>
                <span style="font-size: 18px; color: #6b7280; text-decoration: line-through; margin-left: 10px;">
                    $${heroItem.recordedPrice ? heroItem.recordedPrice.toLocaleString() : 'N/A'}
                </span>
                <span style="display: inline-block; background-color: #dc2626; color: white; padding: 4px 12px; border-radius: 4px; margin-left: 10px; font-weight: bold;">
                    ${Math.abs(heroItem.percentageChange || 0).toFixed(0)}% OFF
                </span>
                ${heroItem.is_all_time_low ? '<span style="display: inline-block; background-color: #059669; color: white; padding: 4px 12px; border-radius: 4px; margin-left: 10px; font-weight: bold;">ALL-TIME LOW</span>' : ''}
            </div>
            <a href="${heroItem.affiliateLink || heroItem.productLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Deal →
            </a>
        </div>
        ` : ''}

        <!-- Additional Deals -->
        ${additionalItems.length > 0 ? `
        <div style="padding: 20px;">
            <h2 style="font-size: 22px; margin-bottom: 20px;">More Great Deals</h2>
            ${additionalItems.map(item => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; font-size: 18px;">
                    ${item.company} ${item.machineName}
                </h3>
                <div style="margin-bottom: 15px;">
                    <span style="font-size: 24px; font-weight: bold; color: #2563eb;">
                        $${item.price ? item.price.toLocaleString() : 'N/A'}
                    </span>
                    <span style="font-size: 16px; color: #6b7280; text-decoration: line-through; margin-left: 10px;">
                        $${item.recordedPrice ? item.recordedPrice.toLocaleString() : 'N/A'}
                    </span>
                    <span style="display: inline-block; background-color: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; margin-left: 10px; font-size: 14px; font-weight: bold;">
                        ${Math.abs(item.percentageChange || 0).toFixed(0)}% OFF
                    </span>
                    ${item.is_all_time_low ? '<span style="display: inline-block; background-color: #059669; color: white; padding: 2px 8px; border-radius: 4px; margin-left: 10px; font-size: 14px; font-weight: bold;">ALL-TIME LOW</span>' : ''}
                </div>
                <a href="${item.affiliateLink || item.productLink}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                    View Deal →
                </a>
            </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; margin-top: 40px;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                You're receiving this because you signed up for deal alerts at Machines for Makers.
            </p>
            <p style="margin: 0; font-size: 14px;">
                <a href="https://www.machinesformakers.com/deals" style="color: #2563eb; text-decoration: none;">View all deals</a> • 
                <a href="{{unsubscribe_url}}" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  };

  // Bulk selection functions
  const handleRecordSelection = (recordId: string, index: number, event: React.MouseEvent) => {
    const newSelected = new Set(selectedRecords)
    
    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift-click: select range
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      
      for (let i = start; i <= end; i++) {
        if (recentlyUpdated[i]) {
          newSelected.add(recentlyUpdated[i].id)
        }
      }
    } else {
      // Regular click: toggle single selection
      if (newSelected.has(recordId)) {
        newSelected.delete(recordId)
      } else {
        newSelected.add(recordId)
      }
    }
    
    setSelectedRecords(newSelected)
    setLastSelectedIndex(index)
  }
  
  const selectAllRecords = () => {
    const newSelected = new Set(recentlyUpdated.map(record => record.id))
    setSelectedRecords(newSelected)
  }
  
  const clearSelection = () => {
    setSelectedRecords(new Set())
    setLastSelectedIndex(null)
  }
  
  const batchApprove = async () => {
    if (selectedRecords.size === 0) return
    
    const recordsToApprove = recentlyUpdated.filter(record => 
      selectedRecords.has(record.id) && record.status === 'PENDING_REVIEW'
    )
    
    if (recordsToApprove.length === 0) {
      toast.error("No pending review records selected")
      return
    }
    
    const confirmed = window.confirm(
      `Approve ${recordsToApprove.length} price changes?\n\n` +
      recordsToApprove.slice(0, 5).map(r => 
        `• ${r.machineName}: ${formatPrice(r.recordedPrice)} → ${formatPrice(r.price)}`
      ).join('\n') +
      (recordsToApprove.length > 5 ? `\n...and ${recordsToApprove.length - 5} more` : '')
    )
    
    if (!confirmed) return
    
    setBatchActionLoading(true)
    
    try {
      const response = await fetch('/api/price-history/batch-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordIds: recordsToApprove.map(r => r.id)
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process batch approval')
      }
      
      // Show detailed results
      const { results } = result
      if (results.successful.length > 0) {
        toast.success(`Successfully approved ${results.successful.length} price changes`)
      }
      if (results.failed.length > 0) {
        toast.error(`Failed to approve ${results.failed.length} price changes`)
      }
      if (results.skipped.length > 0) {
        toast.info(`Skipped ${results.skipped.length} records (not pending review)`)
      }
      
      clearSelection()
      // Single refresh after all operations complete
      setRefreshing(prev => !prev)
    } catch (error) {
      console.error("Batch approve error:", error)
      toast.error(`Failed to process batch approval: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setBatchActionLoading(false)
    }
  }
  
  const batchDelete = async () => {
    if (selectedRecords.size === 0) return
    
    const confirmed = window.confirm(
      `Delete ${selectedRecords.size} price records?\n\nThis action cannot be undone.`
    )
    
    if (!confirmed) return
    
    setBatchActionLoading(true)
    
    try {
      const response = await fetch('/api/price-history/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordIds: Array.from(selectedRecords)
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process batch deletion')
      }
      
      toast.success(`Successfully deleted ${result.deletedCount} price records`)
      
      clearSelection()
      // Single refresh after all operations complete
      setRefreshing(prev => !prev)
    } catch (error) {
      console.error("Batch delete error:", error)
      toast.error(`Failed to process batch deletion: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setBatchActionLoading(false)
    }
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    // Parse the UTC timestamp and display in local timezone
    const date = new Date(dateString)
    console.log('Date parsing:', dateString, '->', date.toString(), 'Local:', date.toLocaleString())
    return format(date, "MMM d, yyyy h:mm a")
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
  const getBatchStatusBadge = (status: string, hasIssues: boolean = false) => {
    switch (status.toLowerCase()) {
      case 'completed':
        if (hasIssues) {
          return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⚠️ Completed (Blocked)</Badge>
        }
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
                              {typeof debugInfo.details.percentageChange === 'number' && 
                               !isNaN(debugInfo.details.percentageChange) && (
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
                    previewBatchUpdate(newValue, machineLimit, maxWorkers)
                  }}
                  className="w-20"
                />
                <span>days</span>
              </div>
              <p className="text-sm text-gray-500">
                Set to 0 to update all machines regardless of last update time.
                Note: Machines are considered "needing update" if their html_timestamp is older than this threshold.
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
                  previewBatchUpdate(daysThreshold, limit, maxWorkers)
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
            
            <div className="space-y-2">
              <Label htmlFor="max-workers">Max Workers (Concurrent Processing):</Label>
              <Select 
                value={maxWorkers.toString()} 
                defaultValue="3"
                onValueChange={(value) => {
                  const workers = parseInt(value)
                  setMaxWorkers(workers)
                  previewBatchUpdate(daysThreshold, machineLimit, workers)
                }}
              >
                <SelectTrigger id="max-workers" className="w-full">
                  <SelectValue placeholder="Select workers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 worker (slowest, safest)</SelectItem>
                  <SelectItem value="2">2 workers</SelectItem>
                  <SelectItem value="3">3 workers (recommended)</SelectItem>
                  <SelectItem value="4">4 workers</SelectItem>
                  <SelectItem value="5">5 workers</SelectItem>
                  <SelectItem value="6">6 workers</SelectItem>
                  <SelectItem value="8">8 workers (optimal for Scrapfly)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Number of machines to process simultaneously. Higher values are faster but may trigger rate limits on some websites.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    🚀 Scrapfly Pipeline Active
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Advanced anti-bot protection with 98.8% success rate. Tiered credit system optimized for reliable extraction.
                </p>
              </div>
            </div>
            
            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-1">Machines to update:</h4>
              {batchPreviewLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-500">Loading preview...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm">
                    {batchPreviewCount === null 
                      ? "Loading..."
                      : batchPreviewCount === 0 
                        ? "No machines found needing price checks."
                        : `${batchPreviewCount} machine${batchPreviewCount === 1 ? '' : 's'} need price checks.`
                    }
                  </p>
                  {batchPreviewCount !== null && batchPreviewCount > 0 && (
                    <p className="text-xs text-gray-500">
                      This shows machines whose prices haven't changed within {daysThreshold} days. 
                      Many machines may have been checked recently but had no price changes.
                      The actual batch will process up to {machineLimit || 'all'} of these machines using {maxWorkers} concurrent worker{maxWorkers === 1 ? '' : 's'}.
                    </p>
                  )}
                </div>
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
              Start Price Check
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Price History Modal */}
      <Dialog open={priceHistoryModalOpen} onOpenChange={setPriceHistoryModalOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {priceHistoryMachine ? `${priceHistoryMachine["Machine Name"]} - Price History` : "Price History"}
            </DialogTitle>
            <DialogDescription>
              {priceHistoryMachine ? `Current price: ${formatPrice(priceHistoryMachine["Price"])}` : "View price history and trends"}
            </DialogDescription>
          </DialogHeader>
          
          {priceHistoryMachine && (
            <div className="overflow-y-auto">
              <PriceHistoryChart 
                machineId={priceHistoryMachine.id}
                currentPrice={priceHistoryMachine["Price"] || 0}
                compact={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Machine Price History Management Modal */}
      <Dialog open={machineHistoryModalOpen} onOpenChange={setMachineHistoryModalOpen}>
        <DialogContent className="max-w-7xl w-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {machineHistoryData?.machine ? `${machineHistoryData.machine["Machine Name"]} - All Price History` : "Price History Management"}
            </DialogTitle>
            <DialogDescription>
              {machineHistoryData?.machine ? 
                `Current price: ${formatPrice(machineHistoryData.machine["Price"])} • Company: ${machineHistoryData.machine["Company"]} • Total records: ${machineHistoryData?.totalRecords || 0}` :
                "View and manage all price history entries for this machine"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh]">
            {machineHistoryLoading ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : machineHistoryData?.priceHistory?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No price history found for this machine</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead className="w-24">Price</TableHead>
                      <TableHead className="w-36">Status</TableHead>
                      <TableHead className="w-24">Batch ID</TableHead>
                      <TableHead className="min-w-0 flex-1">Notes</TableHead>
                      <TableHead className="w-20 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machineHistoryData?.priceHistory?.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{format(new Date(record.date), "MMM d, yyyy")}</span>
                            <span className="text-sm text-gray-500">{format(new Date(record.date), "h:mm a")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {formatPrice(record.price)}
                            {record.is_all_time_low && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                ATL
                              </Badge>
                            )}
                            {record.is_all_time_high && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                ATH
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {record.status === 'PENDING_REVIEW' && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                Pending Review
                              </Badge>
                            )}
                            {record.status === 'AUTO_APPLIED' && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Auto-Applied
                              </Badge>
                            )}
                            {record.status === 'SUCCESS' && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Manually Approved
                              </Badge>
                            )}
                            {record.status === 'MANUAL_CORRECTION' && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Manually Corrected
                              </Badge>
                            )}
                            {record.status === 'REVIEWED' && record.review_result === 'approved' && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Approved & Applied
                              </Badge>
                            )}
                            {record.status === 'REVIEWED' && record.review_result === 'rejected' && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                Rejected
                              </Badge>
                            )}
                            {record.status === 'FAILED' && (
                              <Badge 
                                variant="outline" 
                                className="bg-red-50 text-red-700 border-red-200 cursor-help"
                                title={record.failure_reason || 'No failure reason available'}
                              >
                                Failed{record.failure_reason ? `: ${record.failure_reason.length > 20 ? record.failure_reason.substring(0, 20) + '...' : record.failure_reason}` : ''}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-24">
                          {record.batch_id ? (
                            <span className="font-mono text-xs">{record.batch_id.slice(0, 8)}...</span>
                          ) : (
                            <span className="text-gray-400 text-sm">No batch</span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-0 flex-1">
                          <div className="text-sm space-y-1 break-words">
                            {record.failure_reason && (
                              <div className="text-red-600">
                                <span className="font-medium">Error:</span> {record.failure_reason}
                              </div>
                            )}
                            {record.review_reason && (
                              <div className="text-gray-600">
                                <span className="font-medium">Review:</span> {record.review_reason}
                              </div>
                            )}
                            {record.reviewed_by && (
                              <div className="text-gray-500">
                                Reviewed by {record.reviewed_by} on {format(new Date(record.reviewed_at), "MMM d, h:mm a")}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete this price record?\n\nPrice: ${formatPrice(record.price)}\nDate: ${format(new Date(record.date), "MMM d, yyyy h:mm a")}\nStatus: ${record.status}`)) {
                                deletePriceHistoryEntry(record.id)
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
            )}
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
          <TabsTrigger value="email-template">Email Template</TabsTrigger>
        </TabsList>
        
        <TabsContent value="machines" className="space-y-4">
          <Card className="col-span-3">
            <CardHeader className="space-y-4">
              <CardTitle>Machines</CardTitle>
              <CardDescription>
                View and manage price history for machines. {machines.length} machines in database.
              </CardDescription>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured-filter"
                  checked={filterFeatured}
                  onCheckedChange={setFilterFeatured}
                />
                <Label htmlFor="featured-filter">Show featured machines only</Label>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <DataTable 
                  columns={createMachineColumns(openPriceHistoryModal, updatePrice, openMachineHistoryModal)} 
                  data={machines}
                  filterableColumns={[
                    {
                      id: "Company",
                      title: "Brand",
                      options: getBrandFilterOptions(machines),
                    },
                  ]}
                  searchableColumns={[
                    {
                      id: "Machine Name",
                      title: "machine name",
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recent">
          <Card className={emailGenerationMode ? "border-blue-500 shadow-lg" : ""}>
            <CardHeader className={emailGenerationMode ? "border-b-2 border-blue-500" : ""}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Price Updates</CardTitle>
                  <CardDescription>
                    {emailGenerationMode 
                      ? "Select deals below to include in your weekly email digest (showing all price history records)"
                      : "The 50 most recent price updates across all machines."}
                  </CardDescription>
                </div>
                <Button
                  variant="outline" 
                  onClick={() => setRefreshing(prev => !prev)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="status-filter">Filter by Status:</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                      <SelectItem value="AUTO_APPLIED">Auto-Applied</SelectItem>
                      <SelectItem value="SUCCESS">Manually Approved</SelectItem>
                      <SelectItem value="MANUAL_CORRECTION">Manually Corrected</SelectItem>
                      <SelectItem value="REVIEWED_APPROVED">Approved & Applied</SelectItem>
                      <SelectItem value="REVIEWED_REJECTED">Rejected</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="batch-filter">Filter by Batch:</Label>
                  <Select value={batchFilter} onValueChange={setBatchFilter}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="All batches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      <SelectItem value="no-batch">No Batch ID</SelectItem>
                      {batches.filter(batch => batch.price_history_count > 0).map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.id.slice(0, 8)}... ({format(new Date(batch.start_time), "MMM d, h:mm a")}) - {batch.price_history_count} records
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Retest Failed & Corrected Button - only show when specific batch is selected */}
                {batchFilter !== "all" && batchFilter !== "no-batch" && (
                  <Button
                    variant="outline"
                    className="bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={() => retestFailedAndCorrectedMachines(batchFilter)}
                    disabled={!pythonApiReady}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Re-test Failed & Corrected Machines
                  </Button>
                )}
              </div>
              
              {/* Email Generation Mode Toggle */}
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="email-mode"
                      checked={emailGenerationMode}
                      onCheckedChange={async (checked) => {
                        setEmailGenerationMode(checked);
                        if (!checked) {
                          setSelectedDealsForEmail(new Set());
                          setEmailDeals([]);
                        } else {
                          // Fetch all deals that match email filters
                          setLoadingEmailDeals(true);
                          const deals = await fetchEmailDeals();
                          setEmailDeals(deals);
                          setLoadingEmailDeals(false);
                        }
                      }}
                    />
                    <Label htmlFor="email-mode" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">Email Generation Mode</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enable to select deals for your weekly digest
                      </p>
                    </Label>
                  </div>
                  
                  {emailGenerationMode && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={generateEmailFromSelected}
                      disabled={selectedDealsForEmail.size === 0}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Generate Email ({selectedDealsForEmail.size} deals)
                    </Button>
                  )}
                </div>
                
                {/* Email Filters - Only show when in email mode */}
                {emailGenerationMode && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Deal Selection Filters</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDealsForEmail(new Set(emailDeals.map(d => d.id)));
                          }}
                        >
                          Select All Matching ({emailDeals.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDealsForEmail(new Set())}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="price-drops-only" className="text-sm font-normal">
                            Show only price drops
                          </Label>
                          <Switch
                            id="price-drops-only"
                            checked={priceDropsOnly}
                            onCheckedChange={setPriceDropsOnly}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="all-time-lows" className="text-sm font-normal">
                            Show only all-time lows
                          </Label>
                          <Switch
                            id="all-time-lows"
                            checked={allTimeLowsOnly}
                            onCheckedChange={setAllTimeLowsOnly}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="min-discount" className="text-sm">Minimum discount</Label>
                          <Select value={minDiscountThreshold} onValueChange={setMinDiscountThreshold}>
                            <SelectTrigger id="min-discount" className="w-full mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5% or more</SelectItem>
                              <SelectItem value="10">10% or more</SelectItem>
                              <SelectItem value="15">15% or more</SelectItem>
                              <SelectItem value="20">20% or more</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="date-range" className="text-sm">Date range</Label>
                          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                            <SelectTrigger id="date-range" className="w-full mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">Last 7 days</SelectItem>
                              <SelectItem value="10">Last 10 days</SelectItem>
                              <SelectItem value="14">Last 14 days</SelectItem>
                              <SelectItem value="30">Last 30 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        {loadingEmailDeals ? 'Loading deals...' : `${emailDeals.length} deals match your filters`} • {selectedDealsForEmail.size} selected for email
                      </p>
                      {emailDeals.length > 0 && selectedDealsForEmail.size === 0 && (
                        <p className="text-sm text-amber-600 font-medium mt-1">
                          ⚠️ Please select deals using the checkboxes or click "Select All Matching" above
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Note: This shows all price history records from the entire database. The public /deals page deduplicates to show only the most recent drop per machine.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Bulk action controls */}
              {selectedRecords.size > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearSelection}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={batchApprove}
                      disabled={batchActionLoading}
                    >
                      {batchActionLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Batch Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={batchDelete}
                      disabled={batchActionLoading}
                    >
                      {batchActionLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Batch Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedRecords.size === recentlyUpdated.length && recentlyUpdated.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                selectAllRecords()
                              } else {
                                clearSelection()
                              }
                            }}
                          />
                        </div>
                      </TableHead>
                      {emailGenerationMode && (
                        <TableHead className="w-12">
                          <Mail className="h-4 w-4" title="Email Selection" />
                        </TableHead>
                      )}
                      <TableHead>Machine</TableHead>
                      <TableHead>Wattage</TableHead>
                      <TableHead>Previous Price</TableHead>
                      <TableHead>New Price</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Product URL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(emailGenerationMode ? emailDeals : recentlyUpdated).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={emailGenerationMode ? 10 : 9} className="text-center py-8">
                          {emailGenerationMode 
                            ? (loadingEmailDeals ? "Loading deals..." : "No deals found matching your filters. Try adjusting the date range, discount threshold, or other filters.")
                            : (statusFilter === "all" ? "No recent updates found." : `No updates found with status: ${statusFilter}`)}
                        </TableCell>
                      </TableRow>
                    ) : (
                      (emailGenerationMode ? emailDeals : recentlyUpdated).map((record, index) => (
                        <TableRow 
                          key={`${record.machine_id}-${index}`}
                          className={`cursor-pointer ${selectedRecords.has(record.id) ? 'bg-blue-50' : ''}`}
                          onClick={(e) => {
                            // Don't trigger selection if clicking on buttons or links
                            if (e.target instanceof HTMLElement && 
                                (e.target.closest('button') || e.target.closest('a'))) {
                              return
                            }
                            handleRecordSelection(record.id, index, e)
                          }}
                        >
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedRecords.has(record.id)}
                              onCheckedChange={(checked) => {
                                // Create a synthetic event to maintain compatibility
                                const syntheticEvent = {
                                  shiftKey: false,
                                  stopPropagation: () => {}
                                } as React.MouseEvent
                                handleRecordSelection(record.id, index, syntheticEvent)
                              }}
                            />
                          </TableCell>
                          {emailGenerationMode && (
                            <TableCell className="w-12">
                              <Checkbox
                                checked={selectedDealsForEmail.has(record.id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedDealsForEmail)
                                  if (checked) {
                                    newSelected.add(record.id)
                                  } else {
                                    newSelected.delete(record.id)
                                  }
                                  setSelectedDealsForEmail(newSelected)
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="font-medium">{record.machineName}</span>
                              <span className="text-sm text-gray-500">{record.company}</span>
                            </div>
                          </TableCell>
                          <TableCell>{record.laserPower}</TableCell>
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
                            <div className="flex flex-col gap-1">
                              {/* Status badge */}
                              {record.status === 'PENDING_REVIEW' && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Pending Review
                                </Badge>
                              )}
                              {record.status === 'AUTO_APPLIED' && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Auto-Applied
                                </Badge>
                              )}
                              {record.status === 'SUCCESS' && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Manually Approved
                                </Badge>
                              )}
                              {record.status === 'MANUAL_CORRECTION' && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  Manually Corrected
                                </Badge>
                              )}
                              {record.status === 'REVIEWED' && record.review_result === 'approved' && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Approved & Applied
                                </Badge>
                              )}
                              {record.status === 'REVIEWED' && record.review_result === 'rejected' && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  Rejected
                                </Badge>
                              )}
                              {record.status === 'REVIEWED' && !record.review_result && (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                  Reviewed (Unknown)
                                </Badge>
                              )}
                              {record.status === 'FAILED' && record.failure_reason && !record.failure_reason.includes('Pending review') && (
                                <Badge 
                                  variant="outline" 
                                  className="bg-red-50 text-red-700 border-red-200 cursor-help"
                                  title={record.failure_reason}
                                >
                                  Failed: {record.failure_reason.length > 30 ? record.failure_reason.substring(0, 30) + '...' : record.failure_reason}
                                </Badge>
                              )}
                              
                              {/* Price achievement badges */}
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
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.productUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => window.open(record.productUrl, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">No URL</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {/* View Price History button */}
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => openMachineHistoryModal(record.machine_id, record.machineName)}
                              >
                                <LineChart className="w-4 h-4 mr-1" />
                                History
                              </Button>
                              
                              {/* Show approve/reject buttons for records pending review */}
                              {record.status === 'PENDING_REVIEW' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                      if (window.confirm(`Approve price change: ${formatPrice(record.recordedPrice)} → ${formatPrice(record.price)}?`)) {
                                        approvePrice(record.id)
                                      }
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                </>
                              )}
                              
                              {/* Show Correct Price button for all statuses */}
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                onClick={() => openCorrectionDialog(record)}
                              >
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Correct Price
                              </Button>
                              
                              {/* Individual Update Price button */}
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => updatePrice({ 
                                  id: record.machine_id, 
                                  "Machine Name": record.machineName 
                                })}
                                disabled={!pythonApiReady}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Update
                              </Button>
                              
                              {/* Always show delete button */}
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {hasMoreRecords && (
                  <Button
                    variant="outline"
                    onClick={loadMoreRecords}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>Load More Records</>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {emailGenerationMode 
                    ? `Showing ${getFilteredDeals().length} of ${recentlyUpdated.length} records matching email filters`
                    : `Showing ${recentlyUpdated.length} records${hasMoreRecords ? ' (more available)' : ''}`}
                </span>
                
                <Button
                  variant="secondary"
                  onClick={cleanupInvalidPrices}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Clean Invalid Records
                </Button>
              </div>
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
                      <TableHead>Issues</TableHead>
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
                          <TableCell>{getBatchStatusBadge(batch.status, batch.has_issues || batch.variant_blocked)}</TableCell>
                          <TableCell>{batch.total_machines || 'N/A'}</TableCell>
                          <TableCell>
                            {batch.variant_blocked ? (
                              <div className="flex items-center space-x-1">
                                <Badge variant="destructive" className="text-xs">
                                  🚫 Variant Issues
                                </Badge>
                                {batch.variant_alerts && batch.variant_alerts.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({batch.variant_alerts.length} alerts)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </TableCell>
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
              {priceHistoryMachine ? (
                <div className="max-w-xl mx-auto">
                  <PriceHistoryChart 
                    machineId={priceHistoryMachine.id}
                    currentPrice={priceHistoryMachine["Price"] || 0}
                  />
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <LineChart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="mb-4">Click "History" on any machine to preview its price history chart.</p>
                  <Button variant="outline" onClick={() => {
                    const tabsElement = document.querySelector('[data-value="machines"]') as HTMLElement;
                    if (tabsElement) tabsElement.click();
                  }}>
                    Go to Machines
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email-template">
          <Card>
            <CardHeader>
              <CardTitle>Email Template</CardTitle>
              <CardDescription>
                Generated email template for your weekly deal digest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {emailHtml ? (
                <>
                  {/* Email Info */}
                  <div className="space-y-4">
                    <div>
                      <Label>Subject Line</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(subjectLine);
                            toast.success('Subject line copied!');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Preview Text</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(previewText);
                            toast.success('Preview text copied!');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Email Stats */}
                  {emailStats && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Email Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Deals:</span>
                          <span className="ml-2 font-semibold">{emailStats.totalDeals}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Savings:</span>
                          <span className="ml-2 font-semibold">${emailStats.totalSavings.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Discount:</span>
                          <span className="ml-2 font-semibold">{emailStats.avgDiscount}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">All-time Lows:</span>
                          <span className="ml-2 font-semibold">{emailStats.allTimeLows}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email Actions */}
                  <div className="flex gap-4">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(emailHtml);
                        setCopied(true);
                        toast.success('Email HTML copied to clipboard!');
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy HTML
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Switch to recent updates tab
                        const recentTab = document.querySelector('[data-value="recent"]') as HTMLElement;
                        if (recentTab) recentTab.click();
                      }}
                    >
                      Back to Deal Selection
                    </Button>
                  </div>

                  {/* Email Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Email Preview</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const previewWindow = window.open('', '_blank');
                          if (previewWindow) {
                            previewWindow.document.write(emailHtml);
                            previewWindow.document.close();
                          }
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 p-2 border-b">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                      </div>
                      <div className="bg-white p-4">
                        <iframe
                          srcDoc={emailHtml}
                          className="w-full h-[600px] border-0"
                          title="Email Preview"
                        />
                      </div>
                    </div>
                  </div>

                  {/* HTML Source */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">HTML Source</h4>
                    <Textarea
                      value={emailHtml}
                      onChange={(e) => setEmailHtml(e.target.value)}
                      className="font-mono text-xs"
                      rows={10}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="mb-4">No email generated yet</p>
                  <p className="text-sm mb-4">Select deals from the Recent Updates tab and click "Generate Email"</p>
                  <Button variant="outline" onClick={() => {
                    const recentTab = document.querySelector('[data-value="recent"]') as HTMLElement;
                    if (recentTab) recentTab.click();
                  }}>
                    Go to Recent Updates
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* COMPLETELY REBUILT PRICE CORRECTION DIALOG */}
      {correctionDialogOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Correct Price
            </h2>
            
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              Correct the price for this machine. This will update both the price history and the current machine price.
            </p>
            
            {correctionRecord && (
              <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>Current Record:</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <div>Machine: {correctionRecord.machineName}</div>
                  <div>Extracted Price: {formatPrice(correctionRecord.price)}</div>
                  <div>Method: {correctionRecord.extractionMethod || 'Unknown'}</div>
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Correct Price
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter correct price"
                value={correctPrice}
                onChange={(e) => setCorrectPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Reason (optional)
              </label>
              <textarea
                placeholder="Why was the extracted price wrong?"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCorrectionDialogOpen(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitPriceCorrection}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ea580c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Submit Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 