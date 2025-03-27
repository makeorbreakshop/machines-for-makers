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
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createMachine, updateMachine } from "@/lib/services/machine-service"
import type { Machine, Category, Brand } from "@/lib/database-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Define the form schema
const formSchema = z.object({
  machine_name: z.string().min(2, {
    message: "Machine name must be at least 2 characters.",
  }),
  slug: z.string().min(2, {
    message: "Slug must be at least 2 characters.",
  }),
  company: z.string({
    required_error: "Brand is required",
  }),
  machine_category: z.string({
    required_error: "Machine category is required",
  }),
  laser_category: z.string({
    required_error: "Laser category is required",
  }),
  price: z.coerce.number({
    required_error: "Price is required",
  }),
  rating: z.coerce.number().min(0).max(10).optional().nullable(),
  award: z.string().optional().nullable().transform(val => val === null ? "" : val),
  laser_type_a: z.string({
    required_error: "Primary laser type is required",
  }),
  laser_power_a: z.string({
    required_error: "Primary laser power is required",
  }),
  laser_type_b: z.string().optional().nullable().transform(val => val === null ? "" : val),
  laser_power_b: z.string().optional().nullable().transform(val => val === null ? "" : val),
  work_area: z.string({
    required_error: "Work area is required",
  }),
  speed: z.string({
    required_error: "Speed is required",
  }),
  height: z.string().optional().nullable().transform(val => val === null ? "" : val),
  machine_size: z.string({
    required_error: "Machine size is required",
  }),
  acceleration: z.string().optional().nullable().transform(val => val === null ? "" : val),
  laser_frequency: z.string().optional().nullable().transform(val => val === null ? "" : val),
  pulse_width: z.string().optional().nullable().transform(val => val === null ? "" : val),
  focus: z.string().optional().nullable().transform(val => val === null ? "" : val),
  enclosure: z.boolean().default(false),
  wifi: z.boolean().default(false),
  camera: z.boolean().default(false),
  passthrough: z.boolean().default(false),
  auto_focus: z.boolean().default(false),
  controller: z.string().optional().nullable().transform(val => val === null ? "" : val),
  software: z.string().optional().nullable().transform(val => val === null ? "" : val),
  warranty: z.string().optional().nullable().transform(val => val === null ? "" : val),
  laser_source_manufacturer: z.string().optional().nullable().transform(val => val === null ? "" : val),
  excerpt_short: z.string().optional().nullable().transform(val => val === null ? "" : val),
  description: z.string().optional().nullable().transform(val => val === null ? "" : val),
  highlights: z.string().optional().nullable().transform(val => val === null ? "" : val),
  drawbacks: z.string().optional().nullable().transform(val => val === null ? "" : val),
  is_featured: z.boolean().default(false),
  hidden: z.boolean().default(false),
  image_url: z.string({
    required_error: "Image URL is required",
  }),
  affiliate_link: z.string().optional().nullable().transform(val => val === null ? "" : val),
  youtube_review: z.string().optional().nullable().transform(val => val === null ? "" : val),
})

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
  brands: Brand[]
}

// Add a new component for required field labels
const RequiredFormLabel = ({ children }: { children: React.ReactNode }) => (
  <FormLabel className="flex items-center">
    {children}
    <span className="text-red-500 ml-1">*</span>
  </FormLabel>
);

