"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AlertCircle, Check, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

// UI Components
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Types
import type { MachineFormData } from "@/components/admin/machine-form"
import { getReferenceData } from "@/lib/services/reference-data-service"

// Add this interface to extend MachineFormData with the images property
interface ExtendedMachineFormData extends MachineFormData {
  images?: string[];
}

// Form schema for URL input
const scraperFormSchema = z.object({
  product_url: z.string().url({
    message: "Please enter a valid URL",
  }),
  debug_mode: z.boolean().default(false),
})

// Type definition for difference tracking
interface FieldDifference {
  field: string;
  fieldLabel: string;
  currentValue: any;
  newValue: any;
  selected: boolean;
  category: string;
}

interface MachineUrlScraperProps {
  machine?: ExtendedMachineFormData;
  onUpdateMachine: (updatedData: Partial<ExtendedMachineFormData>) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MachineUrlScraper({ 
  machine, 
  onUpdateMachine, 
  isOpen, 
  onOpenChange 
}: MachineUrlScraperProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapedData, setScrapedData] = useState<Partial<ExtendedMachineFormData> | null>(null);
  const [differences, setDifferences] = useState<FieldDifference[]>([]);
  const [debugData, setDebugData] = useState<any>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [forceKeepOpen, setForceKeepOpen] = useState(false);
  
  // Set up form
  const form = useForm<z.infer<typeof scraperFormSchema>>({
    resolver: zodResolver(scraperFormSchema),
    defaultValues: {
      product_url: machine?.product_link || "",
      debug_mode: false,
    },
  });
  
  // Prevent modal from closing while loading
  const preventModalClose = isLoading || isPending || forceKeepOpen;
  console.log(`[DEBUG] Rendering Dialog. Prevent Close: ${preventModalClose} (isLoading: ${isLoading}, isPending: ${isPending}, forceKeepOpen: ${forceKeepOpen})`);
  
  // Handle form submission
  async function onSubmit(values: z.infer<typeof scraperFormSchema>) {
    console.log('[DEBUG] onSubmit started');
    // Set both loading states to prevent closing
    setIsLoading(true);
    setForceKeepOpen(true);
    setError(null);
    
    try {
      // Use startTransition to mark this update as non-urgent
      startTransition(() => {
        setScrapedData(null);
        setDifferences([]);
        setDebugData(null);
      });
      
      // Artificial delay to ensure the loading state is applied
      await new Promise(resolve => setTimeout(resolve, 50));
      
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
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to scrape machine data");
      }
      
      const responseData = await response.json();
      
      // Process the scraped data
      let extractedData: Partial<ExtendedMachineFormData> = {};
      
      if (values.debug_mode && responseData.data && responseData.debug) {
        extractedData = transformToMachineFormData(responseData.data);
        setDebugData(responseData.debug);
      } else {
        extractedData = transformToMachineFormData(responseData);
      }
      
      // Use startTransition for updating state with the results
      startTransition(() => {
        setScrapedData(extractedData);
        
        // Initialize selected images if present
        if (extractedData.images && Array.isArray(extractedData.images)) {
          setSelectedImages(extractedData.images);
        }
        
        // If we have existing machine data, compare and find differences
        if (machine) {
          const diffs = findDifferences(machine, extractedData);
          setDifferences(diffs);
        }
      });
    } catch (err) {
      console.error("[DEBUG] Scraping error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
      // Keep forceKeepOpen true for a moment longer to prevent any race conditions
      console.log('[DEBUG] onSubmit finished, setting forceKeepOpen false soon');
      setTimeout(() => {
        console.log('[DEBUG] Setting forceKeepOpen to false now');
        setForceKeepOpen(false);
      }, 100);
    }
  }
  
