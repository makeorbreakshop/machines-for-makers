import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

export const runtime = 'edge';

export async function GET() {
  try {
    // Get Supabase URL and key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Create a new Supabase client for this request
    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    // Get award machines
    const { data, error } = await supabase
      .from("machines")
      .select("id, \"Machine Name\", \"Award\", \"Internal link\", \"Image\", \"Excerpt (Short)\", \"Price\", \"Laser Category\"")
      .not("Award", "is", null)
      .eq("Hidden", false)
      .not('Published On', 'is', null)  // Only show published machines
      .order("Rating", { ascending: false })
      .limit(6)

    if (error) {
      console.error("Supabase error:", error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to match the expected format
    const transformedData = data.map(machine => ({
      id: machine.id,
      machine_name: machine["Machine Name"],
      award: machine["Award"],
      slug: machine["Internal link"],
      image_url: machine["Image"],
      excerpt_short: machine["Excerpt (Short)"],
      price: machine["Price"],
      laser_category: machine["Laser Category"]
    }))

    return NextResponse.json({ awardMachines: transformedData })
  } catch (error: any) {
    console.error("Error in award-machines API route:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error?.message || String(error) },
      { status: 500 }
    )
  }
} 