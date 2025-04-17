import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"
import { createAdminClient } from "@/lib/supabase/admin"

// Specify nodejs runtime to ensure environment variables are properly accessible
export const runtime = 'nodejs';

// Debug utility for API monitoring
const DEBUG_MODE = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
const debug = {
  log: (...args: any[]) => {
    if (DEBUG_MODE) console.log('[API DEBUG]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[API ERROR]', ...args); // Always log errors
  },
  perf: (label: string, startTime: number) => {
    if (DEBUG_MODE) {
      const duration = performance.now() - startTime;
      console.log(`[API PERF] ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
    return 0;
  }
};

export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  debug.log(`Processing request from ${request.headers.get('x-forwarded-for') || 'unknown IP'}`);
  
  // Performance tracking for various operations
  const timings: Record<string, number> = {};
  
  // Add rate limit monitoring headers to response
  const responseHeaders: Record<string, string> = {
    'X-API-Request-Time': new Date().toISOString(),
    'X-API-Request-ID': Math.random().toString(36).substring(2, 15),
    // Add caching headers
    'Cache-Control': 'max-age=300, s-maxage=600, stale-while-revalidate=86400'
  };
  
  const searchParams = request.nextUrl.searchParams

  // Get query parameters
  const category = searchParams.get("category")
  const limit = Number.parseInt(searchParams.get("limit") || "50") // Default to 50 instead of 1000
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
  // Get specific fields to return if requested
  const includeHtml = searchParams.get("includeHtml") === "true"
  
  // Define fields to select - by default exclude HTML content and related fields unless explicitly requested
  let fields = searchParams.get("fields") || "default";
  
  // If fields is explicitly set to "*", honor that request regardless of includeHtml
  // Otherwise, use the appropriate default set of fields
  if (fields === "default") {
    fields = includeHtml 
      ? "*" 
      : `
        id, 
        "Machine Name", 
        "Internal link", 
        "Company", 
        "Image", 
        "Laser Type A", 
        "Laser Power A", 
        "Laser Type B", 
        "LaserPower B", 
        "Laser Category", 
        "Machine Category", 
        "Affiliate Link", 
        "Price", 
        "Price Category", 
        "Work Area", 
        "Height", 
        "Machine Size", 
        "Speed", 
        "Speed Category", 
        "Acceleration", 
        "Software", 
        "Focus", 
        "Enclosure", 
        "Wifi", 
        "Camera", 
        "Passthrough", 
        "Controller", 
        "Warranty", 
        "Rating", 
        "Award", 
        "Excerpt (Short)", 
        "Excerpt (Long)", 
        "Description", 
        "Review", 
        "Highlights", 
        "Drawbacks", 
        "YouTube Review", 
        "Is A Featured Resource?", 
        "Favorited", 
        "Hidden", 
        product_link, 
        "Laser Frequency", 
        "Pulse Width", 
        "Best for:", 
        "Laser Source Manufacturer", 
        "Created On", 
        "Updated On", 
        "Published On"
      `;
  }

  // Get array parameters
  const laserTypes = searchParams.getAll("laserType")
  const brands = searchParams.getAll("brand")
  const features = searchParams.getAll("feature")

  debug.log('Request parameters:', {
    limit, page, category, laserTypes, brands, features,
    minPrice, maxPrice, minPower, maxPower, minSpeed, maxSpeed 
  });

  // Create Supabase client with anonymous key for reading public data
  // Using anon key instead of service role key to fix production API key error
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 })
  }

  const supabaseInit = performance.now();
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
  timings.supabaseInit = performance.now() - supabaseInit;

  try {
    // Build query
    const queryBuildStart = performance.now();
    let query = supabase
      .from("machines")
      .select(fields, { count: "exact" })
      // Simplified hidden filter
      .filter('Hidden', 'not.eq', 'true')

    debug.log("API: Getting all visible machines with query:", query)

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

    // Apply power range filter - simplified
    if (minPower > 0) {
      query = query.gte("Laser Power A", minPower.toString())
    }
    if (maxPower < 150) {
      query = query.lte("Laser Power A", maxPower.toString())
    }

    // Apply rating filter
    if (minRating > 0) {
      query = query.gte("Rating", minRating)
    }

    // Apply features filters - simplified approach
    if (features.length > 0) {
      const featureConditions: string[] = [];
      
      features.forEach(feature => {
        switch (feature) {
          case 'Camera':
            featureConditions.push('Camera.eq.Yes');
            break;
          case 'Wifi':
            featureConditions.push('Wifi.eq.Yes');
            break;
          case 'Enclosure':
            featureConditions.push('Enclosure.eq.Yes');
            break;
          case 'Focus':
            featureConditions.push('Focus.eq.Auto');
            break;
          case 'Passthrough':
            featureConditions.push('Passthrough.eq.Yes');
            break;
        }
      });
      
      if (featureConditions.length > 0) {
        query = query.or(featureConditions.join(','));
      }
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

    // Apply pagination - proper implementation
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    timings.queryBuild = performance.now() - queryBuildStart;
    debug.log("API: Executing Supabase query with limit:", limit);
    
    // Execute query with timing
    const queryExecutionStart = performance.now();
    const { data, error, count, status } = await query;
    timings.queryExecution = performance.now() - queryExecutionStart;
    
    // Add query performance to response headers
    responseHeaders['X-Query-Time'] = timings.queryExecution.toString();
    responseHeaders['X-Supabase-Status'] = status.toString();
    responseHeaders['Server-Timing'] = Object.entries(timings)
      .map(([name, time]) => `${name};dur=${time.toFixed(2)}`)
      .join(',');
    
    // Check for potential rate limiting or throttling
    if (timings.queryExecution > 5000) {
      debug.error('POTENTIAL THROTTLING: Query took more than 5 seconds to execute');
      responseHeaders['X-Throttling-Warning'] = 'true';
    }

    if (error) {
      debug.error("Supabase error details:", error.message, error.details, error.hint, "Status:", status);
      
      // Check if error indicates rate limiting
      if (error.message.includes('rate limit') || error.message.includes('timeout') || status === 429) {
        debug.error('RATE LIMIT DETECTED in Supabase response');
        responseHeaders['X-Rate-Limited'] = 'true';
        return NextResponse.json(
          { error: error.message, isRateLimited: true }, 
          { status: 429, headers: responseHeaders }
        );
      }
      
      return NextResponse.json(
        { error: error.message }, 
        { status: 500, headers: responseHeaders }
      );
    }

    debug.log(`API: Retrieved ${data?.length || 0} machines out of ${count || 0} total`);
    responseHeaders['X-Result-Count'] = (data?.length || 0).toString();
    responseHeaders['X-Total-Count'] = (count || 0).toString();
    responseHeaders['X-Page'] = page.toString();
    responseHeaders['X-Limit'] = limit.toString();

    // Calculate total request time
    const totalTime = performance.now() - requestStart;
    responseHeaders['X-Total-Processing-Time'] = totalTime.toString();
    
    return NextResponse.json(
      { 
        data: data || [], 
        count, 
        page,
        totalPages: count ? Math.ceil(count / limit) : 0,
        performance: { totalTime, ...timings } 
      },
      { 
        headers: responseHeaders
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" }, 
      { status: 500, headers: responseHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Use the createAdminClient utility to ensure correct configuration
    const supabase = createAdminClient();

    // Get machine data from request
    const machineData = await request.json()
    
    // Ensure machine name is provided
    if (!machineData.machine_name) {
      return NextResponse.json({ error: "Machine name is required" }, { status: 400 })
    }
    
    // Transform data to match database column names
    const dbData = {
      "Machine Name": machineData.machine_name,
      "Internal link": machineData.slug || machineData.machine_name.toLowerCase().replace(/[^\w\s]/gi, "").replace(/\s+/g, "-"),
      "Company": machineData.company,
      "Machine Category": machineData.machine_category,
      "Laser Category": machineData.laser_category,
      "Price": machineData.price,
      "Rating": machineData.rating,
      "Award": machineData.award,
      "Laser Type A": machineData.laser_type_a,
      "Laser Power A": machineData.laser_power_a,
      "Laser Type B": machineData.laser_type_b,
      "LaserPower B": machineData.laser_power_b,
      "Work Area": machineData.work_area,
      "Speed": machineData.speed,
      "Height": machineData.height,
      "Machine Size": machineData.machine_size,
      "Acceleration": machineData.acceleration,
      "Software": machineData.software,
      "Focus": machineData.focus,
      "Enclosure": machineData.enclosure ? "Yes" : "No",
      "Wifi": machineData.wifi ? "Yes" : "No",
      "Camera": machineData.camera ? "Yes" : "No",
      "Passthrough": machineData.passthrough ? "Yes" : "No",
      "Controller": machineData.controller,
      "Warranty": machineData.warranty,
      "Excerpt (Short)": machineData.excerpt_short,
      "Description": machineData.description,
      "Highlights": machineData.highlights,
      "Drawbacks": machineData.drawbacks,
      "Is A Featured Resource?": machineData.is_featured ? "true" : "false",
      // Set hidden to true by default for all new machines
      "Hidden": "true",
      "Image": machineData.image_url,
      "product_link": machineData.product_link,
      "Affiliate Link": machineData.affiliate_link,
      "YouTube Review": machineData.youtube_review,
      "Laser Frequency": machineData.laser_frequency,
      "Pulse Width": machineData.pulse_width,
      "Laser Source Manufacturer": machineData.laser_source_manufacturer,
      // Set timestamps
      "Created On": new Date().toISOString(),
      "Updated On": new Date().toISOString(),
    }

    // Insert into database
    const { data, error } = await supabase
      .from("machines")
      .insert(dbData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}