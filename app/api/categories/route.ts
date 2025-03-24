import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET all categories
export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST a new category
export async function POST(request: Request) {
  const supabase = createServerClient()

  try {
    const categoryData = await request.json()

    // Generate a slug if not provided
    if (!categoryData.slug) {
      categoryData.slug = categoryData.name
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-")
    }

    // Set timestamps
    categoryData.created_at = new Date().toISOString()
    categoryData.updated_at = new Date().toISOString()

    const { data, error } = await supabase.from("categories").insert(categoryData).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}

