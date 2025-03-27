import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

export const runtime = 'edge';

export async function GET() {
  try {
    // Get Supabase URL and key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Enhanced logging for debugging
    console.log("API: Processing top-picks request")
    
    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.error("API: Missing Supabase environment variables")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Create a new Supabase client for this request
    const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    console.log("API: Querying for top pick machines")
    
    // Get top pick machines - use the Award field with exact column names from schema
    // Using correct syntax for OR condition in Supabase
    const { data, error } = await supabase
      .from("machines")
      .select('id, "Machine Name", "Award", "Internal link", "Image", "Excerpt (Short)", "Price", "Laser Category"')
      .eq("Award", "Top Pick")
      .or('Hidden.is.null,"Hidden".eq.false')
      .order("Rating", { ascending: false })
      .limit(6)

    if (error) {
      console.error("API: Supabase error:", error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log("API: No top pick machines found")
      // Return empty array instead of error when no data is found
      return NextResponse.json({ topPicks: [] })
    }

    console.log(`API: Found ${data.length} top pick machines`)
    
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

    return NextResponse.json({ topPicks: transformedData })
  } catch (error: any) {
    console.error("API: Error in top-picks API route:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error?.message || String(error) },
      { status: 500 }
    )
  }
} 