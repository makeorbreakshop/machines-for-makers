import {
  supabase,
  getMachines as supabaseMachines,
  getMachineBySlug as supabaseMachineBySlug,
  getReviewsByMachineId as supabaseReviews,
  getCategories as supabaseCategories,
  getBrands as supabaseBrands,
} from "./supabase"

// Data provider that uses Supabase
export const dataProvider = {
  // Machines
  getMachines: async (params: {
    limit?: number
    offset?: number
    category?: string | null
    company?: string | null
    priceRange?: [number, number] | null
    powerRange?: [number, number] | null
    speedRange?: [number, number] | null
    features?: string[] | null
    minRating?: number | null
    search?: string | null
    sort?: "newest" | "price-asc" | "price-desc" | "rating-desc"
  }) => {
    return await supabaseMachines(params)
  },

  getMachineBySlug: async (slug: string) => {
    return await supabaseMachineBySlug(slug)
  },

  // Reviews
  getReviewsByMachineId: async (machineId: string) => {
    return await supabaseReviews(machineId)
  },

  // Categories
  getCategories: async () => {
    return await supabaseCategories()
  },

  // Brands
  getBrands: async () => {
    return await supabaseBrands()
  },
}

