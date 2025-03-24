import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Get query parameters
  const category = searchParams.get("category")
  const limit = Number.parseInt(searchParams.get("limit") || "1000")
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
    let query = supabase
      .from("machines")
      .select("*", { count: "exact" })
      .or('Hidden.is.null,Hidden.eq.false,Hidden.eq.False,Hidden.ilike.%false%,Hidden.eq.No,Hidden.ilike.%no%,Hidden.neq.true,Hidden.neq.True,Hidden.not.ilike.%true%') // Only show non-hidden machines

    console.log("API: Getting all visible machines with query:", query)

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
      query = query.gte("Price", minPrice.toString())
    }
    if (searchParams.has("maxPrice")) {
      query = query.lte("Price", maxPrice.toString())
    }

    // Apply power range filter - handle text values
    try {
      if (minPower > 0 || maxPower < 150) {
        // Extract numeric value from text field for comparison
        query = query.or(
          `Laser Power A.gte.${minPower},Laser Power A.ilike.${minPower}%,Laser Power A.ilike.%${minPower}W%`
        )
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
      features.forEach(feature => {
        switch (feature) {
          case 'Camera':
            query = query.or('Camera.eq.Yes,Camera.ilike.%yes%,Camera.eq.true')
            break
          case 'Wifi':
            query = query.or('Wifi.eq.Yes,Wifi.ilike.%yes%,Wifi.eq.true')
            break
          case 'Enclosure':
            query = query.or('Enclosure.eq.Yes,Enclosure.ilike.%yes%,Enclosure.eq.true')
            break
          case 'Focus':
            query = query.or('Focus.eq.Auto,Focus.ilike.%auto%')
            break
          case 'Passthrough':
            query = query.or('Passthrough.eq.Yes,Passthrough.ilike.%yes%,Passthrough.eq.true')
            break
        }
      })
    }

    // Apply sorting
    try {
      const [sortField, sortDirection] = sort.split("-")
      if (sortField && sortDirection) {
        const columnMap: Record<string, string> = {
          "Price": "Price",
          "Power": "Laser Power A", 
          "Speed": "Speed",
          "Rating": "Rating",
          "Created On": "id",
        }
        
        const dbColumn = columnMap[sortField] || "id"
        query = query.order(dbColumn, { ascending: sortDirection === "asc" })
      }
    } catch (sortError) {
      console.error("Error applying sort:", sortError)
    }

    // Apply pagination - only if explicitly requested
    if (searchParams.has("page")) {
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)
    } else {
      // No pagination - get all results up to limit
      query = query.limit(limit)
    }

    console.log("API: Executing Supabase query with limit:", limit)
    const { data, error, count } = await query

    if (error) {
      console.error("Supabase error details:", error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`API: Retrieved ${data?.length || 0} machines out of ${count || 0} total`)

    // Post-processing for speed filter - more lenient parsing
    let filteredData = data || []
    if (data && (minSpeed > 0 || maxSpeed < 2000)) {
      filteredData = data.filter(machine => {
        if (!machine.Speed) return false
        
        // Extract numeric values from the Speed field
        const speedStr = machine.Speed.toString()
        const speedMatch = speedStr.match(/(\d+)/);
        if (speedMatch) {
          const speed = parseInt(speedMatch[1]);
          return speed >= minSpeed && speed <= maxSpeed;
        }
        
        // Try parsing the entire string as a number
        const speed = parseFloat(speedStr)
        if (!isNaN(speed)) {
          return speed >= minSpeed && speed <= maxSpeed;
        }
        
        return false;
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

