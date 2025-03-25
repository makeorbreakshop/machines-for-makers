import { createClient } from "@supabase/supabase-js"
import type { Database, Machine } from "./database-types"
import { cache } from "react"

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
  return cache(async () => {
    // Return empty data if Supabase is not initialized
    if (!supabase) {
      return { data: [], error: null, count: 0 }
    }

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log("Executing getMachines with params:", { limit, offset, category, company, priceRange, search, sort });
      }
      
      // Query without using relationships to avoid foreign key errors
      let query = supabase
        .from("machines")
        .select("*", { count: "exact" })
        .eq("Hidden", false);

      // Apply filters
      if (category) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Filtering by category: ${category}`);
        }
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
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Found ${data.length} machines matching criteria`);
      }

      return { data, error, count }
    } catch (err) {
      console.error("Exception in getMachines:", err);
      return { data: [], error: err, count: 0 };
    }
  })()
}

export async function getMachineBySlug(slug: string) {
  return cache(async () => {
    // Return empty data if Supabase is not initialized
    if (!supabase) {
      return { data: null, error: null }
    }

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Looking for product with slug: ${slug}`);
      }
      // Simply fetch the machine data without trying to use relationships
      // This avoids the "Could not find a relationship" errors
      const { data: rawData, error } = await supabase
        .from("machines")
        .select("*")
        .ilike("Internal link", slug) // Use case-insensitive matching
        .eq("Hidden", false)
        .single()

      if (process.env.NODE_ENV !== 'production') {
        console.log("Raw data from Supabase for slug", slug, ":", rawData)
      }

      // Transform data to match the expected format in the product page component
      const data = rawData ? transformMachineData(rawData) : null

      if (process.env.NODE_ENV !== 'production') {
        console.log("Transformed data:", data)
      }

      if (error) {
        console.error("Error fetching machine by slug:", error);
      }

      return { data, error }
    } catch (err) {
      console.error("Exception in getMachineBySlug:", err);
      return { data: null, error: err }
    }
  })()
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

// Get related products
export async function getRelatedProducts(currentProduct: Machine, limit = 3) {
  if (!supabase) {
    return { data: [], error: null }
  }

  try {
    // First, get the raw machine data to ensure we have the correct field format
    const { data: rawProductData, error: productError } = await supabase
      .from("machines")
      .select("*")
      .eq("id", currentProduct.id)
      .single();
    
    if (productError) {
      console.error("Error fetching original product data:", productError);
      return { data: [], error: productError };
    }
    
    const laserCategory = rawProductData["Laser Category"];
    console.log(`Finding related products for machine: ${currentProduct.id}, category: ${laserCategory}`);
    
    // Get products in the same category
    const { data: rawData, error } = await supabase
      .from("machines")
      .select("*")
      .eq("Hidden", false)
      .neq("id", currentProduct.id)
      .eq("Laser Category", laserCategory)
      .order("Rating", { ascending: false });

    if (error) {
      console.error("Error fetching related products:", error);
      return { data: [], error };
    }

    console.log('Raw related products data:', rawData);

    // Transform the data
    const products = rawData ? rawData.map(transformMachineData) : [];

    // Calculate similarity scores
    const productsWithScores = products.map(product => {
      let score = 0;

      // Price similarity (within 30%)
      if (rawProductData["Price"] && product.price) {
        const priceDiff = Math.abs(
          Number(rawProductData["Price"]) - Number(product.price)
        ) / Number(rawProductData["Price"]);
        if (priceDiff < 0.3) score += 20;
      }

      // Power similarity (within 30%)
      if (rawProductData["Laser Power A"] && product.laser_power_a) {
        const powerDiff = Math.abs(
          Number(rawProductData["Laser Power A"]) - Number(product.laser_power_a)
        ) / Number(rawProductData["Laser Power A"]);
        if (powerDiff < 0.3) score += 15;
      }

      // Same laser type
      if (rawProductData["Laser Type A"] === product.laser_type_a) {
        score += 15;
      }

      // Same manufacturer (lower weight to ensure variety)
      if (rawProductData["Company"] === product.company) {
        score += 10;
      }
      
      // Award bonus - products with awards get a significant boost
      if (product.award) {
        score += 30;  // Give a significant boost to awarded products
      }

      return { ...product, similarityScore: score };
    });

    // Sort by similarity score and rating
    const sortedProducts = productsWithScores.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    console.log(`Found ${sortedProducts.length} related products with scores:`, 
      sortedProducts.map(p => ({
        name: p.machine_name,
        score: p.similarityScore,
        rating: p.rating,
        award: p.award
      }))
    );

    const result = sortedProducts.slice(0, limit);
    console.log('Returning related products:', result);

    return { 
      data: result, 
      error: null 
    };
  } catch (err) {
    console.error("Exception in getRelatedProducts:", err);
    return { data: [], error: err };
  }
}

