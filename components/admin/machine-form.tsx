"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createMachine, updateMachine } from "@/lib/services/machine-service"
import { createBrand, getBrands } from "@/lib/services/brand-service"
import type { Machine, Category, Brand, BrandFromDB } from "@/lib/database-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { FileUpload } from "@/components/admin/file-upload"
import { MachineUrlScraper } from "@/components/admin/machine-url-scraper"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, X, Star, StarOff, Trash, ImageIcon, RefreshCw } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  machine_name: z.string().min(2, {
    message: "Machine name must be at least 2 characters.",
  }),
  slug: z.string().min(2, {
    message: "Slug must be at least 2 characters.",
  }).optional(),
  company: z.string().min(1, {
    message: "Company (brand) selection is required.",
  }),
  machine_category: z.string().optional(),
  laser_category: z.string().optional(),
  price: z.coerce.number().optional(),
  rating: z.coerce.number().min(0).max(10).optional().nullable(),
  award: z.string().optional().nullable().transform(val => val === null ? "" : val),
  laser_type_a: z.string().optional(),
  laser_power_a: z.string().optional(),
  laser_type_b: z.string().optional().nullable().transform(val => val === null || val === "none" ? "" : val),
  laser_power_b: z.string().optional().nullable().transform(val => val === null ? "" : val),
  work_area: z.string().optional(),
  speed: z.string().optional(),
  height: z.string().optional().nullable().transform(val => val === null ? "" : val),
  machine_size: z.string().optional(),
  acceleration: z.string().optional().nullable().transform(val => val === null ? "" : val),
  laser_frequency: z.string().optional().nullable().transform(val => val === null ? "" : val),
  pulse_width: z.string().optional().nullable().transform(val => val === null ? "" : val),
  focus: z.string().optional().nullable().transform(val => val === null || val === "none" ? "" : val),
  enclosure: z.boolean().default(false),
  wifi: z.boolean().default(false),
  camera: z.boolean().default(false),
  passthrough: z.boolean().default(false),
  controller: z.string().optional().nullable().transform(val => val === null ? "" : val),
  software: z.string().optional().nullable().transform(val => val === null ? "" : val),
  warranty: z.string().optional().nullable().transform(val => val === null ? "" : val),
  laser_source_manufacturer: z.string().optional().nullable().transform(val => val === null ? "" : val),
  excerpt_short: z.string().optional().nullable().transform(val => val === null ? "" : val),
  description: z.string().optional().nullable().transform(val => val === null ? "" : val),
  highlights: z.string().optional().nullable().transform(val => val === null ? "" : val),
  drawbacks: z.string().optional().nullable().transform(val => val === null ? "" : val),
  is_featured: z.boolean().default(false),
  hidden: z.boolean().default(true),
  image_url: z.string().optional(),
  product_link: z.string().optional().nullable().transform(val => val === null ? "" : val),
  affiliate_link: z.string().optional().nullable().transform(val => val === null ? "" : val),
  youtube_review: z.string().optional().nullable().transform(val => val === null ? "" : val),
}).refine((data) => {
  // If machine is not hidden (publicly visible), validate essential fields
  if (data.hidden === false) {
    // Check essential marketing fields
    if (!data.company || !data.machine_category || !data.laser_category || 
        !data.price || !data.image_url) {
      return false;
    }
    
    // Check essential specifications
    if (!data.laser_type_a || !data.laser_power_a || !data.work_area || !data.speed) {
      return false;
    }
  }
  
  return true;
}, {
  message: "Required fields must be filled before publishing.",
  path: ["hidden"], // Show error on the hidden field
});

// Type for the form data
export type MachineFormData = z.infer<typeof formSchema> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  images?: string[]; // Array of image URLs for multiple images
}

interface MachineFormProps {
  machine?: MachineFormData
  categories: Category[]
  brands: BrandFromDB[]
}

// Add a new component for required field labels
const RequiredFormLabel = ({ children }: { children: React.ReactNode }) => (
  <FormLabel className="flex items-center">
    {children}
    <span className="text-red-500 ml-1">*</span>
  </FormLabel>
);

// Add a new component for publishing-required field labels
const PublishRequiredFormLabel = ({ children }: { children: React.ReactNode }) => (
  <FormLabel className="flex items-center">
    {children}
    <span className="text-blue-500 ml-1">†</span>
  </FormLabel>
);

// Publication requirements checklist component
interface RequirementItemProps {
  label: string;
  isComplete: boolean;
  sectionId: string;
  tabId?: string;
  currentTab: string;
  onTabChange: (tabId: string) => void;
}

const RequirementItem = ({ label, isComplete, sectionId, tabId, currentTab, onTabChange }: RequirementItemProps) => (
  <li className="flex items-center space-x-2">
    <span className={`inline-flex items-center justify-center rounded-full w-5 h-5 ${
      isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
    }`}>
      {isComplete ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      )}
    </span>
    <a 
      href={`#${sectionId}`} 
      className={`text-sm ${isComplete ? 'text-gray-600' : 'text-blue-600 font-medium'}`}
      onClick={(e) => {
        e.preventDefault();
        // Switch to the correct tab if needed
        if (tabId && currentTab !== tabId) {
          onTabChange(tabId);
        }
        // Need a small delay to ensure the tab content is visible before scrolling
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }}
    >
      {label}
    </a>
  </li>
);

