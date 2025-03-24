import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET all brands
export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase.from("brands").select("*").order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST a new brand
export async function POST(request: Request) {
  const supabase = createServerClient()

  try {
    const brandData = await request.json()

    // Generate a slug if not provided
    if (!brandData.slug) {
      brandData.slug = brandData.name
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-")
    }

    // Set timestamps
    brandData.created_at = new Date().toISOString()
    brandData.updated_at = new Date().toISOString()

    const { data, error } = await supabase.from("brands").insert(brandData).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}