  // Transform scraped data to match MachineFormData format
  function transformToMachineFormData(data: any): Partial<ExtendedMachineFormData> {
    // Create a mapping for boolean fields that might be strings in the scraped data
    const booleanFields = ['enclosure', 'wifi', 'camera', 'passthrough', 'is_featured', 'hidden'];
    
    // Convert the scraped data to the correct format
    const formData: Record<string, any> = { ...data };
    
    // Handle boolean conversions if they're "Yes"/"No" strings
    booleanFields.forEach(field => {
      if (typeof data[field] === 'string') {
        formData[field] = ['yes', 'true', '1'].includes((data[field] as string).toLowerCase());
      }
    });
    
    // Handle machine category - must use exact database values
    const validMachineCategories = ["laser", "3d-printer", "cnc"];
    if (formData.machine_category) {
      // First try exact match
      const exactMatch = validMachineCategories.find(cat => 
        cat.toLowerCase() === formData.machine_category.toLowerCase()
      );
      
      if (exactMatch) {
        formData.machine_category = exactMatch;
      } else {
        // If no exact match, try to find the closest match
        const matchScore = (a: string, b: string) => {
          a = a.toLowerCase();
          b = b.toLowerCase();
          return a.includes(b) || b.includes(a);
        };
        
        const bestMatch = validMachineCategories.find(cat => 
          matchScore(cat, formData.machine_category)
        );
        
        if (bestMatch) {
          formData.machine_category = bestMatch;
        }
      }
    }
    
    // Laser Category should match exact database values
    const validLaserCategories = [
      'desktop-diode-laser',
      'desktop-co2-laser',
      'desktop-fiber-laser',
      'high-end-co2-laser',
      'high-end-fiber',
      'open-diode-laser'
    ];
    
    if (formData.laser_category) {
      // First try exact match
      const exactMatch = validLaserCategories.find(cat => 
        cat.toLowerCase() === formData.laser_category.toLowerCase()
      );
      
      if (exactMatch) {
        formData.laser_category = exactMatch;
      } else {
        // If no exact match, try to find the closest match
        const matchScore = (a: string, b: string) => {
          a = a.toLowerCase();
          b = b.toLowerCase();
          if (a === b) return 3;
          if (a.includes(b) || b.includes(a)) return 2;
          if (a.replace(/\s+/g, '-').includes(b) || b.includes(a.replace(/\s+/g, '-'))) return 1;
          return 0;
        };
        
        const matches = validLaserCategories.map(cat => ({
          category: cat,
          score: matchScore(cat, formData.laser_category)
        }));
        
        const bestMatch = matches.sort((a, b) => b.score - a.score)[0];
        
        if (bestMatch && bestMatch.score > 0) {
          formData.laser_category = bestMatch.category;
        }
      }
    }
    
    // Laser types must exactly match valid database values
    const validLaserTypes = {
      'CO2': 'CO2',
      'CO2-RF': 'CO2-RF',
      'CO2-Glass': 'CO2-Glass',
      'Diode': 'Diode',
      'Fiber': 'Fiber',
      'MOPA': 'MOPA',
      'Infrared': 'Infrared'
    };
    
    if (formData.laser_type_a) {
      const matchedType = Object.entries(validLaserTypes).find(([key, _]) => 
        key.toLowerCase() === formData.laser_type_a.toLowerCase()
      );
      
      if (matchedType) {
        formData.laser_type_a = matchedType[1];
      }
    }
    
    if (formData.laser_type_b) {
      if (formData.laser_type_b.toLowerCase() === 'none' || !formData.laser_type_b) {
        formData.laser_type_b = '';
      } else {
        const matchedType = Object.entries(validLaserTypes).find(([key, _]) => 
          key.toLowerCase() === formData.laser_type_b.toLowerCase()
        );
        
        if (matchedType) {
          formData.laser_type_b = matchedType[1];
        }
      }
    }
    
    // Handle multiple images
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      // Store the array of images
      formData.images = data.images;
      
      // Still set the primary image to image_url for backward compatibility
      if (!formData.image_url && data.images[0]) {
        formData.image_url = data.images[0];
      }
    }
    
