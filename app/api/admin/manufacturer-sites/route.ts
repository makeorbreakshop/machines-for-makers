import { createServiceClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

// GET all manufacturer sites
export async function GET() {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("manufacturer_sites")
      .select(`
        *,
        brands (
          Name,
          Slug
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching manufacturer sites:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in GET /api/admin/manufacturer-sites:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}

// POST create new manufacturer site
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await request.json()

    // Validate required fields
    if (!body.base_url) {
      return NextResponse.json(
        { error: "base_url is required" },
        { status: 400 }
      )
    }

    // Set defaults
    const siteData = {
      name: body.name || new URL(body.base_url).hostname,
      base_url: body.base_url,
      sitemap_url: body.sitemap_url || null,
      scraping_config: body.scraping_config || {},
      is_active: body.is_active !== undefined ? body.is_active : true,
      brand_id: body.brand_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from("manufacturer_sites")
      .insert(siteData)
      .select("*")
      .single()

    if (error) {
      console.error("Error creating manufacturer site:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error("Error in POST /api/admin/manufacturer-sites:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}