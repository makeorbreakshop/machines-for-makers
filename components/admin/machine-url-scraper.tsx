"use client"

import { useState, useTransition, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { getBrands } from "@/lib/services/brand-service"
import { transformMachineData, getTransformationSuggestions } from "@/lib/services/machine-data-transformer"

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
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Set up form
  const form = useForm<z.infer<typeof scraperFormSchema>>({
    resolver: zodResolver(scraperFormSchema),
    defaultValues: {
      product_url: machine?.product_link || "",
      debug_mode: false,
    },
  });

  // Fetch reference data on component mount
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [refData, brandsData] = await Promise.all([
          getReferenceData(),
          getBrands()
        ]);
        setBrands(brandsData.data || []);
        setCategories(refData.categories || []);
      } catch (error) {
        console.error('Error fetching reference data:', error);
      }
    };

    fetchReferenceData();
  }, []);
  
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
      
      // Get brands for transformation
      const brandsData = await getBrands();
      
      if (values.debug_mode && responseData.data && responseData.debug) {
        extractedData = transformMachineData(responseData.data, brandsData.data || []);
        setDebugData(responseData.debug);
      } else {
        extractedData = transformMachineData(responseData, brandsData.data || []);
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
  
  // Note: Transformation is now handled by the machine-data-transformer service
  
  // Format display value for differences
  function formatDisplayValue(field: string, value: any, brands: any[] = [], scrapedData: any = null): string {
    // Special handling for company field - show brand name instead of ID
    if (field === 'company' && value && brands.length > 0) {
      const brand = brands.find(b => b.id === value);
      if (brand) {
        return brand.Name || brand.name;
      }
      // If no brand found, return the value as-is (might be a company name)
      return value;
    }
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return formatValue(value);
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
      
      // Skip company_display_name as it's for display purposes only
      if (key === 'company_display_name') continue;
      
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

  // Start editing a field
  function startEditing(field: string, currentValue: any) {
    setEditingField(field);
    setEditingValue(String(currentValue || ''));
    setValidationError('');
  }

  // Save edited value with validation
  function saveEditedValue() {
    if (!editingField) return;
    
    // Validate the field
    const validation = validateField(editingField, editingValue);
    if (!validation.isValid) {
      setValidationError(validation.message);
      return;
    }
    
    const valueToSave = validation.formattedValue || editingValue;
    
    const diffIndex = differences.findIndex(d => d.field === editingField);
    if (diffIndex !== -1) {
      const updatedDifferences = [...differences];
      updatedDifferences[diffIndex] = {
        ...updatedDifferences[diffIndex],
        newValue: valueToSave
      };
      setDifferences(updatedDifferences);
    }
    
    setEditingField(null);
    setEditingValue('');
    setValidationError('');
  }

  // Cancel editing
  function cancelEditing() {
    setEditingField(null);
    setEditingValue('');
    setValidationError('');
  }

  // Handle field value change with live validation
  function handleFieldValueChange(value: string) {
    setEditingValue(value);
    
    // Clear validation error if field becomes empty
    if (!value.trim()) {
      setValidationError('');
      return;
    }
    
    // Live validation for immediate feedback
    if (editingField) {
      const validation = validateField(editingField, value);
      if (!validation.isValid) {
        setValidationError(validation.message);
      } else {
        setValidationError('');
      }
    }
  }

  // Get dropdown options for a field
  function getDropdownOptions(field: string): { value: string; label: string }[] {
    switch (field) {
      case 'company':
        return brands.map(brand => ({
          value: brand.id,
          label: brand.Name || brand.name
        }));
      case 'machine_category':
        return [
          { value: 'laser', label: 'Laser' },
          { value: '3d-printer', label: '3D Printer' },
          { value: 'cnc', label: 'CNC' }
        ];
      case 'laser_category':
        return [
          { value: 'desktop-diode-laser', label: 'Desktop Diode Laser' },
          { value: 'desktop-co2-laser', label: 'Desktop CO2 Laser' },
          { value: 'desktop-fiber-laser', label: 'Desktop Fiber Laser' },
          { value: 'fiber-laser', label: 'Fiber Laser' },
          { value: 'high-end-co2-laser', label: 'High-End CO2 Laser' },
          { value: 'industrial-co2-laser', label: 'Industrial CO2 Laser' },
          { value: 'industrial-fiber-laser', label: 'Industrial Fiber Laser' }
        ];
      case 'laser_type_a':
      case 'laser_type_b':
        return [
          { value: 'Diode', label: 'Diode' },
          { value: 'CO2', label: 'CO2' },
          { value: 'Fiber', label: 'Fiber' },
          { value: 'MOPA', label: 'MOPA' },
          { value: 'Galvo', label: 'Galvo' },
          { value: 'UV', label: 'UV' },
          { value: 'Other', label: 'Other' }
        ];
      case 'focus':
        return [
          { value: 'Auto', label: 'Auto' },
          { value: 'Manual', label: 'Manual' }
        ];
      case 'controller':
        return [
          { value: 'Ruida', label: 'Ruida' },
          { value: 'Leetro', label: 'Leetro' },
          { value: 'Trocen', label: 'Trocen' },
          { value: 'DSP', label: 'DSP' },
          { value: 'Grbl', label: 'Grbl' },
          { value: 'Marlin', label: 'Marlin' },
          { value: 'Other', label: 'Other' }
        ];
      case 'software':
        return [
          { value: 'LightBurn', label: 'LightBurn' },
          { value: 'LaserGRBL', label: 'LaserGRBL' },
          { value: 'RDWorks', label: 'RDWorks' },
          { value: 'EzCAD', label: 'EzCAD' },
          { value: 'K40 Whisperer', label: 'K40 Whisperer' },
          { value: 'Other', label: 'Other' }
        ];
      case 'wifi':
      case 'camera':
      case 'passthrough':
      case 'enclosure':
        return [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ];
      case 'award':
        return [
          { value: 'Editors Choice', label: 'Editors Choice' },
          { value: 'Best Value', label: 'Best Value' },
          { value: 'Premium Pick', label: 'Premium Pick' },
          { value: 'Budget Pick', label: 'Budget Pick' }
        ];
      case 'rating':
        return [
          { value: '5', label: '5 Stars' },
          { value: '4.5', label: '4.5 Stars' },
          { value: '4', label: '4 Stars' },
          { value: '3.5', label: '3.5 Stars' },
          { value: '3', label: '3 Stars' },
          { value: '2.5', label: '2.5 Stars' },
          { value: '2', label: '2 Stars' }
        ];
      default:
        return [];
    }
  }

  // Check if a field has dropdown options
  function hasDropdownOptions(field: string): boolean {
    return getDropdownOptions(field).length > 0;
  }

  // Field validation and formatting functions
  const validateAndFormat = {
    price: (value: string) => {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''))
      if (isNaN(num)) throw new Error('Price must be a valid number')
      return num.toString()
    },
    laser_power_a: (value: string) => {
      const match = value.match(/^(\d+(?:\.\d+)?)\s*([kKmM]?)W?$/i)
      if (!match) throw new Error('Format: "40" or "5.5" (number only)')
      const num = parseFloat(match[1])
      const unit = match[2].toLowerCase()
      if (unit === 'k') return `${num * 1000}`
      if (unit === 'm') return `${num / 1000}`
      return `${num}`
    },
    laser_power_b: (value: string) => {
      const match = value.match(/^(\d+(?:\.\d+)?)\s*([kKmM]?)W?$/i)
      if (!match) throw new Error('Format: "40" or "5.5" (number only)')
      const num = parseFloat(match[1])
      const unit = match[2].toLowerCase()
      if (unit === 'k') return `${num * 1000}`
      if (unit === 'm') return `${num / 1000}`
      return `${num}`
    },
    work_area: (value: string) => {
      const match = value.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|in)?$/i)
      if (!match) throw new Error('Format: "400x400 mm" (no spaces around x)')
      let w = parseFloat(match[1])
      let h = parseFloat(match[2])
      const unit = match[3]?.toLowerCase() || 'mm'
      
      if (unit === 'cm') { w *= 10; h *= 10 }
      if (unit === 'in') { w *= 25.4; h *= 25.4 }
      
      return `${Math.round(w)}x${Math.round(h)} mm`
    },
    speed: (value: string) => {
      const match = value.match(/^(\d+(?:\.\d+)?)\s*(mm\/min|mm\/s|m\/min)?$/i)
      if (!match) throw new Error('Format: "1200 mm/s"')
      let speed = parseFloat(match[1])
      const unit = match[2]?.toLowerCase() || 'mm/s'
      
      if (unit === 'mm/min') speed /= 60
      if (unit === 'm/min') speed = (speed * 1000) / 60
      
      return `${Math.round(speed)} mm/s`
    },
    rating: (value: string) => {
      const num = parseFloat(value)
      if (isNaN(num) || num < 0 || num > 5) throw new Error('Rating must be 0-5')
      return num.toString()
    }
  }

  // Validate a field value
  function validateField(field: string, value: string): { isValid: boolean; message: string; formattedValue?: string } {
    if (!value || value.trim() === '') {
      return { isValid: true, message: '' }
    }

    try {
      if (field in validateAndFormat) {
        const formatter = validateAndFormat[field as keyof typeof validateAndFormat]
        const formattedValue = formatter(value)
        return { isValid: true, message: '', formattedValue }
      }
      return { isValid: true, message: '' }
    } catch (error) {
      return { isValid: false, message: error instanceof Error ? error.message : 'Invalid value' }
    }
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
    
    // Only add selected images if there are any
    if (selectedImages.length > 0) {
      console.log("Selected images to apply:", selectedImages);
      
      // Remove any duplicates within the selectedImages array itself
      const uniqueSelectedImages = [...new Set(selectedImages)];
      
      console.log("Unique selected images:", uniqueSelectedImages);
      
      // Add the deduplicated selected images
      updatedData.images = uniqueSelectedImages;
      
      // Only set the primary image from scraped data if:
      // 1. We don't already have an image_url
      // 2. The user selected at least one image
      if (!machine?.image_url && uniqueSelectedImages.length > 0) {
        updatedData.image_url = uniqueSelectedImages[0];
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
                                      <div>{formatDisplayValue(diff.field, diff.currentValue, brands)}</div>
                                    </div>
                                    <div className="text-sm p-3 bg-green-50 rounded">
                                      <div className="text-green-600 text-xs font-medium mb-1">New</div>
                                      {editingField === diff.field ? (
                                        <div className="space-y-2">
                                          {hasDropdownOptions(diff.field) ? (
                                            <Select value={editingValue} onValueChange={handleFieldValueChange}>
                                              <SelectTrigger className={`w-full ${validationError ? 'border-red-500' : ''}`}>
                                                <SelectValue placeholder="Select option" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {getDropdownOptions(diff.field).map(option => (
                                                  <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <Input
                                              value={editingValue}
                                              onChange={(e) => handleFieldValueChange(e.target.value)}
                                              className={`w-full ${validationError ? 'border-red-500' : ''}`}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  saveEditedValue();
                                                } else if (e.key === 'Escape') {
                                                  cancelEditing();
                                                }
                                              }}
                                            />
                                          )}
                                          {validationError && (
                                            <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                              <AlertCircle className="h-3 w-3" />
                                              {validationError}
                                            </div>
                                          )}
                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              onClick={saveEditedValue}
                                              disabled={!!validationError}
                                              className="h-6 px-2 text-xs"
                                            >
                                              ✓
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={cancelEditing}
                                              className="h-6 px-2 text-xs"
                                            >
                                              ✕
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <div>{formatDisplayValue(diff.field, diff.newValue, brands)}</div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => startEditing(diff.field, diff.newValue)}
                                            className="h-6 px-2 text-xs opacity-60 hover:opacity-100"
                                          >
                                            Edit
                                          </Button>
                                        </div>
                                      )}
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
                                    <div>{formatDisplayValue(diff.field, diff.currentValue, brands)}</div>
                                  </div>
                                  <div className="text-sm p-3 bg-green-50 rounded">
                                    <div className="text-green-600 text-xs font-medium mb-1">New</div>
                                    {editingField === diff.field ? (
                                      <div className="space-y-2">
                                        {hasDropdownOptions(diff.field) ? (
                                          <Select value={editingValue} onValueChange={handleFieldValueChange}>
                                            <SelectTrigger className={`w-full ${validationError ? 'border-red-500' : ''}`}>
                                              <SelectValue placeholder="Select option" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {getDropdownOptions(diff.field).map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            value={editingValue}
                                            onChange={(e) => handleFieldValueChange(e.target.value)}
                                            className={`w-full ${validationError ? 'border-red-500' : ''}`}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveEditedValue();
                                              } else if (e.key === 'Escape') {
                                                cancelEditing();
                                              }
                                            }}
                                          />
                                        )}
                                        {validationError && (
                                          <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {validationError}
                                          </div>
                                        )}
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            onClick={saveEditedValue}
                                            disabled={!!validationError}
                                            className="h-6 px-2 text-xs"
                                          >
                                            ✓
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={cancelEditing}
                                            className="h-6 px-2 text-xs"
                                          >
                                            ✕
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <div>{formatDisplayValue(diff.field, diff.newValue, brands)}</div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => startEditing(diff.field, diff.newValue)}
                                          className="h-6 px-2 text-xs opacity-60 hover:opacity-100"
                                        >
                                          Edit
                                        </Button>
                                      </div>
                                    )}
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