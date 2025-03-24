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
  excerpt_short: z.string().optional(),
  description: z.string().optional(),
  highlights: z.string().optional(),
  drawbacks: z.string().optional(),
  is_featured: z.boolean().default(false),
  hidden: z.boolean().default(false),
  image_url: z.string().optional(),
  affiliate_link: z.string().optional(),
})

interface MachineFormProps {
  machine?: Machine
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
      if (machine) {
        // Update existing machine
        await updateMachine(machine.id, values)
      } else {
        // Create new machine
        await createMachine(values)
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="laser_type_a"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Laser Type</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
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
                        <FormLabel>Primary Laser Power</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
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
                          <Input {...field} value={field.value || ""} />
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
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="work_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Area</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>E.g., "600x400 mm"</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="speed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Speed</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>E.g., "600 mm/s"</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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

