import type { Category } from "@/lib/database-types"

// Get all categories
export async function getCategories() {
  const response = await fetch("/api/categories")
  const data = await response.json()

  return data
}

// Get a category by ID
export async function getCategoryById(id: string) {
  const response = await fetch(`/api/categories/${id}`)
  const data = await response.json()

  return data
}

// Create a new category
export async function createCategory(category: Partial<Category>) {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  })

  const data = await response.json()
  return data
}

// Update a category
export async function updateCategory(id: string, category: Partial<Category>) {
  const response = await fetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  })

  const data = await response.json()
  return data
}

// Delete a category
export async function deleteCategory(id: string) {
  const response = await fetch(`/api/categories/${id}`, {
    method: "DELETE",
  })

  const data = await response.json()
  return data
}

