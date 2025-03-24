import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database-types"

// Check if Supabase environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create the client if both URL and key are available
export const supabase = supabaseUrl && supabaseAnonKey ? createClient<Database>(supabaseUrl, supabaseAnonKey) : null

// Helper functions for common database operations

// Machines
export async function getMachines({
  limit = 10,
  offset = 0,
  category = null,
  company = null,
  priceRange = null,
  search = null,
  sort = "newest",
}: {
  limit?: number
  offset?: number
  category?: string | null
  company?: string | null
  priceRange?: [number, number] | null
  search?: string | null
  sort?: "newest" | "price-asc" | "price-desc" | "rating-desc"
}) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: [], error: null, count: 0 }
  }

  try {
    console.log("Executing getMachines with params:", { limit, offset, category, company, priceRange, search, sort });
    
    // Query without using relationships to avoid foreign key errors
    let query = supabase
      .from("machines")
      .select("*", { count: "exact" })
      .eq("Hidden", false);

    // Apply filters
    if (category) {
      console.log(`Filtering by category: ${category}`);
      // Use ilike for case-insensitive matching
      query = query.ilike("Laser Category", category)
    }

    if (company) {
      query = query.eq("Company", company)
    }

    if (priceRange) {
      query = query.gte("Price", priceRange[0]).lte("Price", priceRange[1])
    }

    if (search) {
      query = query.ilike("Machine Name", `%${search}%`)
    }

    // Apply sorting
    switch (sort) {
      case "newest":
        query = query.order("Published On", { ascending: false })
        break
      case "price-asc":
        query = query.order("Price", { ascending: true })
        break
      case "price-desc":
        query = query.order("Price", { ascending: false })
        break
      case "rating-desc":
        query = query.order("Rating", { ascending: false })
        break
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: rawData, error, count } = await query

    if (error) {
      console.error("Error in Supabase getMachines query:", error);
      return { data: [], error, count: 0 };
    }

    // Transform the data to match the expected format
    const data = rawData ? rawData.map(transformMachineData) : []
    console.log(`Found ${data.length} machines matching criteria`);

    return { data, error, count }
  } catch (err) {
    console.error("Exception in getMachines:", err);
    return { data: [], error: err, count: 0 };
  }
}

export async function getMachineBySlug(slug: string) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: null, error: null }
  }

  try {
    console.log(`Looking for product with slug: ${slug}`);
    // Simply fetch the machine data without trying to use relationships
    // This avoids the "Could not find a relationship" errors
    const { data: rawData, error } = await supabase
      .from("machines")
      .select("*")
      .ilike("Internal link", slug) // Use case-insensitive matching
      .eq("Hidden", false)
      .single()

    console.log("Raw data from Supabase for slug", slug, ":", rawData)

    // Transform data to match the expected format in the product page component
    const data = rawData ? transformMachineData(rawData) : null

    console.log("Transformed data:", data)

    if (error) {
      console.error("Error fetching machine by slug:", error);
    }

    return { data, error }
  } catch (err) {
    console.error("Exception in getMachineBySlug:", err);
    return { data: null, error: err }
  }
}

// Function to transform database field names to expected format
function transformMachineData(data: any): any {
  return {
    id: data.id,
    machine_name: data["Machine Name"],
    slug: data["Internal link"],
    company: data["Company"],
    image_url: data["Image"],
    laser_type_a: data["Laser Type A"],
    laser_power_a: data["Laser Power A"],
    laser_type_b: data["Laser Type B"],
    laser_power_b: data["LaserPower B"],
    laser_category: data["Laser Category"],
    machine_category: data["Machine Category"],
    affiliate_link: data["Affiliate Link"],
    price: data["Price"],
    work_area: data["Work Area"],
    height: data["Height"],
    machine_size: data["Machine Size"],
    speed: data["Speed"],
    acceleration: data["Acceleration"],
    software: data["Software"],
    focus: data["Focus"],
    enclosure: data["Enclosure"],
    wifi: data["Wifi"],
    camera: data["Camera"],
    passthrough: data["Passthrough"],
    controller: data["Controller"],
    warranty: data["Warranty"],
    excerpt_short: data["Excerpt (Short)"],
    excerpt_long: data["Excerpt (Long)"],
    description: data["Description"],
    highlights: data["Highlights"],
    drawbacks: data["Drawbacks"],
    youtube_review: data["YouTube Review"],
    is_featured: data["Is A Featured Resource?"],
    favorited: data["Favorited"],
    hidden: data["Hidden"],
    laser_frequency: data["Laser Frequency"],
    pulse_width: data["Pulse Width"],
    best_for: data["Best for:"],
    laser_source_manufacturer: data["Laser Source Manufacturer"],
    created_at: data["Created On"],
    updated_at: data["Updated On"],
    published_at: data["Published On"],
    rating: data["Rating"],
    award: data["Award"],
    // Only include reviews and images if they exist in the data
    ...(data.reviews && { reviews: data.reviews }),
    ...(data.images && { images: data.images }),
  }
}

// Reviews
export async function getReviewsByMachineId(machineId: string) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: [], error: null }
  }

  try {
    console.log(`Fetching reviews for machine: ${machineId}`);
    
    // Check if the reviews table exists first
    const { error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error("Reviews table not found or not accessible:", checkError);
      return { data: [], error: null }
    }
    
    // Fetch reviews directly by machine_id
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("machine_id", machineId)
      .order("created_at", { ascending: false })

    // If there's an error with the relationship, catch it and return empty data
    if (error) {
      console.error("Error fetching reviews:", error);
      return { data: [], error: null }
    }

    console.log(`Found ${data?.length || 0} reviews for machine ${machineId}`);
    return { data, error }
  } catch (err) {
    console.error("Exception fetching reviews:", err);
    return { data: [], error: null }
  }
}

// Images
export async function getImagesByMachineId(machineId: string) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: [], error: null }
  }

  try {
    console.log(`Fetching images for machine: ${machineId}`);
    
    // Check if the images table exists first
    const { error: checkError } = await supabase
      .from('images')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error("Images table not found or not accessible:", checkError);
      return { data: [], error: null }
    }
    
    // Fetch images directly by machine_id
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .eq("machine_id", machineId)
      .order("sort_order", { ascending: true })

    // If there's an error, catch it and return empty data
    if (error) {
      console.error("Error fetching images:", error);
      return { data: [], error: null }
    }

    console.log(`Found ${data?.length || 0} images for machine ${machineId}`);
    return { data, error }
  } catch (err) {
    console.error("Exception fetching images:", err);
    return { data: [], error: null }
  }
}

// Comparisons
export async function getComparisonBySlug(slug: string) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: null, error: null }
  }

  const { data: comparison, error: comparisonError } = await supabase
    .from("comparisons")
    .select("*")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .single()

  if (comparisonError || !comparison) {
    return { data: null, error: comparisonError }
  }

  const { data: comparisonMachines, error: machinesError } = await supabase
    .from("comparison_machines")
    .select(`
      *,
      machines(*)
    `)
    .eq("comparison_id", comparison.id)
    .order("sort_order", { ascending: true })

  return {
    data: {
      ...comparison,
      machines: comparisonMachines?.map((cm) => cm.machines) || [],
    },
    error: machinesError,
  }
}

// Categories
export async function getCategories() {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true })

  return { data, error }
}

// Brands
export async function getBrands() {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase.from("brands").select("*").order("name", { ascending: true })

  return { data, error }
}