export function MachineForm({ machine, categories, brands }: MachineFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Add state to track if there's a clone source
  const [cloneSource, setCloneSource] = useState<string | null>(null)

  // Initialize form with existing machine data or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: machine
      ? {
          ...machine,
          price: machine.price || undefined,
          rating: machine.rating || undefined,
          auto_focus: machine.auto_focus || false,
          // Set default empty strings for nullable string fields
          laser_type_b: machine.laser_type_b ?? "",
          laser_power_b: machine.laser_power_b ?? "",
          height: machine.height ?? "",
          acceleration: machine.acceleration ?? "",
          laser_frequency: machine.laser_frequency ?? "",
          pulse_width: machine.pulse_width ?? "",
          focus: machine.focus ?? "",
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
        }
      : {
          machine_name: "",
          slug: "",
          is_featured: false,
          hidden: false,
          enclosure: false,
          wifi: false,
          camera: false,
          passthrough: false,
          auto_focus: false,
          laser_type_b: "",
          laser_power_b: "",
          height: "",
          acceleration: "",
          laser_frequency: "",
          pulse_width: "",
          focus: "",
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
        },
  })

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      if (machine && machine.id) {
        // Update existing machine
        await updateMachine(machine.id, values as any)
      } else {
        // Create new machine
        await createMachine(values as any)
      }

      // Redirect to machines list
      router.push("/admin/machines")
      router.refresh()
    } catch (error) {
      console.error("Error saving machine:", error)
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Quick Clone Selection */}
        <div className="flex flex-col md:flex-row gap-2 justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              size="sm"
            >
              ← Back
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

        <Tabs defaultValue="basic">
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
                {/* Quick navigation section */}
                <div className="mb-6 p-2 bg-slate-50 rounded-md">
                  <div className="text-sm font-medium mb-2">Quick Navigation:</div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('basic-section')?.scrollIntoView()}>Basic Details</Button>
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('settings-section')?.scrollIntoView()}>Settings</Button>
                  </div>
                </div>

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
                            className="border-slate-300"
                            onBlur={(e) => {
                              field.onBlur()
                              if (!form.getValues("slug")) {
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
                        <RequiredFormLabel>Slug</RequiredFormLabel>
                        <FormControl>
                          <Input {...field} className="border-slate-300" />
                        </FormControl>
                        <FormDescription>Used in the URL: /products/{field.value}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <RequiredFormLabel>Brand</RequiredFormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="border-slate-300">
                              <SelectValue placeholder="Select a brand" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.name}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="machine_category"
                    render={({ field }) => (
                      <FormItem>
                        <RequiredFormLabel>Machine Category</RequiredFormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="border-slate-300">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="laser">Laser</SelectItem>
                            <SelectItem value="3d-printer">3D Printer</SelectItem>
                            <SelectItem value="cnc">CNC</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="laser_category"
                    render={({ field }) => (
                      <FormItem>
                        <RequiredFormLabel>Laser Category</RequiredFormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="border-slate-300">
                              <SelectValue placeholder="Select a laser category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="diode">Diode</SelectItem>
                            <SelectItem value="co2">CO2</SelectItem>
                            <SelectItem value="fiber">Fiber</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <RequiredFormLabel>Price ($)</RequiredFormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            className="border-slate-300"
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
                      <FormItem className="flex items-center space-x-2 rounded-md border p-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="flex-1 cursor-pointer">Hidden</FormLabel>
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
                {/* Quick navigation section */}
                <div className="mb-6 p-2 bg-slate-50 rounded-md">
                  <div className="text-sm font-medium mb-2">Quick Navigation:</div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('laser-specs')?.scrollIntoView()}>Laser Specifications</Button>
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('dimensions')?.scrollIntoView()}>Dimensions</Button>
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('performance')?.scrollIntoView()}>Performance</Button>
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('features')?.scrollIntoView()}>Features</Button>
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('software')?.scrollIntoView()}>Software & Support</Button>
                  </div>
                </div>

                <Accordion type="multiple" defaultValue={["laser", "dimensions", "performance", "features", "software"]} className="space-y-4">
                  <AccordionItem value="laser" id="laser-specs" className="border rounded-md p-2">
                    <AccordionTrigger className="text-lg font-medium px-2">Laser Specifications</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-slate-50 p-4 rounded-md mb-6">
                        <h3 className="font-medium mb-2">Primary Laser</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="laser_type_a"
                            render={({ field }) => (
                              <FormItem>
                                <RequiredFormLabel>Primary Laser Type</RequiredFormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                                  <FormControl>
                                    <SelectTrigger className="border-slate-300">
                                      <SelectValue placeholder="Select a laser type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="diode">Diode</SelectItem>
                                    <SelectItem value="co2">CO2</SelectItem>
                                    <SelectItem value="fiber">Fiber</SelectItem>
                                    <SelectItem value="hybrid">Hybrid</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="laser_power_a"
                            render={({ field }) => (
                              <FormItem>
                                <RequiredFormLabel>Primary Laser Power</RequiredFormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      {...field} 
                                      value={field.value ?? ""} 
                                      placeholder="10"
                                      className="pr-8 border-slate-300"
                                    />
                                    <span className="absolute right-3 top-2.5 text-sm text-slate-500">W</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-md mt-4">
                          <h3 className="font-medium mb-2">Secondary Laser (Optional)</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="laser_type_b"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Secondary Laser Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                                    <FormControl>
                                      <SelectTrigger className="border-slate-300">
                                        <SelectValue placeholder="Select a laser type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="diode">Diode</SelectItem>
                                      <SelectItem value="co2">CO2</SelectItem>
                                      <SelectItem value="fiber">Fiber</SelectItem>
                                      <SelectItem value="hybrid">Hybrid</SelectItem>
                                    </SelectContent>
                                  </Select>
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
                                    <div className="relative">
                                      <Input 
                                        {...field} 
                                        value={field.value ?? ""} 
                                        placeholder="5"
                                        className="pr-8 border-slate-300"
                                      />
                                      <span className="absolute right-3 top-2.5 text-sm text-slate-500">W</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                                <FormLabel>Focus</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="dimensions" id="dimensions" className="border rounded-md p-2">
                    <AccordionTrigger className="text-lg font-medium px-2">Dimensions</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <FormField
                          control={form.control}
                          name="work_area"
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>Work Area</RequiredFormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    value={field.value ?? ""} 
                                    placeholder="400x390" 
                                    className="pr-8 border-slate-300"
                                  />
                                  <span className="absolute right-3 top-2.5 text-sm text-slate-500">mm</span>
                                </div>
                              </FormControl>
                              <FormDescription>Width x Length (e.g., 400x390)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="machine_size"
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>Machine Size</RequiredFormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    value={field.value ?? ""} 
                                    placeholder="585x660x270" 
                                    className="pr-8 border-slate-300"
                                  />
                                  <span className="absolute right-3 top-2.5 text-sm text-slate-500">mm</span>
                                </div>
                              </FormControl>
                              <FormDescription>Width x Length x Height (e.g., 585x660x270)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Height</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    value={field.value ?? ""} 
                                    placeholder="200" 
                                    className="pr-8 border-slate-300"
                                  />
                                  <span className="absolute right-3 top-2.5 text-sm text-slate-500">mm</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="performance" id="performance" className="border rounded-md p-2">
                    <AccordionTrigger className="text-lg font-medium px-2">Performance</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <FormField
                          control={form.control}
                          name="speed"
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>Speed</RequiredFormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    value={field.value ?? ""} 
                                    placeholder="600" 
                                    className="pr-12 border-slate-300"
                                  />
                                  <span className="absolute right-3 top-2.5 text-sm text-slate-500">mm/s</span>
                                </div>
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
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    value={field.value ?? ""} 
                                    placeholder="8000" 
                                    className="pr-14 border-slate-300"
                                  />
                                  <span className="absolute right-3 top-2.5 text-sm text-slate-500">mm/s²</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="features" id="features" className="border rounded-md p-2">
                    <AccordionTrigger className="text-lg font-medium px-2">Features</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="enclosure"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-3 h-full">
                                <FormLabel className="flex-1 cursor-pointer">Enclosure</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="wifi"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-3 h-full">
                                <FormLabel className="flex-1 cursor-pointer">WiFi</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="camera"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-3 h-full">
                                <FormLabel className="flex-1 cursor-pointer">Camera</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="passthrough"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-3 h-full">
                                <FormLabel className="flex-1 cursor-pointer">Passthrough</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="auto_focus"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-3 h-full">
                                <FormLabel className="flex-1 cursor-pointer">Auto Focus</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="controller"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Controller</FormLabel>
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

                  <AccordionItem value="software" id="software" className="border rounded-md p-2">
                    <AccordionTrigger className="text-lg font-medium px-2">Software & Support</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <FormField
                          control={form.control}
                          name="software"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Software</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                              </FormControl>
                              <FormDescription>Included software (e.g., LightBurn, LaserGRBL)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="warranty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Warranty</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                              </FormControl>
                              <FormDescription>e.g., "1 year limited"</FormDescription>
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
                {/* Quick navigation section */}
                <div className="mb-6 p-2 bg-slate-50 rounded-md">
                  <div className="text-sm font-medium mb-2">Quick Navigation:</div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('description-section')?.scrollIntoView()}>Description</Button>
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('highlights-section')?.scrollIntoView()}>Highlights & Drawbacks</Button>
                  </div>
                </div>
                
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
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <RequiredFormLabel>Main Image URL</RequiredFormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                        </FormControl>
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
                    name="affiliate_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Affiliate Link</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} className="border-slate-300" />
                        </FormControl>
                        <FormDescription>Link to purchase the machine</FormDescription>
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

