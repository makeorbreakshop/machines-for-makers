import type { Machine } from "@/lib/database-types"

// Get all machines with optional filters
export async function getMachines(
  options: {
    limit?: number
    offset?: number
    category?: string
    company?: string
    sort?: string
  } = {},
) {
  const params = new URLSearchParams()

  if (options.limit) params.append("limit", options.limit.toString())
  if (options.offset) params.append("offset", options.offset.toString())
  if (options.category) params.append("category", options.category)
  if (options.company) params.append("company", options.company)
  if (options.sort) params.append("sort", options.sort)

  const response = await fetch(`/api/machines?${params.toString()}`)
  const data = await response.json()

  return data
}

// Get a machine by ID
export async function getMachineById(id: string) {
  const response = await fetch(`/api/machines/${id}`)
  const data = await response.json()

  return data
}

// Create a new machine
export async function createMachine(machine: Partial<Machine>) {
  const response = await fetch("/api/machines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(machine),
  })

  const data = await response.json()
  return data
}

// Update a machine
export async function updateMachine(id: string, machine: Partial<Machine>) {
  const response = await fetch(`/api/machines/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(machine),
  })

  const data = await response.json()
  return data
}

// Delete a machine
export async function deleteMachine(id: string) {
  const response = await fetch(`/api/machines/${id}`, {
    method: "DELETE",
  })

  const data = await response.json()
  return data
}

