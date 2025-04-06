import { createServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { MachineForm, MachineFormData } from "@/components/admin/machine-form"
import type { Machine } from "@/lib/database-types"
import { requireAdminAuth } from "@/lib/auth-utils"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'
// Add nodejs runtime as per DEVELOPMENT_GUIDELINES for server components using Supabase
export const runtime = 'nodejs'

// Define the form data type
interface MachinePageProps {
  params: { id: string }
}

export default async function EditMachinePage({
  params,
}: MachinePageProps) {
  // Check authentication - will redirect if not authenticated
  await requireAdminAuth();
  
  const supabase = await createServerClient()

  // If id is "new", we're creating a new machine
  if (params.id === "new") {
    // Get categories and brands for the form
    const [categoriesResponse, brandsResponse] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("brands").select("*").order("Name"),
    ])

    console.log("Brands for new machine:", brandsResponse);

    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Add New Machine</h1>
        <MachineForm categories={categoriesResponse.data || []} brands={brandsResponse.data || []} />
      </div>
    )
  }

  // Otherwise, we're editing an existing machine
  const { data: machine, error } = await supabase.from("machines").select("*").eq("id", params.id).single()

  if (error || !machine) {
    console.error("Error fetching machine data:", error)
    notFound()
  }

  console.log("Fetched machine data:", JSON.stringify(machine, null, 2))

  // Get categories and brands for the form
  const [categoriesResponse, brandsResponse] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("brands").select("*").order("Name"),
  ])

  console.log("Brands for existing machine:", brandsResponse);
  console.log("Machine company value:", machine["Company"]);

  // Helper function to convert "Yes"/"No" strings to boolean values
  const stringToBoolean = (value: string | null): boolean => {
    if (!value) return false;
    return ["yes", "true", "1"].includes(value.toLowerCase());
  };

  // Helper function to convert null to empty strings
  const nullToEmptyString = (value: string | null): string => {
    return value === null ? "" : value;
  };

  // Log boolean conversion results for debugging
  console.log("Enclosure string value:", machine["Enclosure"])
  console.log("Enclosure converted to boolean:", stringToBoolean(machine["Enclosure"]))
  console.log("Is Featured string value:", machine["Is A Featured Resource?"])
  console.log("Is Featured converted to boolean:", stringToBoolean(machine["Is A Featured Resource?"]))
  console.log("Hidden string value:", machine["Hidden"])
  console.log("Hidden converted to boolean:", stringToBoolean(machine["Hidden"]))

  // Transform the machine data to match the expected form field names
  const transformedMachine: MachineFormData = {
    id: machine.id,
    machine_name: nullToEmptyString(machine["Machine Name"]),
    slug: nullToEmptyString(machine["Internal link"]),
    company: nullToEmptyString(machine["Company"]),
    machine_category: nullToEmptyString(machine["Machine Category"]),
    laser_category: nullToEmptyString(machine["Laser Category"]),
    price: machine["Price"],
    rating: machine["Rating"],
    award: nullToEmptyString(machine["Award"]),
    laser_type_a: nullToEmptyString(machine["Laser Type A"]),
    laser_power_a: nullToEmptyString(machine["Laser Power A"]),
    laser_type_b: nullToEmptyString(machine["Laser Type B"]),
    laser_power_b: nullToEmptyString(machine["LaserPower B"]),
    work_area: nullToEmptyString(machine["Work Area"]),
    speed: nullToEmptyString(machine["Speed"]),
    height: nullToEmptyString(machine["Height"]),
    machine_size: nullToEmptyString(machine["Machine Size"]),
    acceleration: nullToEmptyString(machine["Acceleration"]),
    laser_frequency: nullToEmptyString(machine["Laser Frequency"]),
    pulse_width: nullToEmptyString(machine["Pulse Width"]),
    focus: nullToEmptyString(machine["Focus"]),
    enclosure: stringToBoolean(machine["Enclosure"]),
    wifi: stringToBoolean(machine["Wifi"]),
    camera: stringToBoolean(machine["Camera"]),
    passthrough: stringToBoolean(machine["Passthrough"]),
    controller: nullToEmptyString(machine["Controller"]),
    software: nullToEmptyString(machine["Software"]),
    warranty: nullToEmptyString(machine["Warranty"]),
    laser_source_manufacturer: nullToEmptyString(machine["Laser Source Manufacturer"]),
    excerpt_short: nullToEmptyString(machine["Excerpt (Short)"]),
    description: nullToEmptyString(machine["Description"]),
    highlights: nullToEmptyString(machine["Highlights"]),
    drawbacks: nullToEmptyString(machine["Drawbacks"]),
    is_featured: stringToBoolean(machine["Is A Featured Resource?"]),
    hidden: stringToBoolean(machine["Hidden"]),
    image_url: nullToEmptyString(machine["Image"]),
    product_link: nullToEmptyString(machine["product_link"]),
    affiliate_link: nullToEmptyString(machine["Affiliate Link"]),
    youtube_review: nullToEmptyString(machine["YouTube Review"]),
    // Include created/updated dates
    created_at: nullToEmptyString(machine["Created On"]),
    updated_at: nullToEmptyString(machine["Updated On"]),
    published_at: nullToEmptyString(machine["Published On"]),
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Edit Machine: {machine["Machine Name"]}</h1>
      <MachineForm 
        machine={transformedMachine as any} 
        categories={categoriesResponse.data || []} 
        brands={brandsResponse.data || []} 
      />
    </div>
  )
}