interface PublicationRequirementsProps {
  formValues: any;
  showRequirements: boolean;
  currentTab: string;
  onTabChange: (tabId: string) => void;
}

const PublicationRequirementsChecklist = ({ formValues, showRequirements, currentTab, onTabChange }: PublicationRequirementsProps) => {
  if (!showRequirements) return null;
  
  // Define requirements
  const marketingRequirements = [
    { label: "Company (Brand)", value: formValues.company, sectionId: "basic-section", tabId: "basic" },
    { label: "Machine Category", value: formValues.machine_category, sectionId: "basic-section", tabId: "basic" },
    { label: "Laser Category", value: formValues.laser_category, sectionId: "basic-section", tabId: "basic" },
    { label: "Price", value: formValues.price, sectionId: "basic-section", tabId: "basic" },
    { label: "Image URL", value: formValues.image_url, sectionId: "media-section", tabId: "media" },
  ];
  
  const specRequirements = [
    { label: "Laser Type A", value: formValues.laser_type_a, sectionId: "laser-config", tabId: "specs" },
    { label: "Laser Power A", value: formValues.laser_power_a, sectionId: "laser-config", tabId: "specs" },
    { label: "Work Area", value: formValues.work_area, sectionId: "physical-specs", tabId: "specs" },
    { label: "Speed", value: formValues.speed, sectionId: "tech-specs", tabId: "specs" },
  ];
  
  // Count completed requirements
  const completedMarketing = marketingRequirements.filter(req => !!req.value).length;
  const completedSpecs = specRequirements.filter(req => !!req.value).length;
  const totalRequired = marketingRequirements.length + specRequirements.length;
  const totalCompleted = completedMarketing + completedSpecs;
  const progress = Math.round((totalCompleted / totalRequired) * 100);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-blue-800">Publication Requirements</h4>
        <span className="text-sm font-medium text-blue-800">{totalCompleted}/{totalRequired} Complete</span>
      </div>
      
      <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h5 className="font-medium text-sm text-blue-700 mb-2">Essential Marketing</h5>
          <ul className="space-y-2">
            {marketingRequirements.map((req, index) => (
              <RequirementItem 
                key={index}
                label={req.label}
                isComplete={!!req.value}
                sectionId={req.sectionId}
                tabId={req.tabId}
                currentTab={currentTab}
                onTabChange={onTabChange}
              />
            ))}
          </ul>
        </div>
        
        <div>
          <h5 className="font-medium text-sm text-blue-700 mb-2">Essential Specifications</h5>
          <ul className="space-y-2">
            {specRequirements.map((req, index) => (
              <RequirementItem 
                key={index}
                label={req.label}
                isComplete={!!req.value}
                sectionId={req.sectionId}
                tabId={req.tabId}
                currentTab={currentTab}
                onTabChange={onTabChange}
              />
            ))}
          </ul>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-blue-700">
        <p>A machine must have all required fields completed before it can be published (not hidden).</p>
      </div>
    </div>
  );
};

