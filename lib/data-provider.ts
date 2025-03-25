import {
  supabase,
  getMachines as supabaseMachines,
  getMachineBySlug as supabaseMachineBySlug,
  getReviewsByMachineId as supabaseReviews,
  getImagesByMachineId as supabaseImages,
  getCategories as supabaseCategories,
  getBrands as supabaseBrands,
  getRelatedProducts as supabaseRelatedProducts,
} from "./supabase"
import type { Machine } from "./database-types"

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

  // Images
  getImagesByMachineId: async (machineId: string) => {
    return await supabaseImages(machineId)
  },

  // Categories
  getCategories: async () => {
    return await supabaseCategories()
  },

  // Brands
  getBrands: async () => {
    return await supabaseBrands()
  },

  // Related Products
  getRelatedProducts: async (currentProduct: Machine, limit?: number) => {
    return await supabaseRelatedProducts(currentProduct, limit)
  },
}

