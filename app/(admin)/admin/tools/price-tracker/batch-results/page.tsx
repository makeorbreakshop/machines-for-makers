"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { format, formatDistanceToNow } from "date-fns"
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
  Info,
  Clock,
  ExternalLink
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"

type BatchStatus = 'running' | 'completed' | 'failed' | 'cancelled'

interface BatchJob {
  id: string
  status: BatchStatus
  start_time: string
  end_time: string | null
  total_machines: number
  days_threshold: number
  created_by?: string
  batch_type?: string
}

export default function BatchJobsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [batches, setBatches] = useState<BatchJob[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBatches()
  }, [])

  async function fetchBatches() {
    try {
      if (refreshing) return

      setLoading(prevLoading => !batches.length || prevLoading)
      setRefreshing(!!batches.length)
      setError(null)

      const response = await fetch("/api/v1/batches")
      
      if (!response.ok) {
        throw new Error(`Error fetching batches: ${response.statusText}`)
      }
      
      const data = await response.json()
      setBatches(data)
    } catch (err) {
      console.error("Failed to fetch batches", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleRefresh() {
    fetchBatches()
  }

  function handleViewBatch(batchId: string) {
    router.push(`/admin/tools/price-tracker/batch-results/${batchId}`)
  }

  // Function to format duration
  function formatDuration(startTime: string, endTime: string | null) {
    if (!endTime) return "Running"
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMs = end.getTime() - start.getTime()
    
    const seconds = Math.floor(durationMs / 1000) % 60
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Batch Jobs</h1>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      
      <div className="rounded-md border">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No batch jobs found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Batch ID</TableHead>
                <TableHead className="text-center">Machines</TableHead>
                <TableHead className="text-center">Started</TableHead>
                <TableHead className="text-center">Duration</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <StatusBadge status={batch.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {batch.id}
                  </TableCell>
                  <TableCell className="text-center">
                    {batch.total_machines}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center text-sm">
                      <span>{format(new Date(batch.start_time), "MMM d, yyyy")}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(batch.start_time), { addSuffix: true })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center text-sm">
                      <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span>{formatDuration(batch.start_time, batch.end_time)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">
                      {batch.batch_type || (batch.days_threshold === 0 ? "Manual" : "Auto")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewBatch(batch.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Results
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: BatchStatus }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default"
  
  switch (status) {
    case 'completed':
      variant = "default"
      break
    case 'running':
      variant = "secondary"
      break
    case 'failed':
      variant = "destructive"
      break
    case 'cancelled':
      variant = "outline"
      break
  }
  
  return (
    <Badge variant={variant}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
} 