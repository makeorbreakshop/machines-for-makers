import type { Brand } from "@/lib/database-types"

// Get all brands
export async function getBrands() {
  const response = await fetch("/api/brands")
  const data = await response.json()

  return data
}

// Get a brand by ID
export async function getBrandById(id: string) {
  const response = await fetch(`/api/brands/${id}`)
  const data = await response.json()

  return data
}

// Create a new brand
export async function createBrand(brand: Partial<Brand>) {
  const response = await fetch("/api/brands", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(brand),
  })

  const data = await response.json()
  return data
}

// Update a brand
export async function updateBrand(id: string, brand: Partial<Brand>) {
  const response = await fetch(`/api/brands/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(brand),
  })

  const data = await response.json()
  return data
}

// Delete a brand
export async function deleteBrand(id: string) {
  const response = await fetch(`/api/brands/${id}`, {
    method: "DELETE",
  })

  const data = await response.json()
  return data
}

