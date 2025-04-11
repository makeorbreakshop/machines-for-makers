import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Export the nodejs runtime for Supabase compatibility
export const runtime = 'nodejs';

/**
 * Get all machine categories, laser categories, companies and other reference data for the scraper
 * This will be used to provide valid options for Claude's prompt and dropdown fields
 */
export async function GET() {
  try {
    const supabase = createServerClient()

    // Get distinct machine categories from the existing machines
    const { data: machineCategories, error: mcError } = await supabase
      .from("machines")
      .select("\"Machine Category\"")
      .not("\"Machine Category\"", "is", null)
      .order("\"Machine Category\"")

    if (mcError) {
      return NextResponse.json({ error: mcError.message }, { status: 500 })
    }

    // Get distinct laser categories from the existing machines
    const { data: laserCategories, error: lcError } = await supabase
      .from("machines")
      .select("\"Laser Category\"")
      .not("\"Laser Category\"", "is", null)
      .order("\"Laser Category\"")

    if (lcError) {
      return NextResponse.json({ error: lcError.message }, { status: 500 })
    }

    // Get distinct laser types
    const { data: laserTypes, error: ltError } = await supabase
      .from("machines")
      .select("\"Laser Type A\"")
      .not("\"Laser Type A\"", "is", null)
      .order("\"Laser Type A\"")

    if (ltError) {
      return NextResponse.json({ error: ltError.message }, { status: 500 })
    }
    
    // Get all companies from the brands table
    const { data: companies, error: compError } = await supabase
      .from("brands")
      .select("id, \"Name\", \"Slug\"")
      .order("\"Name\"")
      
    if (compError) {
      return NextResponse.json({ error: compError.message }, { status: 500 })
    }

    // Extract unique values
    const uniqueMachineCategories = [...new Set(machineCategories.map((item: any) => item["Machine Category"]))];
    const uniqueLaserCategories = [...new Set(laserCategories.map((item: any) => item["Laser Category"]))];
    const uniqueLaserTypes = [...new Set(laserTypes.map((item: any) => item["Laser Type A"]))];

    return NextResponse.json({
      machineCategories: uniqueMachineCategories,
      laserCategories: uniqueLaserCategories,
      laserTypes: uniqueLaserTypes,
      companies: companies ? companies.map(company => ({
        id: company.id,
        name: company["Name"],
        slug: company["Slug"]
      })) : [],
      // Add common boolean features
      booleanFeatures: {
        enclosure: ["Yes", "No"],
        wifi: ["Yes", "No"],
        camera: ["Yes", "No"],
        passthrough: ["Yes", "No"]
      }
    })
  } catch (error) {
    console.error('Error fetching machine categories:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 