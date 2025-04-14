import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET a specific review by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient()

  // In Next.js 15, params is a promise that must be awaited
  const unwrappedParams = await params;
  const id = unwrappedParams.id;

  const { data, error } = await supabase.from("reviews").select("*").eq("id", id).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ data })
}

// PUT to update a review
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient()

  try {
    const reviewData = await request.json()

    // Update timestamp
    reviewData.updated_at = new Date().toISOString()

    const { data, error } = await supabase.from("reviews").update(reviewData).eq("id", params.id).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data[0] })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}

// DELETE a review
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient()

  const { error } = await supabase.from("reviews").delete().eq("id", params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

