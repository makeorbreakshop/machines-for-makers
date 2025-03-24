import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Get query parameters
  const category = searchParams.get("category")
  const limit = Number.parseInt(searchParams.get("limit") || "10")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const sort = searchParams.get("sort") || "Created On-desc"
  const search = searchParams.get("search")
  const minPrice = Number.parseFloat(searchParams.get("minPrice") || "0")
  const maxPrice = Number.parseFloat(searchParams.get("maxPrice") || "15000")
  const minPower = Number.parseFloat(searchParams.get("minPower") || "0")
  const maxPower = Number.parseFloat(searchParams.get("maxPower") || "150")
  const minSpeed = Number.parseFloat(searchParams.get("minSpeed") || "0")
  const maxSpeed = Number.parseFloat(searchParams.get("maxSpeed") || "2000")
  const minRating = Number.parseFloat(searchParams.get("minRating") || "0")

  // Get array parameters
  const laserTypes = searchParams.getAll("laserType")
  const brands = searchParams.getAll("brand")
  const features = searchParams.getAll("feature")

  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 })
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  try {
    // Build query
    let query = supabase.from("machines").select("*", { count: "exact" })

    // Apply filters
    if (category && category !== "all") {
      query = query.eq("Laser Category", category)
    }

    if (laserTypes.length > 0) {
      query = query.in("Laser Type A", laserTypes)
    }

    if (brands.length > 0) {
      query = query.in("Company", brands)
    }

    if (search) {
      query = query.ilike("Machine Name", `%${search}%`)
    }

    // Apply price range
    if (minPrice > 0) {
      query = query.gte("Price", minPrice)
    }
    if (searchParams.has("maxPrice")) {
      query = query.lte("Price", maxPrice)
    }

    // Apply power range filter - simplified to only use "Laser Power A"
    try {
      if (minPower > 0) {
        query = query.gte("Laser Power A", minPower)
      }
      
      if (maxPower < 150) {
        query = query.lte("Laser Power A", maxPower)
      }
    } catch (powerError) {
      console.error("Error applying power filters:", powerError)
      // Continue with the query without these filters
    }

    // Apply rating filter
    if (minRating > 0) {
      query = query.gte("Rating", minRating)
    }

    // Apply features filters - these are stored as "Yes" or "No" values in their respective columns
    if (features.length > 0) {
      // Build a filter for each feature
      features.forEach(feature => {
        switch (feature) {
          case 'Camera':
            query = query.eq('Camera', 'Yes')
            break
          case 'Wifi':
            query = query.eq('Wifi', 'Yes')
            break
          case 'Enclosure':
            query = query.eq('Enclosure', 'Yes')
            break
          case 'Focus':
            query = query.eq('Focus', 'Auto')
            break
          case 'Passthrough':
            query = query.eq('Passthrough', 'Yes')
            break
        }
      })
    }

    // Apply sorting
    try {
      const [sortField, sortDirection] = sort.split("-")
      if (sortField && sortDirection) {
        // Map from friendly names to actual database column names
        const columnMap: Record<string, string> = {
          "Price": "Price",
          "Power": "Laser Power A", 
          "Speed": "Speed",
          "Rating": "Rating",
          "Created On": "id", // Use id as a replacement for created_at
          // Add more mappings as needed
        }
        
        const dbColumn = columnMap[sortField] || "id" // Default to id instead of created_at
        query = query.order(dbColumn, { ascending: sortDirection === "asc" })
      }
    } catch (sortError) {
      console.error("Error applying sort:", sortError)
      // Continue with the query without sorting
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    console.log("Executing Supabase query")
    // Execute query
    const { data, error, count } = await query

    if (error) {
      console.error("Supabase error details:", error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post-processing for speed filter
    let filteredData = data || []
    if (data && (minSpeed > 0 || maxSpeed < 2000)) {
      filteredData = data.filter(machine => {
        if (!machine.Speed) return false
        
        // Extract numeric values from the Speed field
        const speedMatch = machine.Speed.match(/(\d+)/);
        if (speedMatch) {
          const speed = parseInt(speedMatch[1]);
          return speed >= minSpeed && speed <= maxSpeed;
        }
        return false; // Exclude machines with unparseable speed values
      })
    }

    return NextResponse.json({ 
      data: filteredData, 
      count: minSpeed > 0 || maxSpeed < 2000 ? filteredData.length : count 
    })
  } catch (error: any) {
    console.error("Error fetching machines:", error?.message, error?.details || error)
    return NextResponse.json({ error: "Failed to fetch machines", details: error?.message || String(error) }, { status: 500 })
  }
}

