"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, Save, Check, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import type { Machine } from "@/lib/database-types"
import { Label } from "@/components/ui/label"
import { DebugPanel } from "@/components/admin/debug-panel"
import { ImageGallery } from "@/components/admin/image-gallery"
import { getReferenceData, type ReferenceData } from "@/lib/services/reference-data-service"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Define the form schema
const formSchema = z.object({
  product_url: z.string().url({
    message: "Please enter a valid URL",
  }),
  debug_mode: z.boolean().default(false),
})

// Define interface for scraped data state
interface MachinePreviewData {
  // Basic information
  machine_name: string
  company: string
  machine_category?: string
  laser_category?: string
  price?: number
  rating?: number
  award?: string
  image_url?: string
  
  // Laser specifications
  laser_type_a?: string
  laser_power_a?: string
  laser_type_b?: string
  laser_power_b?: string
  laser_frequency?: string
  pulse_width?: string
  laser_source_manufacturer?: string
  
  // Physical specifications
  work_area?: string
  machine_size?: string
  height?: string
  
  // Technical specifications
  speed?: string
  speed_category?: string
  acceleration?: string
  focus?: string
  controller?: string
  software?: string
  warranty?: string
  
  // Features
  enclosure?: boolean
  wifi?: boolean
  camera?: boolean
  passthrough?: boolean
  
  // Content
  excerpt_short?: string
  description?: string
  highlights?: string
  drawbacks?: string
  
  // URLs
  product_link?: string
  affiliate_link?: string
  youtube_review?: string
  
  // Settings
  is_featured?: boolean
  hidden?: boolean
  
  // Add the new images array field
  images?: string[];
}