    return formData as Partial<ExtendedMachineFormData>;
  }
  
  // Find differences between existing and scraped data
  function findDifferences(current: ExtendedMachineFormData, scraped: Partial<ExtendedMachineFormData>): FieldDifference[] {
    const diffs: FieldDifference[] = [];
    
    // Define field categories for organization
    const fieldCategories: Record<string, string> = {
      machine_name: 'Basic Info',
      company: 'Basic Info',
      machine_category: 'Basic Info',
      laser_category: 'Basic Info',
      price: 'Basic Info',
      rating: 'Basic Info',
      award: 'Basic Info',
      laser_type_a: 'Laser Specs',
      laser_power_a: 'Laser Specs',
      laser_type_b: 'Laser Specs',
      laser_power_b: 'Laser Specs',
      laser_frequency: 'Laser Specs',
      pulse_width: 'Laser Specs',
      laser_source_manufacturer: 'Laser Specs',
      work_area: 'Physical Specs',
      machine_size: 'Physical Specs',
      height: 'Physical Specs',
      speed: 'Technical Specs',
      speed_category: 'Technical Specs',
      acceleration: 'Technical Specs',
      focus: 'Technical Specs',
      controller: 'Technical Specs',
      software: 'Technical Specs',
      warranty: 'Technical Specs',
      enclosure: 'Features',
      wifi: 'Features',
      camera: 'Features',
      passthrough: 'Features',
      excerpt_short: 'Content',
      description: 'Content',
      highlights: 'Content',
      drawbacks: 'Content',
      product_link: 'Links',
      affiliate_link: 'Links',
      youtube_review: 'Links',
      is_featured: 'Settings',
      hidden: 'Settings',
      image_url: 'Media',
    };
    
    // Define human readable labels
    const fieldLabels: Record<string, string> = {
      machine_name: 'Machine Name',
      company: 'Company',
      machine_category: 'Machine Category',
      laser_category: 'Laser Category',
      price: 'Price',
      rating: 'Rating',
      award: 'Award',
      laser_type_a: 'Primary Laser Type',
      laser_power_a: 'Primary Laser Power',
      laser_type_b: 'Secondary Laser Type',
      laser_power_b: 'Secondary Laser Power',
      laser_frequency: 'Laser Frequency',
      pulse_width: 'Pulse Width',
      laser_source_manufacturer: 'Laser Source Manufacturer',
      work_area: 'Work Area',
      machine_size: 'Machine Size',
      height: 'Height',
      speed: 'Speed',
      speed_category: 'Speed Category',
      acceleration: 'Acceleration',
      focus: 'Focus',
      controller: 'Controller',
      software: 'Software',
      warranty: 'Warranty',
      enclosure: 'Enclosure',
      wifi: 'WiFi',
      camera: 'Camera',
      passthrough: 'Passthrough',
      excerpt_short: 'Short Excerpt',
      description: 'Description',
      highlights: 'Highlights',
      drawbacks: 'Drawbacks',
      product_link: 'Product Link',
      affiliate_link: 'Affiliate Link',
      youtube_review: 'YouTube Review',
      is_featured: 'Featured',
      hidden: 'Hidden',
      image_url: 'Image URL',
    };
    
    // Check each field in the scraped data
    for (const [key, newValue] of Object.entries(scraped)) {
      // Skip if the key is not in the machine form data
      if (!(key in current)) continue;
      
      const currentValue = current[key as keyof ExtendedMachineFormData];
      
      // Skip non-substantial differences (empty to empty, null to empty string, etc.)
      if (
        (currentValue === newValue) ||
        (currentValue === '' && newValue === null) ||
        (currentValue === null && newValue === '') ||
        (currentValue === undefined && newValue === null) ||
        (currentValue === undefined && newValue === '')
      ) continue;
      
      // Add the difference to our list
      diffs.push({
        field: key,
        fieldLabel: fieldLabels[key] || key,
        currentValue: currentValue,
        newValue: newValue,
        selected: true, // Selected by default
        category: fieldCategories[key] || 'Other',
      });
    }
    
    // Sort differences by category
    return diffs.sort((a, b) => a.category.localeCompare(b.category));
  }
  
  // Toggle a single image's selection
  function toggleImageSelection(url: string, selected: boolean) {
    if (selected) {
      setSelectedImages(prev => [...prev, url]);
    } else {
      setSelectedImages(prev => prev.filter(imgUrl => imgUrl !== url));
    }
    console.log(`Image ${selected ? 'selected' : 'deselected'}:`, url);
    console.log('Updated selected images:', selectedImages);
  }
  
  // Apply the selected changes to the parent component
  function applySelectedChanges() {
    // Create an object with the selected differences
    const updatedData: Partial<ExtendedMachineFormData> = {};
    
    // Apply field changes
    differences.forEach(diff => {
      if (diff.selected) {
        updatedData[diff.field as keyof ExtendedMachineFormData] = diff.newValue;
      }
    });
    
    // Add selected images to be merged with existing ones
    if (selectedImages.length > 0) {
      updatedData.images = selectedImages;
      
      // Only set the first selected image as primary if we don't already have images
      // This will be handled by the parent component based on the current image state
      if (selectedImages[0] && !machine?.image_url) {
        updatedData.image_url = selectedImages[0];
      }
    }
    
    console.log("Applying selected changes:", updatedData);
    
    // Call the parent component's update function
    onUpdateMachine(updatedData);
    
    // Close the dialog using the passed-in handler
    onOpenChange(false);
  }
  
  // Toggle selection state for a difference
  function toggleDiffSelection(index: number) {
    console.log('Toggling diff selection for index:', index);
    setDifferences(prev => 
      prev.map((diff, i) => 
        i === index ? { ...diff, selected: !diff.selected } : diff
      )
    );
  }
  
  // Toggle all differences in a category
  function toggleCategory(category: string, selected: boolean) {
    console.log('Toggling category:', category, 'to:', selected);
    setDifferences(prev => 
      prev.map(diff => 
        diff.category === category ? { ...diff, selected } : diff
      )
    );
  }
  
  // Select or deselect all differences
  function toggleAll(selected: boolean) {
    console.log('Toggling all to:', selected);
    setDifferences(prev => prev.map(diff => ({ ...diff, selected })));
  }
  
  // Toggle all images
  function toggleAllImages(selected: boolean) {
    if (!scrapedData?.images) return;
    
    if (selected) {
      setSelectedImages([...scrapedData.images]);
    } else {
      setSelectedImages([]);
    }
  }
  
  // Format values for display
  function formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value || 'N/A';
    return JSON.stringify(value);
  }
  
  // Group differences by category
  const differencesByCategory = differences.reduce((acc, diff) => {
    if (!acc[diff.category]) {
      acc[diff.category] = [];
    }
    acc[diff.category].push(diff);
    return acc;
  }, {} as Record<string, FieldDifference[]>);
  
  // Count of selected differences
  const selectedCount = differences.filter(d => d.selected).length;
  
  return (
    <Dialog 
      open={isOpen}
      onOpenChange={(newOpen) => {
        console.log(`[DEBUG] onOpenChange called. newOpen: ${newOpen}, preventModalClose: ${preventModalClose}`);
        // Completely prevent closing the dialog when loading
        if (preventModalClose && !newOpen) {
          console.log('[DEBUG] Preventing dialog close due to preventModalClose flag');
          return; // Explicitly return to prevent further processing
        }
        
        // Call the parent handler to change the state
        onOpenChange(newOpen);
        if (!newOpen) {
          console.log('[DEBUG] Dialog closing, cleaning up state.');
          // Clean up state when closing (moved reset logic here)
          startTransition(() => {
            setScrapedData(null);
            setDifferences([]);
            setSelectedImages([]);
            setError(null);
            setForceKeepOpen(false); 
            form.reset({
              product_url: machine?.product_link || "",
              debug_mode: false,
            });
          });
        }
      }}
    >
      <DialogContent 
        className="max-w-7xl flex flex-col max-h-[90vh]"
        onPointerDownOutside={(e) => {
          console.log('[DEBUG] onPointerDownOutside triggered.');
          if (preventModalClose) {
            console.log('[DEBUG] Preventing close from onPointerDownOutside');
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          console.log('[DEBUG] onInteractOutside triggered.');
          if (preventModalClose) {
            console.log('[DEBUG] Preventing close from onInteractOutside');
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          console.log('[DEBUG] onEscapeKeyDown triggered.');
          if (preventModalClose) {
            console.log('[DEBUG] Preventing close from onEscapeKeyDown');
            e.preventDefault();
          }
        }}
      >
        {preventModalClose && (
          <div 
            className="absolute inset-0 bg-black/10 z-50 flex items-center justify-center" 
            onClick={(e) => {
              console.log('[DEBUG] Click on loading overlay');
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}
            onPointerDown={(e) => { e.stopPropagation(); }}
          >
            <div className="bg-white p-4 rounded-md shadow-lg">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-center font-medium">Loading...</p>
            </div>
          </div>
        )}
        
        <DialogHeader>
          <DialogTitle>Update Machine from URL</DialogTitle>
          <DialogDescription>
            Extract updated machine data from the product URL and compare with existing data
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-6 pl-6 -mr-6 -ml-6">
          {!scrapedData && (
            <div className="py-4">
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="product_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="product_url">Product URL</FormLabel>
                        <FormControl>
                          <Input 
                            id="product_url"
                            placeholder="https://example.com/product-page" 
                            {...field} 
                            disabled={isLoading || isPending}
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
                          <FormLabel htmlFor="debug_mode">Debug Mode</FormLabel>
                          <FormDescription>
                            Show extraction details for debugging
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            id="debug_mode"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="button" 
                    disabled={isLoading || isPending}
                    onClick={() => {
                      console.log('[DEBUG] Scrape Product button clicked');
                      // Validate form manually before submitting
                      form.trigger().then(isValid => {
                        if (isValid) {
                          console.log('[DEBUG] Form is valid, calling onSubmit');
                          const values = form.getValues();
                          onSubmit(values);
                        } else {
                          console.log('[DEBUG] Form is invalid');
                        }
                      });
                    }}
                  >
                    {(isLoading || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {(isLoading || isPending) ? "Scraping..." : "Scrape Product"}
                  </Button>
                </div>
              </Form>
              
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {scrapedData && differences.length > 0 && (
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h3 className="text-lg font-medium">Changes Detected: {differences.length}</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleAll(true)}
                    className="min-w-[100px] font-medium"
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleAll(false)}
                    className="min-w-[100px] font-medium"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="flex-grow">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="mb-2 sticky top-0 bg-background z-10">
                    <TabsTrigger value="all">All Changes ({differences.length})</TabsTrigger>
                    {Object.entries(differencesByCategory).map(([category, diffs]) => (
                      <TabsTrigger key={category} value={category}>
                        {category} ({diffs.length})
                      </TabsTrigger>
                    ))}
                    {scrapedData && scrapedData.images && Array.isArray(scrapedData.images) && scrapedData.images.length > 0 && (
                      <TabsTrigger value="images">
                        Images ({scrapedData.images.length})
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-0">
                    <div className="space-y-6">
                      {Object.entries(differencesByCategory).map(([category, categoryDiffs]) => (
                        <div key={category} className="border rounded-md">
                          <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                            <h4 className="font-medium">{category}</h4>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                                checked={categoryDiffs.every(d => d.selected)}
                                onCheckedChange={(checked) => {
                                  toggleCategory(category, !!checked);
                                }}
                                className="h-5 w-5"
                              />
                              <label 
                                htmlFor={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                                className="text-sm cursor-pointer"
                              >
                                Select All
                              </label>
                            </div>
                          </div>
                          <div className="divide-y">
                            {categoryDiffs.map((diff, idx) => {
                              const diffIndex = differences.findIndex(d => d === diff);
                              return (
                                <div key={diff.field} className="p-3 flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{diff.fieldLabel}</span>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        id={`diff-${diff.field.toLowerCase().replace(/\s+/g, '-')}-${diffIndex}`}
                                        checked={diff.selected}
                                        onCheckedChange={(checked) => {
                                          toggleDiffSelection(diffIndex);
                                        }}
                                        className="h-5 w-5"
                                      />
                                      <label 
                                        htmlFor={`diff-${diff.field.toLowerCase().replace(/\s+/g, '-')}-${diffIndex}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        Select
                                      </label>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="text-sm p-3 bg-red-50 rounded">
                                      <div className="text-red-600 text-xs font-medium mb-1">Current</div>
                                      <div>{formatValue(diff.currentValue)}</div>
                                    </div>
                                    <div className="text-sm p-3 bg-green-50 rounded">
                                      <div className="text-green-600 text-xs font-medium mb-1">New</div>
                                      <div>{formatValue(diff.newValue)}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  {Object.entries(differencesByCategory).map(([category, categoryDiffs]) => (
                    <TabsContent key={category} value={category} className="mt-0">
                      <div className="border rounded-md">
                        <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                          <h4 className="font-medium">{category}</h4>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`tab-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                              checked={categoryDiffs.every(d => d.selected)}
                              onCheckedChange={(checked) => {
                                toggleCategory(category, !!checked);
                              }}
                              className="h-5 w-5"
                            />
                            <label 
                              htmlFor={`tab-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                              className="text-sm cursor-pointer"
                            >
                              Select All
                            </label>
                          </div>
                        </div>
                        <div className="divide-y">
                          {categoryDiffs.map((diff) => {
                            const diffIndex = differences.findIndex(d => d === diff);
                            return (
                              <div key={diff.field} className="p-3 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{diff.fieldLabel}</span>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`tab-diff-${diff.field.toLowerCase().replace(/\s+/g, '-')}-${diffIndex}`}
                                      checked={diff.selected}
                                      onCheckedChange={(checked) => {
                                        toggleDiffSelection(diffIndex);
                                      }}
                                      className="h-5 w-5"
                                    />
                                    <label 
                                      htmlFor={`tab-diff-${diff.field.toLowerCase().replace(/\s+/g, '-')}-${diffIndex}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      Select
                                    </label>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div className="text-sm p-3 bg-red-50 rounded">
                                    <div className="text-red-600 text-xs font-medium mb-1">Current</div>
                                    <div>{formatValue(diff.currentValue)}</div>
                                  </div>
                                  <div className="text-sm p-3 bg-green-50 rounded">
                                    <div className="text-green-600 text-xs font-medium mb-1">New</div>
                                    <div>{formatValue(diff.newValue)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                  
                  {scrapedData && scrapedData.images && Array.isArray(scrapedData.images) && scrapedData.images.length > 0 && (
                    <TabsContent value="images" className="mt-0">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium">Images Found ({scrapedData.images.length})</h3>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toggleAllImages(true)}
                              className="min-w-[100px] font-medium"
                            >
                              Select All
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toggleAllImages(false)}
                              className="min-w-[100px] font-medium"
                            >
                              Deselect All
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {scrapedData.images.map((url: string, index: number) => {
                            // Check if this image is selected - assuming we track selected images in 'selectedImages' state
                            const isSelected = selectedImages.includes(url);
                            
                            return (
                              <div key={index} className="relative rounded-md overflow-hidden border aspect-square group">
                                <img 
                                  src={url} 
                                  alt={`Machine image ${index + 1}`} 
                                  className="object-cover w-full h-full"
                                />
                                <div className="absolute top-2 right-2">
                                  <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={(checked) => toggleImageSelection(url, checked === true)}
                                  />
                                </div>
                                {index === 0 && (
                                  <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                                    Primary
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Selected images will be saved when you apply the changes.
                        </p>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </ScrollArea>
            </div>
          )}
          
          {scrapedData && differences.length === 0 && !scrapedData.images && (
            <div className="py-8 flex flex-col items-center justify-center flex-grow">
              <Check className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Changes Detected</h3>
              <p className="text-center text-muted-foreground">
                The scraped data matches your current machine data.
              </p>
              <Button 
                className="mt-4" 
                variant="outline" 
                onClick={() => {
                  setScrapedData(null);
                  setDifferences([]);
                }}
              >
                Try Another URL
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="px-6 py-4 border-t mt-auto flex-shrink-0">
          {(scrapedData && differences.length > 0) || (scrapedData?.images && selectedImages.length > 0) ? (
            <>
              <div className="mr-auto text-sm text-muted-foreground">
                {selectedCount > 0 && (
                  <span>{selectedCount} of {differences.length} changes selected</span>
                )}
                {selectedCount > 0 && selectedImages.length > 0 && (
                  <span> | </span>
                )}
                {selectedImages.length > 0 && scrapedData?.images && (
                  <span>{selectedImages.length} of {scrapedData.images.length} images selected</span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  console.log('[DEBUG] Cancel button clicked');
                  // Use startTransition here as well for cleanup
                  startTransition(() => {
                    setScrapedData(null);
                    setDifferences([]);
                    setSelectedImages([]);
                    setError(null); // Clear error on cancel
                    setForceKeepOpen(false); // Ensure forceKeepOpen is reset
                  });
                  // Close dialog using parent handler
                  onOpenChange(false); 
                }}
                className="min-w-[120px]"
                disabled={isLoading || isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={applySelectedChanges}
                disabled={(selectedCount === 0 && selectedImages.length === 0) || isLoading || isPending}
                size="lg"
                className="min-w-[200px]"
              >
                Apply Selected Changes
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => {
                console.log('[DEBUG] Close button clicked');
                onOpenChange(false); // Close dialog using parent handler
              }}
              disabled={isLoading || isPending}
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 