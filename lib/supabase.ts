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

  let query = supabase
    .from("machines")
    .select(`
      *,
      reviews(count),
      images(url)
    `)
    .eq("Hidden", false)
    .not("Published On", "is", null)

  // Apply filters
  if (category) {
    query = query.eq("Laser Category", category)
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

  const { data, error, count } = await query

  return { data, error, count }
}

export async function getMachineBySlug(slug: string) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from("machines")
    .select(`
      *,
      reviews(*),
      images(*)
    `)
    .eq("Internal link", slug)
    .eq("Hidden", false)
    .not("Published On", "is", null)
    .single()

  return { data, error }
}

// Reviews
export async function getReviewsByMachineId(machineId: string) {
  // Return empty data if Supabase is not initialized
  if (!supabase) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("machine_id", machineId)
    .not("published_at", "is", null)
    .order("created_at", { ascending: false })

  return { data, error }
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

