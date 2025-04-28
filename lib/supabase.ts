import { createClient } from "@supabase/supabase-js"
import { Database } from '@/types/supabase'
import type { Machine } from "./database-types"
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
  includeHtml = false
}: {
  limit?: number
  offset?: number
  category?: string | null
  company?: string | null
  priceRange?: [number, number] | null
  search?: string | null
  sort?: "newest" | "price-asc" | "price-desc" | "rating-desc"
  includeHtml?: boolean
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
      
      // Explicitly list all fields we want to fetch - excluding HTML content
      const selectFields = includeHtml
        ? "*, machines_latest(machines_latest_price)"
        : `
          id, 
          "Machine Name", 
          "Internal link", 
          "Company", 
          "Image", 
          "Laser Type A", 
          "Laser Power A", 
          "Laser Type B", 
          "LaserPower B", 
          "Laser Category", 
          "Machine Category", 
          "Affiliate Link", 
          "Price", 
          "Price Category", 
          "Work Area", 
          "Height", 
          "Machine Size", 
          "Speed", 
          "Speed Category", 
          "Acceleration", 
          "Software", 
          "Focus", 
          "Enclosure", 
          "Wifi", 
          "Camera", 
          "Passthrough", 
          "Controller", 
          "Warranty", 
          "Rating", 
          "Award", 
          "Excerpt (Short)", 
          "Excerpt (Long)", 
          "Description", 
          "Review", 
          "Brandon's Take", 
          "Highlights", 
          "Drawbacks", 
          "YouTube Review", 
          "Is A Featured Resource?", 
          "Favorited", 
          "Hidden", 
          product_link, 
          "Laser Frequency", 
          "Pulse Width", 
          "Best for:", 
          "Laser Source Manufacturer", 
          "Created On", 
          "Updated On", 
          "Published On",
          machines_latest(machines_latest_price)
        `;
      
      // Query without using relationships to avoid foreign key errors
      let query = supabase
        .from("machines")
        .select(selectFields, { count: "exact" })
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

      // For price filtering, we need to filter on machine_latest.machines_latest_price
      // Update once initial query is complete and transformed

      if (search) {
        query = query.ilike("Machine Name", `%${search}%`)
      }

      // Apply sorting
      // Note: We'll have to manually sort after getting transformed data if sort is price-related
      let manualPriceSort = false;
      let priceSortAscending = true;
      if (sort === "price-asc" || sort === "price-desc") {
        manualPriceSort = true;
        priceSortAscending = sort === "price-asc";
        // Don't apply sort in query, we'll do it after transformation
      } else {
        switch (sort) {
          case "newest":
            query = query.order("Published On", { ascending: false })
            break
          case "rating-desc":
            query = query.order("Rating", { ascending: false })
            break
        }
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
      
      // Apply price filtering if needed
      let filteredData = data;
      if (priceRange) {
        filteredData = data.filter(item => 
          item.price >= priceRange[0] && item.price <= priceRange[1]
        );
      }
      
      // Apply price sorting if needed
      if (manualPriceSort) {
        filteredData.sort((a, b) => {
          const priceA = a.price || 0;
          const priceB = b.price || 0;
          return priceSortAscending ? priceA - priceB : priceB - priceA;
        });
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Found ${filteredData.length} machines matching criteria`);
      }

      return { data: filteredData, error, count: filteredData.length }
    } catch (err) {
      console.error("Exception in getMachines:", err);
      return { data: [], error: err, count: 0 };
    }
  })()
}

interface MachineLatest {
  machines_latest_price: number;
}

type RawMachineData = {
  id: string
  "Machine Name": string
  "Internal link": string
  Company: string
  Image: string
  "Laser Type A": string
  "Laser Power A": string
  "Laser Type B": string | null
  "LaserPower B": string | null
  "Laser Category": string
  "Machine Category": string
  "Affiliate Link": string
  Price: number
  "Price Category": string
  "Work Area": string
  Height: string | null
  "Machine Size": string
  Speed: string
  "Speed Category": string
  Acceleration: string
  Software: string
  Focus: string
  Enclosure: string
  Wifi: string
  Camera: string
  Passthrough: string | null
  Controller: string | null
  Warranty: string | null
  Rating: number | null
  Award: string | null
  "Excerpt (Short)": string | null
  "Excerpt (Long)": string | null
  Description: string | null
  Review: string | null
  "Brandon's Take": string | null
  Highlights: string | null
  Drawbacks: string | null
  "YouTube Review": string | null
  "Is A Featured Resource?": string
  Favorited: string
  Hidden: string
  product_link: string
  "Laser Frequency": string | null
  "Pulse Width": string | null
  "Best for:": string | null
  "Laser Source Manufacturer": string | null
  "Created On": string
  "Updated On": string
  "Published On": string
  machines_latest: Array<{ machines_latest_price: number }> | null
}

export async function getMachineBySlug(slug: string, includeHtml: boolean = false) {
  return cache(async () => {
    // Return empty data if Supabase is not initialized
    if (!supabase) {
      return { data: null, error: null }
    }

    try {
      // Special debugging for Genmitsu L8
      const isGenmitsu = slug === "genmitsu-l8";
      if (isGenmitsu) {
        console.log(`🔍 DEBUG GENMITSU: Looking for product with slug: ${slug}`);
      }
      
      // Explicitly list all fields we want to fetch - excluding HTML content
      const selectFields = includeHtml
        ? "*"
        : `
          id, 
          "Machine Name", 
          "Internal link", 
          "Company", 
          "Image", 
          "Laser Type A", 
          "Laser Power A", 
          "Laser Type B", 
          "LaserPower B", 
          "Laser Category", 
          "Machine Category", 
          "Affiliate Link", 
          "Price", 
          "Price Category", 
          "Work Area", 
          "Height", 
          "Machine Size", 
          "Speed", 
          "Speed Category", 
          "Acceleration", 
          "Software", 
          "Focus", 
          "Enclosure", 
          "Wifi", 
          "Camera", 
          "Passthrough", 
          "Controller", 
          "Warranty", 
          "Rating", 
          "Award", 
          "Excerpt (Short)", 
          "Excerpt (Long)", 
          "Description", 
          "Review", 
          "Brandon's Take", 
          "Highlights", 
          "Drawbacks", 
          "YouTube Review", 
          "Is A Featured Resource?", 
          "Favorited", 
          "Hidden", 
          product_link, 
          "Laser Frequency", 
          "Pulse Width", 
          "Best for:", 
          "Laser Source Manufacturer", 
          "Created On", 
          "Updated On", 
          "Published On",
          machines_latest(machines_latest_price)
        `;
      
      // Join with machines_latest to get current price
      const { data: rawData, error } = await supabase
        .from("machines")
        .select(selectFields)
        .ilike("Internal link", slug) // Use case-insensitive matching
        .eq("Hidden", false)
        .single() as { data: RawMachineData | null, error: any }

      if (isGenmitsu && rawData) {
        console.log("🔍 DEBUG GENMITSU Raw data from Supabase:", {
          name: rawData["Machine Name"],
          originalPrice: rawData.Price,
          machinesLatest: rawData.machines_latest,
          slug: rawData["Internal link"]
        });
      }

      // Transform data to match the expected format in the product page component
      const data = rawData ? {
        ...transformMachineData(rawData),
        price: rawData.machines_latest?.[0]?.machines_latest_price || rawData.Price
      } : null

      if (isGenmitsu && data) {
        console.log("🔍 DEBUG GENMITSU Transformed data:", {
          name: data.machine_name,
          price: data.price,
          transformedPrice: data.price,
          machinesLatest: rawData?.machines_latest
        });
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
  // Add debugging for Genmitsu L8
  const isGenmitsu = data["Internal link"] === "genmitsu-l8" || data["Machine Name"] === "Genmitsu L8";
  if (isGenmitsu) {
    console.log("🔍 DEBUG GENMITSU in transformMachineData:", {
      name: data["Machine Name"],
      originalPrice: data["Price"],
      machinesLatest: data.machines_latest
    });
  }

  // Get the correct price from machines_latest if available
  let latestPrice = data["Price"];
  if (data.machines_latest && Array.isArray(data.machines_latest) && data.machines_latest.length > 0) {
    latestPrice = data.machines_latest[0].machines_latest_price || data["Price"];
    if (isGenmitsu) {
      console.log("🔍 DEBUG GENMITSU latest price from array:", latestPrice);
    }
  } else if (data.machines_latest && typeof data.machines_latest.machines_latest_price !== 'undefined') {
    // In case it's not an array but a direct object
    latestPrice = data.machines_latest.machines_latest_price || data["Price"];
    if (isGenmitsu) {
      console.log("🔍 DEBUG GENMITSU latest price from object:", latestPrice);
    }
  }

  const result = {
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
    // Use the properly extracted latest price
    price: latestPrice,
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
    product_link: data["Product Link"],
    laser_frequency: data["Laser Frequency"],
    pulse_width: data["Pulse Width"],
    best_for: data["Best for:"],
    laser_source_manufacturer: data["Laser Source Manufacturer"],
    created_at: data["Created On"],
    updated_at: data["Updated On"],
    published_at: data["Published On"],
    rating: data["Rating"],
    award: data["Award"],
    review: data["Review"],
    brandonsTake: data["Brandon's Take"],
    // Only include reviews and images if they exist in the data
    ...(data.reviews && { reviews: data.reviews }),
    ...(data.images && { images: data.images }),
  };

  if (isGenmitsu) {
    console.log("🔍 DEBUG GENMITSU final transformed price:", result.price);
  }

  return result;
}

// Reviews
export async function getReviewsByMachineId(machineId: string) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: [], error: null }
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Fetching reviews for machine: ${machineId}`);
    }
    
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

    if (process.env.NODE_ENV === 'development') {
      console.log(`Found ${data?.length || 0} reviews`);
    }
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
    if (process.env.NODE_ENV === 'development') {
      console.log(`Fetching images for machine: ${machineId}`);
    }
    
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

    if (process.env.NODE_ENV === 'development') {
      console.log(`Found ${data?.length || 0} images`);
    }
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
export async function getRelatedProducts(currentProduct: Machine, limit = 6) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: [], error: null }
  }

  try {
    // Define our machine data type to help with TypeScript
    interface RawMachineData {
      id: string;
      "Laser Category": string;
      "Price": string | number;
      "Laser Power A": string | number;
      "Laser Type A": string;
      "Company": string;
      [key: string]: any; // Allow other string keys
    }

    // First, get the raw machine data to ensure we have the correct field format
    // Exclude HTML content fields to reduce payload size
    const { data, error: productError } = await supabase
      .from("machines")
      .select(`
        id, 
        "Laser Category", 
        "Price", 
        "Laser Power A", 
        "Laser Type A", 
        "Company", 
        "Rating"
      `)
      .eq("id", currentProduct.id)
      .single();
    
    if (productError || !data) {
      console.error("Error fetching original product data:", productError);
      return { data: [], error: productError };
    }

    // Type cast should now work correctly
    const rawProductData = data as RawMachineData;
    const laserCategory = rawProductData["Laser Category"];
    if (process.env.NODE_ENV === 'development') {
      console.log(`Finding related products for machine: ${currentProduct.id}, category: ${laserCategory}`);
    }
    
    // Get products in the same category, excluding HTML content fields
    const { data: rawData, error } = await supabase
      .from("machines")
      .select(`
        id, 
        "Machine Name", 
        "Internal link", 
        "Company", 
        "Image", 
        "Laser Type A", 
        "Laser Power A", 
        "Laser Category", 
        "Price", 
        "Award", 
        "Rating",
        product_link
      `)
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

    if (process.env.NODE_ENV === 'development') {
      console.log(`Found ${sortedProducts.length} related products with scores:`, 
        sortedProducts.slice(0, 3).map(p => ({
          name: p.machine_name,
          score: p.similarityScore,
          rating: p.rating
        }))
      );
    }

    // Add minimum similarity score threshold
    const MIN_SIMILARITY_SCORE = 15;
    const result = sortedProducts
      .filter(product => product.similarityScore >= MIN_SIMILARITY_SCORE)
      .slice(0, limit);
    
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

