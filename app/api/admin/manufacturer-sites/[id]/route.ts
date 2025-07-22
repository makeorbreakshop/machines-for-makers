import { createServiceClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

// GET specific manufacturer site
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("manufacturer_sites")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Manufacturer site not found" },
          { status: 404 }
        )
      }
      console.error("Error fetching manufacturer site:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in GET /api/admin/manufacturer-sites/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}

// PUT update manufacturer site
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()
    const body = await request.json()

    // Validate required fields
    if (!body.base_url) {
      return NextResponse.json(
        { error: "base_url is required" },
        { status: 400 }
      )
    }

    const updateData = {
      name: body.name || new URL(body.base_url).hostname,
      base_url: body.base_url,
      sitemap_url: body.sitemap_url || null,
      scraping_config: body.scraping_config || {},
      is_active: body.is_active !== undefined ? body.is_active : true,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from("manufacturer_sites")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Manufacturer site not found" },
          { status: 404 }
        )
      }
      console.error("Error updating manufacturer site:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in PUT /api/admin/manufacturer-sites/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}

// DELETE manufacturer site
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    const { error } = await supabase
      .from("manufacturer_sites")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting manufacturer site:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/manufacturer-sites/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}