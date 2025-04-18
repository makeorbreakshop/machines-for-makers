"use client"

import { useState, useEffect } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner"
import { 
  Settings, 
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Code,
  AlertTriangle,
  Check,
  XCircle
} from "lucide-react"

// API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'

export default function ConfigurationPage() {
  // State for machines list
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMachine, setSelectedMachine] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  
  // State for machine configuration
  const [machineConfig, setMachineConfig] = useState<any>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [newVariant, setNewVariant] = useState({ attribute: "", requires_js: false })
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  
  // State for JS configuration
  const [jsConfig, setJsConfig] = useState<any>(null)
  const [isEditingJs, setIsEditingJs] = useState(false)
  
  // Fetch machines
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        setLoading(true)
        
        const response = await fetch(`${API_BASE_URL}/api/v1/machines`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch machines: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch machines')
        }
        
        setMachines(data.machines || [])
      } catch (error) {
        console.error("Error fetching machines:", error)
        toast.error("Failed to load machines")
      } finally {
        setLoading(false)
      }
    }
    
    fetchMachines()
  }, [searchTerm])
  
  // Fetch machine configuration when a machine is selected
  useEffect(() => {
    const fetchMachineConfig = async () => {
      if (!selectedMachine) return
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/machines/${selectedMachine.id}/config`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch machine config: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch machine configuration')
        }
        
        setMachineConfig(data.config || {})
        setVariants(data.variants || [])
        setJsConfig(data.js_config || null)
      } catch (error) {
        console.error("Error fetching machine config:", error)
        toast.error("Failed to load machine configuration")
      }
    }
    
    fetchMachineConfig()
  }, [selectedMachine])
  
  // Handle machine selection
  const handleSelectMachine = (machine: any) => {
    setSelectedMachine(machine)
  }
  
  // Handle configuration save
  const handleSaveConfig = async () => {
    if (!selectedMachine) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/machines/${selectedMachine.id}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: machineConfig,
          variants,
          js_config: jsConfig
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save configuration')
      }
      
      toast.success("Configuration saved successfully")
    } catch (error) {
      console.error("Error saving configuration:", error)
      toast.error("Failed to save configuration")
    }
  }
  
  // Handle adding new variant
  const handleAddVariant = async () => {
    if (!selectedMachine || !newVariant.attribute) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/machines/${selectedMachine.id}/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newVariant)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to add variant: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to add variant')
      }
      
      setVariants([...variants, data.variant])
      setNewVariant({ attribute: "", requires_js: false })
      setIsAddingVariant(false)
      toast.success("Variant added successfully")
    } catch (error) {
      console.error("Error adding variant:", error)
      toast.error("Failed to add variant")
    }
  }
  
  // Handle deleting variant
  const handleDeleteVariant = async (variantId: string) => {
    if (!selectedMachine) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/machines/${selectedMachine.id}/variants/${variantId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete variant: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete variant')
      }
      
      setVariants(variants.filter(v => v.id !== variantId))
      toast.success("Variant deleted successfully")
    } catch (error) {
      console.error("Error deleting variant:", error)
      toast.error("Failed to delete variant")
    }
  }
  
  // Handle saving JS configuration
  const handleSaveJsConfig = async () => {
    if (!selectedMachine) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/machines/${selectedMachine.id}/js-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsConfig)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save JS configuration: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save JS configuration')
      }
      
      setIsEditingJs(false)
      toast.success("JS configuration saved successfully")
    } catch (error) {
      console.error("Error saving JS configuration:", error)
      toast.error("Failed to save JS configuration")
    }
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration Management</h1>
          <p className="text-muted-foreground">
            Configure price extraction settings for machines and variants
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-4">
        {/* Machine List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Machines</CardTitle>
            <CardDescription>Select a machine to configure</CardDescription>
            <Input
              placeholder="Search machines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : machines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No machines found
                </div>
              ) : (
                <div className="divide-y">
                  {machines.map((machine) => (
                    <button
                      key={machine.id}
                      className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors ${
                        selectedMachine?.id === machine.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => handleSelectMachine(machine)}
                    >
                      <div className="font-medium">{machine.name}</div>
                      <div className="text-sm text-muted-foreground">{machine.company}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Configuration Panel */}
        <div className="md:col-span-3">
          {!selectedMachine ? (
            <Card>
              <CardHeader>
                <CardTitle>Select a Machine</CardTitle>
                <CardDescription>
                  Choose a machine from the list to view and edit its configuration
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedMachine.name} - Basic Configuration</CardTitle>
                  <CardDescription>Configure basic extraction settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-extraction-confidence">Minimum Extraction Confidence</Label>
                    <Input
                      id="min-extraction-confidence"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={machineConfig?.min_extraction_confidence || 0.85}
                      onChange={(e) => setMachineConfig({
                        ...machineConfig,
                        min_extraction_confidence: parseFloat(e.target.value)
                      })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Minimum confidence required for price extraction (0-1)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="min-validation-confidence">Minimum Validation Confidence</Label>
                    <Input
                      id="min-validation-confidence"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={machineConfig?.min_validation_confidence || 0.90}
                      onChange={(e) => setMachineConfig({
                        ...machineConfig,
                        min_validation_confidence: parseFloat(e.target.value)
                      })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Minimum confidence required for price validation (0-1)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sanity-check-threshold">Price Change Threshold</Label>
                    <Input
                      id="sanity-check-threshold"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={machineConfig?.sanity_check_threshold || 0.25}
                      onChange={(e) => setMachineConfig({
                        ...machineConfig,
                        sanity_check_threshold: parseFloat(e.target.value)
                      })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum allowed price change before requiring review (0-1)
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveConfig}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Variant Management</CardTitle>
                      <CardDescription>Configure variants and their extraction settings</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddingVariant(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Variant
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Requires JS</TableHead>
                        <TableHead>CSS Selector</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No variants configured
                          </TableCell>
                        </TableRow>
                      ) : (
                        variants.map((variant) => (
                          <TableRow key={variant.id}>
                            <TableCell>{variant.attribute}</TableCell>
                            <TableCell>
                              {variant.requires_js ? (
                                <Badge variant="default">Yes</Badge>
                              ) : (
                                <Badge variant="secondary">No</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {variant.css_selector || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteVariant(variant.id)}
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
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>JavaScript Interaction</CardTitle>
                      <CardDescription>Configure JavaScript actions for dynamic content</CardDescription>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => setIsEditingJs(true)}
                    >
                      <Code className="w-4 h-4 mr-2" />
                      Edit JS Config
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {jsConfig ? (
                    <div className="space-y-4">
                      <div className="rounded-md bg-muted p-4">
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(jsConfig, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No JavaScript configuration set
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Variant Dialog */}
      <Dialog open={isAddingVariant} onOpenChange={setIsAddingVariant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variant</DialogTitle>
            <DialogDescription>
              Configure a new variant for price extraction
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="variant-attribute">Variant Attribute</Label>
              <Input
                id="variant-attribute"
                placeholder="e.g., 60W, Size M"
                value={newVariant.attribute}
                onChange={(e) => setNewVariant({
                  ...newVariant,
                  attribute: e.target.value
                })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="requires-js"
                checked={newVariant.requires_js}
                onCheckedChange={(checked) => setNewVariant({
                  ...newVariant,
                  requires_js: checked
                })}
              />
              <Label htmlFor="requires-js">Requires JavaScript Interaction</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingVariant(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVariant}>
              Add Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit JS Config Dialog */}
      <Dialog open={isEditingJs} onOpenChange={setIsEditingJs}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit JavaScript Configuration</DialogTitle>
            <DialogDescription>
              Configure JavaScript actions for dynamic content extraction
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>JavaScript Actions</Label>
              <textarea
                className="w-full h-64 font-mono text-sm p-4 rounded-md border"
                value={jsConfig ? JSON.stringify(jsConfig, null, 2) : ""}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setJsConfig(parsed)
                  } catch (error) {
                    // Allow invalid JSON while editing
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                Enter JavaScript configuration in JSON format
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingJs(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveJsConfig}>
              Save JS Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 