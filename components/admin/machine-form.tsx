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
  company: z.string().optional(),
  machine_category: z.string().optional(),
  laser_category: z.string().optional(),
  price: z.coerce.number().optional(),
  rating: z.coerce.number().min(0).max(10).optional(),
  award: z.string().optional(),
  laser_type_a: z.string().optional(),
  laser_power_a: z.string().optional(),
  laser_type_b: z.string().optional(),
  laser_power_b: z.string().optional(),
  work_area: z.string().optional(),
  speed: z.string().optional(),
  height: z.string().optional(),
  machine_size: z.string().optional(),
  acceleration: z.string().optional(),
  laser_frequency: z.string().optional(),
  pulse_width: z.string().optional(),
  focus: z.string().optional(),
  enclosure: z.boolean().optional(),
  wifi: z.boolean().optional(),
  camera: z.boolean().optional(),
  passthrough: z.boolean().optional(),
  controller: z.string().optional(),
  software: z.string().optional(),
  warranty: z.string().optional(),
  laser_source_manufacturer: z.string().optional(),
  excerpt_short: z.string().optional(),
  description: z.string().optional(),
  highlights: z.string().optional(),
  drawbacks: z.string().optional(),
  is_featured: z.boolean().default(false),
  hidden: z.boolean().default(false),
  image_url: z.string().optional(),
  affiliate_link: z.string().optional(),
  youtube_review: z.string().optional(),
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

export function MachineForm({ machine, categories, brands }: MachineFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with existing machine data or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: machine
      ? {
          ...machine,
          price: machine.price || undefined,
          rating: machine.rating || undefined,
        }
      : {
          machine_name: "",
          slug: "",
          is_featured: false,
          hidden: false,
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
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="media">Media & Links</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="machine_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Machine Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
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
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Brand</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                        <FormLabel>Machine Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
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
                        <FormLabel>Laser Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a laser category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="desktop-diode-laser">Desktop Diode Laser</SelectItem>
                            <SelectItem value="desktop-galvo">Desktop Galvo</SelectItem>
                            <SelectItem value="pro-gantry">Pro Gantry</SelectItem>
                            <SelectItem value="desktop-gantry">Desktop Gantry</SelectItem>
                            <SelectItem value="open-diode">Open Diode</SelectItem>
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
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating (0-10)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="10" step="0.1" {...field} />
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
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>E.g., "Editor's Choice", "Best Value", etc.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                    <FormField
                      control={form.control}
                      name="is_featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 flex-1">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Featured</FormLabel>
                            <FormDescription>Show this machine on the homepage and featured sections</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hidden"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 flex-1">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Hidden</FormLabel>
                            <FormDescription>Hide this machine from the website</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Specifications Tab */}
          <TabsContent value="specs">
            <Card>
              <CardContent className="pt-6">
                <Accordion type="multiple" defaultValue={["laser-specs", "dimensions", "performance", "features"]}>
                  <AccordionItem value="laser-specs">
                    <AccordionTrigger className="text-lg font-medium">Laser Specifications</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="laser_type_a"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Laser Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a laser type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Diode">Diode</SelectItem>
                                    <SelectItem value="CO2">CO2</SelectItem>
                                    <SelectItem value="Fiber">Fiber</SelectItem>
                                    <SelectItem value="DPSS">DPSS</SelectItem>
                                    <SelectItem value="Crystal">Crystal</SelectItem>
                                    <SelectItem value="Galvo">Galvo</SelectItem>
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
                                <FormLabel>Primary Laser Power (W)</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} placeholder="10" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="laser_type_b"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Secondary Laser Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a laser type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Diode">Diode</SelectItem>
                                    <SelectItem value="CO2">CO2</SelectItem>
                                    <SelectItem value="Fiber">Fiber</SelectItem>
                                    <SelectItem value="DPSS">DPSS</SelectItem>
                                    <SelectItem value="Crystal">Crystal</SelectItem>
                                    <SelectItem value="Galvo">Galvo</SelectItem>
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
                                <FormLabel>Secondary Laser Power (W)</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} placeholder="5" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="laser_source_manufacturer"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Laser Source Manufacturer</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} />
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
                                  <Input {...field} value={field.value || ""} />
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
                                  <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="dimensions">
                    <AccordionTrigger className="text-lg font-medium">Dimensions</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                        <FormField
                          control={form.control}
                          name="work_area"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Area</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="600x400 mm" />
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
                                <Input {...field} value={field.value || ""} placeholder="800x600 mm" />
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
                              <FormLabel>Height</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="200 mm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="performance">
                    <AccordionTrigger className="text-lg font-medium">Performance</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <FormField
                          control={form.control}
                          name="speed"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Speed</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="600 mm/s" />
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
                                <Input {...field} value={field.value || ""} placeholder="8000 mm/s²" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="features">
                    <AccordionTrigger className="text-lg font-medium">Features</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="focus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Focus</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name="enclosure"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-2">
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
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-2">
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
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-2">
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
                              <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-2">
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
                        </div>

                        <FormField
                          control={form.control}
                          name="controller"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Controller</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="software">
                    <AccordionTrigger className="text-lg font-medium">Software & Support</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <FormField
                          control={form.control}
                          name="software"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Software</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} />
                              </FormControl>
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
                                <Input {...field} value={field.value || ""} placeholder="1 year" />
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
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="excerpt_short"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={3} />
                        </FormControl>
                        <FormDescription>A brief summary of the machine (100-150 characters)</FormDescription>
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
                          <Textarea {...field} value={field.value || ""} rows={10} />
                        </FormControl>
                        <FormDescription>Supports HTML for formatting</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="highlights"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Highlights (Pros)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            rows={5}
                            placeholder="<ul><li>Pro point 1</li><li>Pro point 2</li></ul>"
                          />
                        </FormControl>
                        <FormDescription>Use HTML list format</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="drawbacks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drawbacks (Cons)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            rows={5}
                            placeholder="<ul><li>Con point 1</li><li>Con point 2</li></ul>"
                          />
                        </FormControl>
                        <FormDescription>Use HTML list format</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media & Links Tab */}
          <TabsContent value="media">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
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
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
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
                          <Input {...field} value={field.value || ""} />
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

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/machines")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : machine ? "Update Machine" : "Create Machine"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

