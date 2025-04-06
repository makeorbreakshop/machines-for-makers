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

// Update a machine with enhanced error handling
export async function updateMachine(id: string, machine: Partial<Machine>) {
  try {
    // Log the request just before sending
    console.log(`Sending PUT request to /api/machines/${id}`);
    
    const response = await fetch(`/api/machines/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(machine),
      // Important: Add credentials to ensure cookies are sent
      credentials: "include"
    });
    
    // Log the response status
    console.log(`Update response status: ${response.status}`);
    
    // Check if the response is ok before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      
      // Try parsing as JSON if possible
      try {
        const errorJson = JSON.parse(errorText);
        return { 
          error: true, 
          message: errorJson.error || "Update failed", 
          details: errorJson.details || errorJson 
        };
      } catch {
        // If not JSON, return the raw error text
        return { error: true, message: "Update failed", details: errorText };
      }
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Update machine error:", error);
    return { 
      error: true, 
      message: error instanceof Error ? error.message : "Unknown error",
      clientSideError: true
    };
  }
}

// Delete a machine
export async function deleteMachine(id: string) {
  const response = await fetch(`/api/machines/${id}`, {
    method: "DELETE",
  })

  const data = await response.json()
  return data
}