// Create New Brand Dialog Component
function CreateBrandDialog({ onBrandCreated, isOpen, onOpenChange }: { 
  onBrandCreated: (brand: any) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createBrandForm = useForm({
    resolver: zodResolver(
      z.object({
        Name: z.string().min(2, "Brand name must be at least 2 characters."),
        Website: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
      })
    ),
    defaultValues: {
      Name: "",
      Website: "",
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
  };

  const onCreateBrandSubmit = async (values: { Name: string; Website?: string }) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const brandData = {
        Name: values.Name,
        Slug: generateSlug(values.Name),
        Website: values.Website || null,
        Logo: null,
      };
      
      const result = await createBrand(brandData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        // Call the callback with the new brand data
        onBrandCreated(result.data);
        
        // Reset form and close dialog
        createBrandForm.reset();
        onOpenChange(false);
      } else {
        throw new Error("Failed to create brand. No data returned.");
      }
    } catch (error: any) {
      console.error("Error creating brand:", error);
      setError(error?.message || "An error occurred while creating the brand");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Brand</DialogTitle>
          <DialogDescription>
            Add a new brand to the system. This will be available immediately for selection.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={createBrandForm.handleSubmit(onCreateBrandSubmit)} className="space-y-4 py-4">
          <FormField
            control={createBrandForm.control}
            name="Name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter brand name" autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={createBrandForm.control}
            name="Website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {error && (
            <div className="bg-red-50 text-red-800 px-4 py-2 rounded border border-red-200">
              {error}
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Quick Add Machine Dialog Component
function QuickAddMachineDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Simple form for quick add
  const quickAddForm = useForm({
    resolver: zodResolver(
      z.object({
        machine_name: z.string().min(2, "Machine name must be at least 2 characters."),
        product_url: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
      })
    ),
    defaultValues: {
      machine_name: "",
      product_url: "",
    },
  });

  // Generate slug from name
  function generateQuickSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
  }

  // Submit handler for quick add
  async function onQuickSubmit(values: { machine_name: string; product_url?: string }) {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create minimal machine data with auto-generated slug
      const machineData = {
        machine_name: values.machine_name,
        slug: generateQuickSlug(values.machine_name),
        hidden: true,
      };
      
      // Create the machine
      const result = await createMachine(machineData as any);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data?.id) {
        // If product URL was provided, redirect to edit page to scrape it
        if (values.product_url) {
          // Store URL in localStorage for immediate scraping on edit page
          localStorage.setItem('pending_scrape_url', values.product_url);
        }
        
        // Navigate to the edit page for the new machine
        router.push(`/admin/machines/${result.data.id}`);
      } else {
        throw new Error("Failed to create machine. No ID returned.");
      }
    } catch (error: any) {
      console.error("Error creating machine:", error);
      setError(error?.message || "An error occurred while creating the machine");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          + Quick Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Add Machine</DialogTitle>
          <DialogDescription>
            Create a new machine with minimal information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={quickAddForm.handleSubmit(onQuickSubmit)} className="space-y-4 py-4">
          <FormField
            control={quickAddForm.control}
            name="machine_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter machine name" autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={quickAddForm.control}
            name="product_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product URL (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://example.com/product" />
                </FormControl>
                <FormDescription>
                  If provided, we'll scrape this URL after creating the machine
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {error && (
            <div className="bg-red-50 text-red-800 px-4 py-2 rounded border border-red-200">
              {error}
            </div>
          )}
          
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Machine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MachineForm({ machine, categories, brands }: MachineFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationEnabled, setValidationEnabled] = useState(false)
  const [openRequirements, setOpenRequirements] = useState(false)
  const [currentTab, setCurrentTab] = useState("basic")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createdMachine, setCreatedMachine] = useState<any>(null)
  const [cloneSource, setCloneSource] = useState<string | null>(null)
  const [brandOptions, setBrandOptions] = useState<any[]>([])
  const [showRequirements, setShowRequirements] = useState(false)
  const [showCreateBrand, setShowCreateBrand] = useState(false)
  const [machineImages, setMachineImages] = useState<string[]>(
    machine?.images && Array.isArray(machine.images) ? machine.images : 
    machine?.image_url ? [machine.image_url] : []
  )
  const [isScraperOpen, setIsScraperOpen] = useState(false)
  
  // Add missing state variables
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitAction, setSubmitAction] = useState<string | null>(null)
  
  // Track the primary image separately (usually the first one)
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0)
  // Add state for image URL input
  const [imageUrlInput, setImageUrlInput] = useState('')
  
  const isNew = !machine?.id;
  
  // Debug logging for images data
  useEffect(() => {
    console.log('Machine images received:', machine?.images);
    console.log('Machine primary image:', machine?.image_url);
    console.log('Initialized machineImages state:', machineImages);
  }, [machine?.images, machine?.image_url, machineImages]);
  
  // Auto-hide success message after 3 seconds for updates
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (confirmAction && machine?.id) {
      timer = setTimeout(() => {
        setConfirmAction(null);
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [confirmAction, machine?.id]);

  // Debug logging for brand data
  console.log('Brands data received:', brands);
  console.log('Machine company value:', machine?.company);
  
  // Process brand data on component mount
  useEffect(() => {
    if (brands && brands.length > 0) {
      // Make sure we have properly formatted brand data for the dropdown
      const processedBrands = brands.map(brand => ({
        id: brand.id,
        name: brand.Name || '',
        value: brand.Slug || '',  // This must match exactly the Slug in brands table
      })).sort((a, b) => a.name.localeCompare(b.name));
      console.log('Processed brands:', processedBrands);
      setBrandOptions(processedBrands);
    }
  }, [brands]);
  
  // Handle new brand creation
  const handleBrandCreated = async (newBrand: any) => {
    try {
      // Refetch all brands to ensure we have the latest data
      const brandsResponse = await getBrands();
      
      if (brandsResponse.data) {
        // Process the refreshed brands data
        const processedBrands = brandsResponse.data.map((brand: any) => ({
          id: brand.id,
          name: brand.Name || '',
          value: brand.Slug || '',
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        // Update the brand options with fresh data
        setBrandOptions(processedBrands);
        
        // Automatically select the new brand
        form.setValue('company', newBrand.Slug);
        
        // Show success message
        setError(null);
        setShowConfirmation(true);
        setConfirmAction('brand-created');
        setTimeout(() => setShowConfirmation(false), 3000);
      } else {
        // Fallback to adding just the new brand if API fails
        const newBrandOption = {
          id: newBrand.id,
          name: newBrand.Name,
          value: newBrand.Slug,
        };
        
        setBrandOptions(prev => [...prev, newBrandOption]);
        form.setValue('company', newBrand.Slug);
        
        setError(null);
        setShowConfirmation(true);
        setConfirmAction('brand-created');
        setTimeout(() => setShowConfirmation(false), 3000);
      }
    } catch (error) {
      console.error('Error refreshing brands:', error);
      
      // Fallback to adding just the new brand if refresh fails
      const newBrandOption = {
        id: newBrand.id,
        name: newBrand.Name,
        value: newBrand.Slug,
      };
      
      setBrandOptions(prev => [...prev, newBrandOption]);
      form.setValue('company', newBrand.Slug);
      
      setError(null);
      setShowConfirmation(true);
      setConfirmAction('brand-created');
      setTimeout(() => setShowConfirmation(false), 3000);
    }
  };
  
  // Function to generate a slug from the machine name
  const generateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    
    form.setValue("slug", slug);
  };
  
  // Add navigation handlers
  const continueEditing = () => {
    setSubmitAction('continue');
    form.handleSubmit(onSubmit)();
  };
  
  const createAnother = () => {
    setSubmitAction('createAnother');
    form.handleSubmit(onSubmit)();
  };
  
  const goToMachines = () => {
    router.push("/admin/machines");
  };
  
  // Add tab change handler
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
  };
  
  // Initialize form with existing machine data or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      machine_name: machine?.machine_name || "",
      slug: machine?.slug || "",
      company: machine?.company || "",
      machine_category: machine?.machine_category || "",
      laser_category: machine?.laser_category || "",
      price: machine?.price || undefined,
      rating: machine?.rating || undefined,
      award: machine?.award || "",
      laser_type_a: machine?.laser_type_a || "",
      laser_power_a: machine?.laser_power_a || "",
      laser_type_b: machine?.laser_type_b || "",
      laser_power_b: machine?.laser_power_b || "",
      work_area: machine?.work_area || "",
      speed: machine?.speed || "",
      height: machine?.height || "",
      machine_size: machine?.machine_size || "",
      acceleration: machine?.acceleration || "",
      laser_frequency: machine?.laser_frequency || "",
      pulse_width: machine?.pulse_width || "",
      focus: machine?.focus || "",
      enclosure: machine?.enclosure || false,
      wifi: machine?.wifi || false,
      camera: machine?.camera || false,
      passthrough: machine?.passthrough || false,
      controller: machine?.controller || "",
      software: machine?.software || "",
      warranty: machine?.warranty || "",
      laser_source_manufacturer: machine?.laser_source_manufacturer || "",
      excerpt_short: machine?.excerpt_short || "",
      description: machine?.description || "",
      highlights: machine?.highlights || "",
      drawbacks: machine?.drawbacks || "",
      is_featured: machine?.is_featured || false,
      hidden: machine?.hidden ?? true,
      image_url: machine?.image_url || "",
      product_link: machine?.product_link || "",
      affiliate_link: machine?.affiliate_link || "",
      youtube_review: machine?.youtube_review || "",
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit"
  })

  // Log form errors for debugging
  useEffect(() => {
    const subscription = form.watch(() => {
      const errors = form.formState.errors;
      if (Object.keys(errors).length > 0) {
        console.log("Form errors:", errors);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Get current form values for publication requirements checklist
  const watchedFields = form.watch();
  
  // Check if machine can be published
  const canPublish = () => {
    const values = form.getValues();
    // Essential marketing fields
    if (!values.company || !values.machine_category || !values.laser_category || 
        !values.price || !values.image_url) {
      return false;
    }
    
    // Essential specifications
    if (!values.laser_type_a || !values.laser_power_a || !values.work_area || !values.speed) {
      return false;
    }
    
    return true;
  };

  // Handle updates from the MachineUrlScraper component
  const handleScrapedUpdates = (updates: Partial<MachineFormData>) => {
    console.log("Received scraped updates:", updates)
    
    // Validate company/brand if present
    if (updates.company) {
      // Check if it's a valid brand slug
      const validBrand = brandOptions.find(brand => brand.value === updates.company);
      if (!validBrand) {
        // Try to find a matching brand by name instead
        const matchByName = brandOptions.find(brand => 
          brand.name.toLowerCase() === updates.company?.toLowerCase());
        
        if (matchByName) {
          // Update to use the correct slug value
          console.log(`Correcting brand from "${updates.company}" to "${matchByName.value}"`);
          updates.company = matchByName.value;
        } else {
          // If no match found, log a warning and remove the invalid company value
          console.warn(`Invalid brand value from scraper: ${updates.company}`);
          setError(`Warning: Brand "${updates.company}" not found in the database. Please select a valid brand.`);
          delete updates.company;
        }
      }
    }
    
    // Update form fields with the scraped data
    Object.entries(updates).forEach(([key, value]) => {
      // Skip null/undefined values
      if (value === null || value === undefined) return
      
      // Handle arrays and objects specially
      if (key === 'images' && Array.isArray(value)) {
        console.log("Processing scraped images:", {
          newImages: value,
          existingImages: machineImages,
          existingPrimaryImage: form.getValues('image_url')
        });
        
        // Create a Set to remove duplicates
        // First get all existing images in a Set for fast lookups
        const existingImagesSet = new Set(machineImages);
        
        // Filter out images that already exist in the current set
        const newUniqueImages = value.filter(img => !existingImagesSet.has(img));
        
        console.log("New unique images (not already in gallery):", newUniqueImages);
        
        // Only add new unique images to the existing images
        const updatedImages = [...machineImages, ...newUniqueImages];
        
        console.log("Updated images after filtering duplicates:", updatedImages);
        
        // Update the machineImages state with the deduplicated images
        setMachineImages(updatedImages);
        
        // Only update primary image if we didn't have any images before
        if (machineImages.length === 0 && newUniqueImages.length > 0) {
          console.log("Setting first new image as primary:", newUniqueImages[0]);
          setPrimaryImageIndex(0);
          form.setValue('image_url', newUniqueImages[0]);
        }
      } else {
        // Handle regular form fields
        form.setValue(key as any, value)
      }
    })
    
    // Show confirmation message
    setError(null);
    setShowConfirmation(true);
    setConfirmAction('scraper');
    setTimeout(() => setShowConfirmation(false), 3000);
    
    // Close the scraper modal after applying updates
    setIsScraperOpen(false);
  }

  // Function to add a new image to the gallery
  const addImageToGallery = (url: string) => {
    setMachineImages(prev => [...prev, url])
    
    // If this is the first image, set it as primary and update image_url
    if (machineImages.length === 0) {
      setPrimaryImageIndex(0)
      form.setValue('image_url', url)
    }
    
    // Log the updated image gallery for debugging
    console.log('Added image to gallery:', url);
    console.log('Updated machineImages:', [...machineImages, url]);
  }
  
  // Function to remove an image from the gallery
  const removeImageFromGallery = (index: number) => {
    setMachineImages(prev => {
      const updated = [...prev]
      updated.splice(index, 1)
      
      // If we removed the primary image, update the primary index
      if (index === primaryImageIndex) {
        // If there are other images, set the first one as primary
        if (updated.length > 0) {
          setPrimaryImageIndex(0)
          form.setValue('image_url', updated[0])
        } else {
          // If no images left, clear image_url
          setPrimaryImageIndex(-1)
          form.setValue('image_url', '')
        }
      } 
      // If we removed an image before the primary one, adjust the primary index
      else if (index < primaryImageIndex) {
        setPrimaryImageIndex(prev => prev - 1)
      }
      
      return updated
    })
  }
  
  // Function to set an image as the primary one
  const setAsPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index)
    form.setValue('image_url', machineImages[index])
  }

  // Add this code to check for pending scrape URL on component mount
  useEffect(() => {
    if (machine?.id) {
      const pendingScrapeUrl = localStorage.getItem('pending_scrape_url');
      if (pendingScrapeUrl) {
        // Remove it from storage to prevent repeated scraping
        localStorage.removeItem('pending_scrape_url');
        
        // Set the URL to the product_link field
        form.setValue('product_link', pendingScrapeUrl);
        
        // Trigger scraping if a component reference is available
        // This could be implemented with a ref to the MachineUrlScraper component
        // For simplicity, just set the URL and let the user click the scrape button
      }
    }
  }, [machine?.id]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    setSubmitSuccess(false)
    setSubmitError(null)
    
    try {
      // Add images array to the data
      const submissionData = {
        ...values,
        images: machineImages
      }
      
      console.log('Submitting form with image data:', {
        primaryImage: values.image_url,
        allImages: machineImages
      });
      
      if (isNew) {
        await createMachine(submissionData as any)
      } else {
        // Ensure machine.id is not undefined before passing to updateMachine
        if (!machine?.id) {
          throw new Error("Machine ID is required for updates");
        }
        await updateMachine(machine.id, submissionData as any)
      }
      
      setSubmitSuccess(true)
      
      // Route to appropriate page based on the button used
      if (submitAction === 'continue') {
        // Stay on the page and show success
        setShowConfirmation(true);
        setConfirmAction('continue');
      } else if (submitAction === 'createAnother' && isNew) {
        router.push("/admin/machines/new")
      } else {
        // Default - go to machines list
        router.push("/admin/machines")
      }
    } catch (error) {
      console.error("Submission error:", error)
      setSubmitError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setIsScraperOpen(true)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh from URL
            </Button>
            
            {isNew && <QuickAddMachineDialog />}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={continueEditing}>
              Save & Continue Editing
            </Button>
            
            {isNew && (
              <Button type="button" variant="outline" onClick={createAnother}>
                Save & Create Another
              </Button>
            )}
            
            <Button type="button" variant="ghost" onClick={goToMachines}>
              Cancel
            </Button>
          </div>
        </div>
        
        {/* Success message */}
        {showConfirmation && (
          <div className="bg-green-50 text-green-800 px-4 py-2 rounded border border-green-200">
            {confirmAction === 'continue' ? 'Changes saved successfully!' : 
             confirmAction === 'create' ? 'Machine created! Creating another...' : 
             confirmAction === 'scraper' ? 'Machine data updated from URL!' :
             confirmAction === 'brand-created' ? 'Brand created and selected successfully!' :
             'Machine saved successfully!'}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-800 px-4 py-2 rounded border border-red-200">
            {error}
          </div>
        )}

        <Tabs defaultValue="basic" value={currentTab} onValueChange={handleTabChange}>
          <div className="flex flex-col space-y-4">
            <TabsList className="w-full justify-start border-b">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="media">Media & Links</TabsTrigger>
            </TabsList>
          </div>

          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <Card>
              <CardContent className="pt-6">
                <div id="basic-section" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-6 border-b">
                  <div className="col-span-2">
                    <h3 className="text-base font-medium mb-4">Basic Details</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="machine_name"
                    render={({ field }) => (
                      <FormItem>
                        <RequiredFormLabel>Machine Name</RequiredFormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Only regenerate slug if this is a new machine or slug is empty
                              if (!machine?.id || !form.getValues("slug")) {
                                generateSlug(e.target.value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>URL-friendly name</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <PublishRequiredFormLabel>Company (Brand)</PublishRequiredFormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                              <SelectContent>
                                {brandOptions.map((brand) => (
                                  <SelectItem key={brand.id} value={brand.value}>
                                    {brand.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCreateBrand(true)}
                              className="flex items-center gap-1 px-3"
                            >
                              <Plus className="h-4 w-4" />
                              New
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="machine_category"
                    render={({ field }) => (
                      <FormItem>
                        <PublishRequiredFormLabel>Machine Category</PublishRequiredFormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="laser">Laser</SelectItem>
                              <SelectItem value="3d-printer">3D Printer</SelectItem>
                              <SelectItem value="cnc">CNC</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="laser_category"
                    render={({ field }) => (
                      <FormItem>
                        <PublishRequiredFormLabel>Laser Category</PublishRequiredFormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select laser category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="desktop-diode-laser">Desktop Diode Laser</SelectItem>
                              <SelectItem value="desktop-co2-laser">Desktop CO2 Laser</SelectItem>
                              <SelectItem value="desktop-fiber-laser">Desktop Fiber Laser</SelectItem>
                              <SelectItem value="fiber-laser">Fiber Laser</SelectItem>
                              <SelectItem value="high-end-co2-laser">High-End CO2 Laser</SelectItem>
                              <SelectItem value="industrial-co2-laser">Industrial CO2 Laser</SelectItem>
                              <SelectItem value="industrial-fiber-laser">Industrial Fiber Laser</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <PublishRequiredFormLabel>Price ($)</PublishRequiredFormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div id="settings-section" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <h3 className="text-base font-medium mb-4">Settings</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating (0-10)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="10" 
                            step="0.1" 
                            {...field} 
                            value={field.value ?? ""}
                            className="border-slate-300"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="award"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Award</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="border-slate-300" />
                        </FormControl>
                        <FormDescription>E.g., "Editor's Choice", "Best Value", etc.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_featured"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 rounded-md border p-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="flex-1 cursor-pointer">Featured Machine</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hidden"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2 rounded-md border p-3">
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                // If trying to set to not hidden (publish), check requirements
                                if (!checked && !canPublish()) {
                                  // Show requirements panel
                                  setShowRequirements(true);
                                  return;
                                }
                                field.onChange(checked);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="flex-1 cursor-pointer">Hidden</FormLabel>
                        </div>
                        
                        {/* Publication requirements */}
                        {field.value === true && (
                          <div className="mt-1">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => setShowRequirements(!showRequirements)}
                            >
                              {showRequirements ? "Hide" : "Show"} publication requirements
                            </Button>
                            
                            <PublicationRequirementsChecklist 
                              formValues={watchedFields} 
                              showRequirements={showRequirements} 
                              currentTab={currentTab}
                              onTabChange={handleTabChange}
                            />
                          </div>
                        )}
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Specifications Tab */}
          <TabsContent value="specs">
            <Card>
              <CardContent className="pt-6">
                {/* Combined Accordion for all specifications */}
                <Accordion type="multiple" defaultValue={["laser-config", "physical-specs", "tech-specs", "features"]}>
                  {/* Laser Configuration */}
                  <AccordionItem value="laser-config" id="laser-config">
                    <AccordionTrigger>Laser Configuration</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <FormField
                          control={form.control}
                          name="laser_type_a"
                          render={({ field }) => (
                            <FormItem>
                              <PublishRequiredFormLabel>Primary Laser Type</PublishRequiredFormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select laser type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Diode">Diode</SelectItem>
                                    <SelectItem value="CO2">CO2</SelectItem>
                                    <SelectItem value="Fiber">Fiber</SelectItem>
                                    <SelectItem value="Galvo">Galvo</SelectItem>
                                    <SelectItem value="UV">UV</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="laser_power_a"
                          render={({ field }) => (
                            <FormItem>
                              <PublishRequiredFormLabel>Primary Laser Power</PublishRequiredFormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 40W or 5.5W" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="laser_type_b"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary Laser Type</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value ?? ""}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select laser type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Diode">Diode</SelectItem>
                                    <SelectItem value="CO2">CO2</SelectItem>
                                    <SelectItem value="Fiber">Fiber</SelectItem>
                                    <SelectItem value="Galvo">Galvo</SelectItem>
                                    <SelectItem value="UV">UV</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="laser_power_b"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary Laser Power</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 40W or 5.5W" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Physical Specs */}
                  <AccordionItem value="physical-specs" id="physical-specs">
                    <AccordionTrigger>Physical Specifications</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <FormField
                          control={form.control}
                          name="work_area"
                          render={({ field }) => (
                            <FormItem>
                              <PublishRequiredFormLabel>Work Area</PublishRequiredFormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 400x400mm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="machine_size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Machine Size</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 750x700x250mm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Z-Axis Height</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 70mm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Technical Specs */}
                  <AccordionItem value="tech-specs" id="tech-specs">
                    <AccordionTrigger>Technical Specifications</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <FormField
                          control={form.control}
                          name="speed"
                          render={({ field }) => (
                            <FormItem>
                              <PublishRequiredFormLabel>Speed</PublishRequiredFormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 400mm/s" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="acceleration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Acceleration</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 8000mm/s²" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="laser_frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Laser Frequency</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    value={field.value ?? ""} 
                                    className="border-slate-300"
                                  />
                                  <span className="absolute right-3 top-2.5 text-sm text-slate-500">Hz</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pulse_width"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pulse Width</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="focus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Focus Type</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value ?? ""}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select focus type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Auto">Auto</SelectItem>
                                    <SelectItem value="Manual">Manual</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="laser_source_manufacturer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Laser Source Manufacturer</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Features Section */}
                  <AccordionItem value="features" id="features">
                    <AccordionTrigger>Features</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <FormField
                          control={form.control}
                          name="enclosure"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 rounded-md border p-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="flex-1 cursor-pointer">Enclosed Design</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="wifi"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 rounded-md border p-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="flex-1 cursor-pointer">WiFi Connectivity</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="camera"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 rounded-md border p-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="flex-1 cursor-pointer">Built-in Camera</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="passthrough"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 rounded-md border p-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="flex-1 cursor-pointer">Pass-Through Slots</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="software"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Software Compatibility</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value ?? ""}
                                  placeholder="e.g. LightBurn, LaserGRBL"
                                />
                              </FormControl>
                              <FormDescription>List compatible software, including LightBurn if applicable</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="controller"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Controller Type</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value ?? ""}
                                  placeholder="e.g. Ruida, GRBL, Custom"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <Card>
              <CardContent className="pt-6">
                <div id="description-section" className="space-y-6 mb-8 pb-8 border-b">
                  <div>
                    <h3 className="text-base font-medium mb-4">Description</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="excerpt_short"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Excerpt</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief summary of the machine (1-2 sentences)"
                            className="min-h-20 border-slate-300"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>A brief summary shown in listings (1-2 sentences)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed description of the machine"
                            className="min-h-32 border-slate-300"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div id="highlights-section" className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium mb-4">Highlights & Drawbacks</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="highlights"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Highlights</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Key strengths and positive features"
                            className="min-h-24 border-slate-300"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>Use bullet points (each on a new line)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="drawbacks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drawbacks</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Limitations or potential issues"
                            className="min-h-24 border-slate-300"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>Use bullet points (each on a new line)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media">
            <Card>
              <CardContent className="pt-6">
                <div id="media-section" className="space-y-6">
                  <div>
                    <PublishRequiredFormLabel>Machine Images</PublishRequiredFormLabel>
                    
                    {/* Images Summary */}
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        {machineImages.length > 0 && (
                          <div className="relative h-10 w-10 rounded-md overflow-hidden border">
                            <Image 
                              src={machineImages[primaryImageIndex]}
                              alt="Primary image"
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <div className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {machineImages.length} {machineImages.length === 1 ? 'image' : 'images'} available
                          </div>
                          {machineImages.length > 0 && (
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                              <Star className="h-3 w-3 mr-1 text-yellow-500" />
                              Primary image set
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Thumbnail Strip - only show when multiple images */}
                      {machineImages.length > 1 && (
                        <div className="flex overflow-x-auto gap-2 pb-2 pl-2 pr-2 -ml-2 -mr-2">
                          {machineImages.map((url, idx) => (
                            <div 
                              key={idx}
                              className={`relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden border cursor-pointer
                                ${idx === primaryImageIndex ? 'ring-2 ring-green-500' : 'hover:opacity-80'}`}
                              onClick={() => setAsPrimaryImage(idx)}
                            >
                              <Image 
                                src={url}
                                alt={`Image ${idx+1}`}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                              {idx === primaryImageIndex && (
                                <div className="absolute bottom-0 inset-x-0 bg-green-500 text-white text-[8px] text-center py-[1px]">
                                  PRIMARY
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Image Gallery */}
                    {machineImages.length > 0 && (
                      <Accordion type="single" collapsible defaultValue="images" className="w-full">
                        <AccordionItem value="images" className="border rounded-md p-0 bg-slate-50 mb-4 overflow-hidden">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <h3 className="text-sm font-medium">Image Gallery ({machineImages.length})</h3>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="px-4 pb-4">
                              {/* Add sorting buttons if needed */}
                              {machineImages.length > 1 && (
                                <div className="text-xs text-slate-500 mb-4">
                                  Drag to reorder (coming soon)
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {machineImages.map((imageUrl, index) => (
                                  <div key={index} className="border rounded-md bg-white p-2 relative group hover:shadow-md transition-shadow">
                                    <div className="relative h-48 w-full overflow-hidden rounded-md">
                                      <Image 
                                        src={imageUrl} 
                                        alt={`Machine image ${index + 1}`}
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                                        onError={(e) => {
                                          // Fallback to placeholder if image fails to load
                                          (e.target as HTMLImageElement).src = "/placeholder-image.svg";
                                        }}
                                      />
                                      
                                      {index === primaryImageIndex && (
                                        <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                                          Primary
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-2">
                                      <Button
                                        variant={index === primaryImageIndex ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setAsPrimaryImage(index)}
                                        disabled={index === primaryImageIndex}
                                        className="text-xs w-1/2"
                                      >
                                        {index === primaryImageIndex ? (
                                          <Star className="h-3 w-3 mr-1 text-yellow-300" />
                                        ) : (
                                          <StarOff className="h-3 w-3 mr-1" />
                                        )}
                                        {index === primaryImageIndex ? "Primary" : "Set Primary"}
                                      </Button>
                                      
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => removeImageFromGallery(index)}
                                        className="text-xs text-red-500 hover:text-red-600 w-1/3"
                                      >
                                        <Trash className="h-3 w-3 mr-1" />
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <p className="text-xs text-muted-foreground mt-4">
                                The primary image will be displayed in lists and as the main product image. Other images will be shown in the product gallery.
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                    
                    {/* Add Image Section */}
                    <Accordion type="single" collapsible defaultValue="add-images" className="w-full">
                      <AccordionItem value="add-images" className="border rounded-md p-0 overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <h3 className="text-sm font-medium flex items-center">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Images
                          </h3>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="px-4 pb-4 space-y-4">
                            <div>
                              <FormLabel className="text-sm text-muted-foreground">Option 1: Upload Image</FormLabel>
                              <FileUpload 
                                onUploadComplete={(url) => {
                                  addImageToGallery(url);
                                  // If we don't have a primary image yet, set this as primary
                                  if (machineImages.length === 0) {
                                    form.setValue("image_url", url);
                                  }
                                }} 
                              />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <FormLabel className="text-sm text-muted-foreground">Option 2: Enter Image URL</FormLabel>
                              <div className="flex gap-2">
                                <Input 
                                  placeholder="https://example.com/image.jpg" 
                                  value={imageUrlInput || ""}
                                  onChange={(e) => setImageUrlInput(e.target.value)}
                                  className="flex-1"
                                />
                                <Button 
                                  variant="secondary"
                                  disabled={!imageUrlInput}
                                  onClick={() => {
                                    if (imageUrlInput) {
                                      addImageToGallery(imageUrlInput);
                                      setImageUrlInput("");
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    <FormDescription>
                      Upload product images or enter image URLs. Images should be in JPG, PNG or WebP format.
                      For best results, use images with a white background and at least 1200px width.
                    </FormDescription>
                    {form.formState.errors.image_url && (
                      <p className="text-sm font-medium text-destructive mt-2">
                        {form.formState.errors.image_url.message}
                      </p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="youtube_review"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube Review URL</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                        </FormControl>
                        <FormDescription>Full YouTube URL or video ID</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="product_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Link</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                        </FormControl>
                        <FormDescription>Official product page or manufacturer link</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="affiliate_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Affiliate Link</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                        </FormControl>
                        <FormDescription>Affiliate or commission link for purchases</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Scraper Modal - Rendered conditionally based on parent state */} 
        {isScraperOpen && (
          <MachineUrlScraper 
            machine={machine}
            onUpdateMachine={handleScrapedUpdates}
            isOpen={isScraperOpen}
            onOpenChange={setIsScraperOpen}
          />
        )}
        
        {/* Create Brand Modal */}
        <CreateBrandDialog 
          isOpen={showCreateBrand}
          onOpenChange={setShowCreateBrand}
          onBrandCreated={handleBrandCreated}
        />

      </form>
    </Form>
  )
}

