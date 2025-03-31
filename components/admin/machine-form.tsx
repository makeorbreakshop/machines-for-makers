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
import Image from "next/image"

// Define the form schema
const formSchema = z.object({
  machine_name: z.string().min(2, {
    message: "Machine name must be at least 2 characters.",
  }),
  slug: z.string().min(2, {
    message: "Slug must be at least 2 characters.",
  }).optional(),
  company: z.string().optional(),
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

export function MachineForm({ machine, categories, brands }: MachineFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [createdMachine, setCreatedMachine] = useState<any>(null)
  const [cloneSource, setCloneSource] = useState<string | null>(null)
  const [brandOptions, setBrandOptions] = useState<any[]>([])
  const [currentTab, setCurrentTab] = useState("basic")
  const [showRequirements, setShowRequirements] = useState(false)
  
  // Auto-hide success message after 3 seconds for updates
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (successMessage && machine?.id) {
      timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [successMessage, machine?.id]);

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
        value: brand.Slug || '',
      }));
      console.log('Processed brands:', processedBrands);
      setBrandOptions(processedBrands);
    }
  }, [brands]);
  
  // Initialize form with existing machine data or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: machine
      ? {
          ...machine,
          price: machine.price || undefined,
          rating: machine.rating || undefined,
          laser_type_b: machine.laser_type_b === "" ? "none" : machine.laser_type_b ?? "none",
          laser_power_b: machine.laser_power_b ?? "",
          height: machine.height ?? "",
          acceleration: machine.acceleration ?? "",
          laser_frequency: machine.laser_frequency ?? "",
          pulse_width: machine.pulse_width ?? "",
          focus: machine.focus === "" ? "none" : machine.focus ?? "none",
          controller: machine.controller ?? "",
          software: machine.software ?? "",
          warranty: machine.warranty ?? "",
          laser_source_manufacturer: machine.laser_source_manufacturer ?? "",
          excerpt_short: machine.excerpt_short ?? "",
          description: machine.description ?? "",
          highlights: machine.highlights ?? "",
          drawbacks: machine.drawbacks ?? "",
          affiliate_link: machine.affiliate_link ?? "",
          youtube_review: machine.youtube_review ?? "",
          product_link: machine.product_link ?? "",
        }
      : {
          machine_name: "",
          slug: "",
          is_featured: false,
          hidden: true,
          enclosure: false,
          wifi: false,
          camera: false,
          passthrough: false,
          laser_type_b: "none",
          laser_power_b: "",
          height: "",
          acceleration: "",
          laser_frequency: "",
          pulse_width: "",
          focus: "none",
          controller: "",
          software: "",
          warranty: "",
          laser_source_manufacturer: "",
          excerpt_short: "",
          description: "",
          highlights: "",
          drawbacks: "",
          affiliate_link: "",
          youtube_review: "",
          product_link: "",
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

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setSuccessMessage(null)

    console.log("Form submission started with values:", JSON.stringify(values, null, 2))
    console.log("Current machine ID:", machine?.id)

    try {
      if (machine && machine.id) {
        // Update existing machine
        console.log("Updating existing machine with ID:", machine.id)
        const result = await updateMachine(machine.id, values as any)
        console.log("Update response:", result)
        
        if (result.error) {
          console.error("Error updating machine:", result.error)
          throw new Error(result.error)
        } else {
          console.log("Machine updated successfully")
          setSuccessMessage("Machine updated successfully!")
          // Stay on the current page instead of redirecting
          router.refresh() // Just refresh the data on the current page
        }
      } else {
        // Create new machine
        console.log("Creating new machine")
        const result = await createMachine(values as any)
        console.log("Create response:", result)
        
        if (result.data) {
          setCreatedMachine(result.data)
          setSuccessMessage(result.message || "Machine created successfully!")
          
          // Reset form if staying on the page
          if (!result.error) {
            form.reset({
              machine_name: "",
              slug: "",
              is_featured: false,
              hidden: true,
              enclosure: false,
              wifi: false,
              camera: false,
              passthrough: false,
            })
          }
        } else if (result.error) {
          throw new Error(result.error);
        }
      }
    } catch (error: any) {
      console.error("Error saving machine:", error?.message || String(error), error?.stack || '')
      setSuccessMessage(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate slug from machine name
  function generateSlug(name: string) {
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-")

    form.setValue("slug", slug)
  }

  // Continue editing the newly created machine
  function continueEditing() {
    if (createdMachine?.id) {
      router.push(`/admin/machines/${createdMachine.id}`)
    }
  }

  // Create another machine
  function createAnother() {
    setSuccessMessage(null)
    setCreatedMachine(null)
    form.reset({
      machine_name: "",
      slug: "",
      is_featured: false,
      hidden: true,
    })
  }

  // Go to machines list
  function goToMachines() {
    router.push("/admin/machines")
    router.refresh()
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    console.log(`Tab changing from ${currentTab} to ${value}`)
    try {
      setCurrentTab(value)
    } catch (error) {
      console.error(`Error changing to tab ${value}:`, error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Quick Clone Selection */}
        <div className="flex flex-col md:flex-row gap-2 justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push("/admin/machines")}
              size="sm"
            >
              ← Back to Machines
            </Button>
            <h2 className="text-lg font-semibold">
              {machine ? "Edit Machine" : "Add New Machine"}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : machine ? "Update Machine" : "Create Machine"}
            </Button>
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className={`border px-4 py-3 rounded mb-4 ${machine?.id ? 'bg-green-50 border-green-200 text-green-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <div className="flex flex-col gap-4">
              <p className="font-medium">{successMessage}</p>
              
              {/* Only show action buttons for newly created machines */}
              {!machine?.id && (
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button" 
                    onClick={continueEditing}
                    variant="outline"
                    size="sm"
                  >
                    Continue Editing
                  </Button>
                  <Button 
                    type="button" 
                    onClick={createAnother}
                    variant="outline"
                    size="sm"
                  >
                    Create Another
                  </Button>
                  <Button 
                    type="button" 
                    onClick={goToMachines}
                    size="sm"
                  >
                    Go to Machines
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Create Form when no success message */}
        {!successMessage && !machine && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
            <p className="mb-2 font-medium">Quick Create</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="machine_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="border-slate-300"
                        onChange={(e) => {
                          field.onChange(e)
                          if (e.target.value) {
                            generateSlug(e.target.value)
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a machine name to quickly create a new entry
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hidden"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 rounded-md p-3 mt-6">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer !mt-0">Hidden (Recommended until all fields are filled)</FormLabel>
                  </FormItem>
                )}
              />
            </div>
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
                              field.onChange(e)
                              if (!machine?.id && !form.getValues("slug")) {
                                generateSlug(e.target.value)
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
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
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
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <PublishRequiredFormLabel>Machine Image</PublishRequiredFormLabel>
                        <div className="space-y-4">
                          {field.value && (
                            <div className="border rounded-md p-4 bg-slate-50">
                              <p className="text-sm font-medium mb-2">Current Image</p>
                              <div className="relative h-48 w-full max-w-md border rounded-md overflow-hidden bg-white">
                                <Image 
                                  src={field.value} 
                                  alt="Machine preview"
                                  fill
                                  className="object-contain"
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                                  onError={(e) => {
                                    // Fallback to placeholder if image fails to load
                                    (e.target as HTMLImageElement).src = "/placeholder-image.svg";
                                  }}
                                  priority={false}
                                />
                              </div>
                              <div className="mt-2 flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">
                                  Image will be optimized for web display: resized to max 1200px width and converted to WebP format.
                                </p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => field.onChange("")}
                                  className="text-xs text-destructive hover:text-destructive/90"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <FormLabel className="text-sm text-muted-foreground">Option 1: Upload Image</FormLabel>
                              <FileUpload 
                                onUploadComplete={(url) => {
                                  field.onChange(url);
                                  form.trigger("image_url");
                                }} 
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <FormLabel className="text-sm text-muted-foreground">Option 2: Enter Image URL</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://example.com/image.jpg" 
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    form.trigger("image_url");
                                  }}
                                />
                              </FormControl>
                            </div>
                          </div>
                        </div>
                        <FormDescription>
                          Upload a product image or enter an image URL. Images should be in JPG, PNG or WebP format.
                          For best results, use images with a white background and at least 1200px width.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
      </form>
    </Form>
  )
}