export function MachineScraperForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [scrapedData, setScrapedData] = useState<MachinePreviewData | null>(null)
  const [editedData, setEditedData] = useState<MachinePreviewData | null>(null)
  const [debugData, setDebugData] = useState<any>(null)
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null)
  const [newCompanyName, setNewCompanyName] = useState<string>('')
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false)
  
  // Load reference data on component mount
  useEffect(() => {
    const loadReferenceData = async () => {
      const data = await getReferenceData();
      setReferenceData(data);
    };
    
    loadReferenceData();
  }, []);
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_url: "",
      debug_mode: false,
    },
  })
  
  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)
    setSaveSuccess(false)
    setDebugData(null)
    
    try {
      // Call the API to scrape the URL
      const response = await fetch("/api/admin/scrape-machine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          url: values.product_url,
          debug: values.debug_mode 
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to scrape machine data")
      }
      
      const responseData = await response.json()
      
      // Handle debug mode response which includes both data and debug info
      if (values.debug_mode && responseData.data && responseData.debug) {
        setScrapedData(responseData.data)
        setEditedData(responseData.data)
        setDebugData(responseData.debug)
      } else {
        // Standard response
        setScrapedData(responseData)
        setEditedData(responseData)
      }
    } catch (err) {
      console.error("Scraping error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle saving machine data to the database
  async function handleSave() {
    if (!editedData) return
    
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    
    try {
      const response = await fetch("/api/admin/save-scraped-machine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to save machine data")
      }
      
      const result = await response.json()
      setSaveSuccess(true)
      
      // Redirect to the machine edit page after a short delay
      setTimeout(() => {
        if (result.machine_id) {
          router.push(`/admin/machines/${result.machine_id}`)
        }
      }, 1500)
    } catch (err) {
      console.error("Save error:", err)
      setSaveError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle input changes in the preview form
  function handleInputChange(field: keyof MachinePreviewData, value: any) {
    if (!editedData) return
    
    setEditedData({
      ...editedData,
      [field]: value,
    })
  }
  
  // Handle image selection changes
  function handleImagesChange(selectedImages: string[], primaryImage: string) {
    if (!editedData) return
    
    setEditedData({
      ...editedData,
      images: selectedImages,
      image_url: primaryImage
    })
  }
  
  // Handle new company creation
  function handleAddNewCompany() {
    if (!newCompanyName.trim() || !editedData) return;
    
    // In a real implementation, you would make an API call to create the company
    // For now, we'll just set it in the form
    setEditedData({
      ...editedData,
      company: newCompanyName.trim()
    });
    
    setNewCompanyName('');
    setShowNewCompanyDialog(false);
  }
  
  // Reset the form and scraped data
  function handleReset() {
    form.reset()
    setScrapedData(null)
    setEditedData(null)
    setError(null)
    setSaveError(null)
    setSaveSuccess(false)
    setDebugData(null)
  }
  
  // Render the data editor form once we have scraped data
  const renderEditor = () => {
    if (!editedData || !scrapedData) return null;
    
    return (
      <div className="space-y-6 mt-8">
        <h2 className="text-xl font-semibold">Edit Extracted Data</h2>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="machine_name">Machine Name</Label>
                  <Input 
                    id="machine_name"
                    value={editedData.machine_name || ''}
                    onChange={(e) => handleInputChange('machine_name', e.target.value)}
                    placeholder="Machine name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="machine_category">Machine Category</Label>
                  {referenceData ? (
                    <Select 
                      value={editedData.machine_category || undefined} 
                      onValueChange={(value) => handleInputChange('machine_category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select machine category" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceData.machineCategories.map((category) => (
                          <SelectItem key={category} value={category || "unknown"}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      id="machine_category"
                      value={editedData.machine_category || ''}
                      onChange={(e) => handleInputChange('machine_category', e.target.value)}
                      placeholder="Machine category"
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="laser_category">Laser Category</Label>
                  {referenceData ? (
                    <Select 
                      value={editedData.laser_category || undefined} 
                      onValueChange={(value) => handleInputChange('laser_category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select laser category" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceData.laserCategories.map((category) => (
                          <SelectItem key={category} value={category || "unknown"}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      id="laser_category"
                      value={editedData.laser_category || ''}
                      onChange={(e) => handleInputChange('laser_category', e.target.value)}
                      placeholder="Laser category"
                    />
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="company">Company</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 gap-1 text-xs"
                      onClick={() => setShowNewCompanyDialog(true)}
                    >
                      <Plus className="h-3 w-3" /> Add New
                    </Button>
                  </div>
                  
                  {referenceData ? (
                    <Select 
                      value={editedData.company || undefined} 
                      onValueChange={(value) => handleInputChange('company', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceData.companies.map((company) => (
                          <SelectItem key={company.id} value={company.name || `company-${company.id}`}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      id="company"
                      value={editedData.company || ''}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Company name"
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input 
                    id="price"
                    type="number"
                    value={editedData.price || ''}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                    placeholder="Price (without currency symbol)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="product_link">Product Link</Label>
                  <Input 
                    id="product_link"
                    value={editedData.product_link || ''}
                    onChange={(e) => handleInputChange('product_link', e.target.value)}
                    placeholder="Product URL"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="specs" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="laser_type_a">Primary Laser Type</Label>
                  {referenceData ? (
                    <Select 
                      value={editedData.laser_type_a || undefined} 
                      onValueChange={(value) => handleInputChange('laser_type_a', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select laser type" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceData.laserTypes.map((type) => (
                          <SelectItem key={type} value={type || "unknown"}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      id="laser_type_a"
                      value={editedData.laser_type_a || ''}
                      onChange={(e) => handleInputChange('laser_type_a', e.target.value)}
                      placeholder="Primary laser type"
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="laser_power_a">Primary Laser Power</Label>
                  <Input 
                    id="laser_power_a"
                    value={editedData.laser_power_a || ''}
                    onChange={(e) => handleInputChange('laser_power_a', e.target.value)}
                    placeholder="Laser power with units (e.g., 40W)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="laser_type_b">Secondary Laser Type</Label>
                  {referenceData ? (
                    <Select 
                      value={editedData.laser_type_b || undefined} 
                      onValueChange={(value) => handleInputChange('laser_type_b', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select secondary laser type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {referenceData.laserTypes.map((type) => (
                          <SelectItem key={type} value={type || "unknown"}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      id="laser_type_b"
                      value={editedData.laser_type_b || ''}
                      onChange={(e) => handleInputChange('laser_type_b', e.target.value)}
                      placeholder="Secondary laser type (if applicable)"
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="laser_power_b">Secondary Laser Power</Label>
                  <Input 
                    id="laser_power_b"
                    value={editedData.laser_power_b || ''}
                    onChange={(e) => handleInputChange('laser_power_b', e.target.value)}
                    placeholder="Secondary laser power (if applicable)"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="work_area">Work Area</Label>
                  <Input 
                    id="work_area"
                    value={editedData.work_area || ''}
                    onChange={(e) => handleInputChange('work_area', e.target.value)}
                    placeholder="Work area dimensions (e.g., 400 x 600 mm)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="machine_size">Machine Size</Label>
                  <Input 
                    id="machine_size"
                    value={editedData.machine_size || ''}
                    onChange={(e) => handleInputChange('machine_size', e.target.value)}
                    placeholder="External machine dimensions"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="height">Height/Z-axis Travel</Label>
                  <Input 
                    id="height"
                    value={editedData.height || ''}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    placeholder="Height/Z-axis travel"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="speed">Speed</Label>
                  <Input 
                    id="speed"
                    value={editedData.speed || ''}
                    onChange={(e) => handleInputChange('speed', e.target.value)}
                    placeholder="Maximum speed/feed rate"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="features" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Key Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enclosure" 
                      checked={editedData.enclosure === true}
                      onCheckedChange={(checked) => handleInputChange('enclosure', checked === true)}
                    />
                    <Label htmlFor="enclosure">Enclosure</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="wifi" 
                      checked={editedData.wifi === true}
                      onCheckedChange={(checked) => handleInputChange('wifi', checked === true)}
                    />
                    <Label htmlFor="wifi">Wi-Fi Connectivity</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="camera" 
                      checked={editedData.camera === true}
                      onCheckedChange={(checked) => handleInputChange('camera', checked === true)}
                    />
                    <Label htmlFor="camera">Built-in Camera</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="passthrough" 
                      checked={editedData.passthrough === true}
                      onCheckedChange={(checked) => handleInputChange('passthrough', checked === true)}
                    />
                    <Label htmlFor="passthrough">Passthrough Slots</Label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="controller">Controller</Label>
                  <Input 
                    id="controller"
                    value={editedData.controller || ''}
                    onChange={(e) => handleInputChange('controller', e.target.value)}
                    placeholder="Controller type"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="software">Software</Label>
                  <Input 
                    id="software"
                    value={editedData.software || ''}
                    onChange={(e) => handleInputChange('software', e.target.value)}
                    placeholder="Compatible software"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="warranty">Warranty</Label>
                  <Input 
                    id="warranty"
                    value={editedData.warranty || ''}
                    onChange={(e) => handleInputChange('warranty', e.target.value)}
                    placeholder="Warranty information"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={editedData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Machine description"
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="highlights">Highlights</Label>
                <Textarea 
                  id="highlights"
                  value={editedData.highlights || ''}
                  onChange={(e) => handleInputChange('highlights', e.target.value)}
                  placeholder="Key selling points or highlights"
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="drawbacks">Drawbacks</Label>
                <Textarea 
                  id="drawbacks"
                  value={editedData.drawbacks || ''}
                  onChange={(e) => handleInputChange('drawbacks', e.target.value)}
                  placeholder="Any mentioned limitations"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="images" className="space-y-4 mt-4">
            {editedData.images && editedData.images.length > 0 ? (
              <ImageGallery 
                images={editedData.images} 
                onImagesChange={handleImagesChange}
              />
            ) : editedData.image_url ? (
              <ImageGallery 
                images={[editedData.image_url]} 
                onImagesChange={handleImagesChange}
              />
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Images Found</AlertTitle>
                <AlertDescription>
                  No images were extracted from the product page.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={handleReset}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Machine"}
          </Button>
        </div>
      </div>
    );
  };
  
  // Dialog for adding a new company
  const newCompanyDialog = (
    <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Enter the name of the new company to add it to the database.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-company-name">Company Name</Label>
            <Input 
              id="new-company-name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewCompanyDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddNewCompany} disabled={!newCompanyName.trim()}>
            Add Company
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="product_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://example.com/product-page" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Enter the URL of the machine product page to scrape
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="debug_mode"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Debug Mode</FormLabel>
                  <FormDescription>
                    Show detailed extraction information for debugging
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Scraping..." : "Scrape Product"}
            </Button>
            
            {scrapedData && (
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
          </div>
        </form>
      </Form>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Save Error</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            Machine data saved successfully!
          </AlertDescription>
        </Alert>
      )}
      
      {debugData && <DebugPanel debugData={debugData} />}
      
      {renderEditor()}
      
      {newCompanyDialog}
    </div>
  );
} 