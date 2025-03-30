import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

// GET a specific machine by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Create Supabase client with service role key to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 })
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

  try {
    const { data, error } = await supabase
      .from("machines")
      .select(`
        *,
        reviews(*),
        images(*)
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}

// PUT to update a machine
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Create Supabase client with service role key to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 })
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

  try {
    const machineData = await request.json()
    
    console.log("Updating machine with ID:", params.id)
    console.log("Form data received:", JSON.stringify(machineData, null, 2))

    // Transform data to match database column names (similar to POST endpoint)
    const dbData = {
      "Machine Name": machineData.machine_name,
      "Internal link": machineData.slug,
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
      "Hidden": machineData.hidden ? "true" : "false",
      "Image": machineData.image_url,
      "product_link": machineData.product_link,
      "Affiliate Link": machineData.affiliate_link,
      "YouTube Review": machineData.youtube_review,
      "Laser Frequency": machineData.laser_frequency,
      "Pulse Width": machineData.pulse_width,
      "Laser Source Manufacturer": machineData.laser_source_manufacturer,
      // Update timestamp
      "Updated On": new Date().toISOString(),
    }

    console.log("Transformed data for Supabase:", JSON.stringify(dbData, null, 2))

    const { data, error } = await supabase.from("machines").update(dbData).eq("id", params.id).select()

    if (error) {
      console.error("Error updating machine:", error.message, error.details || '')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Machine updated successfully:", data[0].id)
    return NextResponse.json({ data: data[0] })
  } catch (error: any) {
    console.error("Error updating machine:", error?.message || String(error), error?.stack || '')
    return NextResponse.json({ error: "Invalid request data", details: error?.message || String(error) }, { status: 400 })
  }
}

// DELETE a machine
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Create Supabase client with service role key to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 })
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

  try {
    const { error } = await supabase.from("machines").delete().eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}

