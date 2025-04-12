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
import { format } from "date-fns"
import { toast } from "sonner"
import { Check, RefreshCw, Rocket, LineChart, Trash2, AlertCircle, Bug, XCircle } from "lucide-react"
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
        const { data, error } = await supabase
          .from("price_history")
          .select("machine_id, price, date, is_all_time_low, is_all_time_high")
          .order("date", { ascending: false })
          .limit(10)
        
        if (error) throw error
        
        if (data) {
          // Fetch machine names for the IDs
          const machineIds = [...new Set(data.map(item => item.machine_id))]
          const { data: machineData, error: machineError } = await supabase
            .from("machines")
            .select("id, \"Machine Name\", \"Company\", Price")
            .in("id", machineIds)
          
          if (machineError) throw machineError
          
          // Combine data
          const combined = data.map(priceRecord => {
            const machine = machineData?.find(m => m.id === priceRecord.machine_id)
            return {
              ...priceRecord,
              machineName: machine ? machine["Machine Name"] : "Unknown",
              company: machine ? machine["Company"] : "Unknown",
              currentPrice: machine ? machine["Price"] : null
            }
          })
          
          setRecentlyUpdated(combined)
        }
      } catch (error) {
        console.error("Error fetching recent updates:", error)
      }
    }
    
    fetchRecentlyUpdated()
  }, [refreshing])
  
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
      
      const response = await fetch(`/api/cron/update-prices/manual?machineId=${machine.id}${debug ? '&debug=true' : ''}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        // If we have debug info, show it in the debug dialog
        if (result.debug) {
          setDebugInfo({
            machine: machine["Machine Name"],
            error: result.error,
            details: result.debug
          })
          setDebugDialogOpen(true)
          throw new Error(result.error || "Failed to update price")
        } else {
          throw new Error(result.error || "Failed to update price")
        }
      }
      
      // If debugging was requested, show the debug info
      if (debug && result.debug) {
        setDebugInfo({
          machine: machine["Machine Name"],
          success: true,
          price: result.price,
          details: result.debug
        })
        setDebugDialogOpen(true)
      }
      
      toast.success(`Price updated for ${machine["Machine Name"]}`)
      
      // Refresh data
      if (selectedMachine?.id === machine.id) {
        selectMachine(machine)
      }
      
      setRefreshing(prev => !prev)
    } catch (error) {
      console.error("Error updating price:", error)
      toast.error(`Failed to update price: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  // Function to run update for all featured machines
  const updateAllPrices = async () => {
    try {
      const response = await fetch(`/api/cron/update-prices?secret=admin-panel`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to update prices")
      }
      
      toast.success(`Price update job started. Updated ${result.results?.updated || 0} machines.`)
      
      // Refresh data after a short delay to allow updates to complete
      setTimeout(() => {
        if (selectedMachine) {
          selectMachine(selectedMachine)
        }
        setRefreshing(prev => !prev)
      }, 2000)
    } catch (error) {
      console.error("Error updating prices:", error)
      toast.error(`Failed to update prices: ${error instanceof Error ? error.message : "Unknown error"}`)
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
  
  return (
    <div className="space-y-6">
      <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              {debugInfo?.success 
                ? `Price Scraping Results: ${debugInfo?.machine}` 
                : `Price Scraping Failed: ${debugInfo?.machine}`}
            </DialogTitle>
            <DialogDescription>
              {debugInfo?.success 
                ? `Successfully scraped price: ${formatPrice(debugInfo?.price)}` 
                : `Error: ${debugInfo?.error}`}
            </DialogDescription>
          </DialogHeader>
          
          {debugInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Final URL</h3>
                  <p className="text-sm bg-muted p-2 rounded break-all">
                    {debugInfo.details?.finalUrl || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Page Title</h3>
                  <p className="text-sm bg-muted p-2 rounded">
                    {debugInfo.details?.pageTitle || "N/A"}
                  </p>
                </div>
              </div>
              
              {debugInfo.details?.priceText && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Found Price Text</h3>
                  <p className="text-sm bg-muted p-2 rounded">
                    {debugInfo.details.priceText}
                    {debugInfo.details.parsedPrice && ` → ${formatPrice(debugInfo.details.parsedPrice)}`}
                  </p>
                </div>
              )}
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="steps">
                  <AccordionTrigger>Process Steps</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-muted rounded-md p-2 max-h-60 overflow-y-auto">
                      <ol className="text-sm space-y-1 pl-5 list-decimal">
                        {debugInfo.details?.steps?.map((step: string, i: number) => (
                          <li key={i} className={step.includes('Error') ? 'text-red-500' : ''}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="selectors">
                  <AccordionTrigger>Selector Results</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-muted rounded-md p-2 max-h-60 overflow-y-auto text-sm">
                      {debugInfo.details?.selectors?.length > 0 ? (
                        <div className="space-y-2">
                          {debugInfo.details.selectors.map((sel: any, i: number) => (
                            <div key={i} className="border-b pb-2 last:border-b-0">
                              <p><strong>Selector:</strong> {sel.selector}</p>
                              <p><strong>Matches:</strong> {sel.count}</p>
                              {sel.foundText.length > 0 && (
                                <div>
                                  <p><strong>Text:</strong></p>
                                  <ul className="list-disc pl-5">
                                    {sel.foundText.map((text: string, j: number) => (
                                      <li key={j} className="truncate">{text || "(empty)"}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No selectors matched</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {debugInfo.details?.jsonldSamples && (
                  <AccordionItem value="jsonld">
                    <AccordionTrigger>JSON-LD Data</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted rounded-md p-2 max-h-60 overflow-y-auto">
                        {debugInfo.details.jsonldSamples.map((sample: string, i: number) => (
                          <pre key={i} className="text-xs whitespace-pre-wrap">{sample}</pre>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                {debugInfo.details?.screenshot && (
                  <AccordionItem value="screenshot">
                    <AccordionTrigger>Page Screenshot</AccordionTrigger>
                    <AccordionContent>
                      <div className="border rounded-md overflow-hidden">
                        <img 
                          src={debugInfo.details.screenshot} 
                          alt="Page screenshot" 
                          className="w-full h-auto max-h-[500px] object-contain"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                {debugInfo.details?.error && (
                  <AccordionItem value="error">
                    <AccordionTrigger>Error Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-red-50 text-red-900 rounded-md p-2 overflow-auto">
                        <p className="font-medium">{debugInfo.details.error.message}</p>
                        {debugInfo.details.error.stack && (
                          <pre className="text-xs mt-2 whitespace-pre-wrap">{debugInfo.details.error.stack}</pre>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          )}
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
                      <TableHead>Recorded Price</TableHead>
                      <TableHead>Current Price</TableHead>
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
                          <TableCell>{formatPrice(record.price)}</TableCell>
                          <TableCell>{formatPrice(record.currentPrice)}</TableCell>
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