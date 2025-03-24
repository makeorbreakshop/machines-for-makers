import type { Review } from "@/lib/database-types"

// Get all reviews for a machine
export async function getReviewsByMachineId(machineId: string) {
  const response = await fetch(`/api/reviews?machine_id=${machineId}`)
  const data = await response.json()

  return data
}

// Get a review by ID
export async function getReviewById(id: string) {
  const response = await fetch(`/api/reviews/${id}`)
  const data = await response.json()

  return data
}

// Create a new review
export async function createReview(review: Partial<Review>) {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(review),
  })

  const data = await response.json()
  return data
}

// Update a review
export async function updateReview(id: string, review: Partial<Review>) {
  const response = await fetch(`/api/reviews/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(review),
  })

  const data = await response.json()
  return data
}

// Delete a review
export async function deleteReview(id: string) {
  const response = await fetch(`/api/reviews/${id}`, {
    method: "DELETE",
  })

  const data = await response.json()
  return data
}

