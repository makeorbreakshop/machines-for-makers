import { createServerClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = 'nodejs'

// GET all brands
export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase.from("brands").select("*").order("Name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST a new brand
export async function POST(request: Request) {
  const supabase = createServiceClient()

  try {
    const brandData = await request.json()

    // Generate a slug if not provided
    if (!brandData.Slug) {
      brandData.Slug = brandData.Name
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-")
    }

    // Set timestamps
    brandData["Created On"] = new Date().toISOString()
    brandData["Updated On"] = new Date().toISOString()
    brandData["Published On"] = new Date().toISOString()

    const { data, error } = await supabase.from("brands").insert(brandData).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}

