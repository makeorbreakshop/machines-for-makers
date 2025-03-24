import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET all reviews or reviews for a specific machine
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const machineId = searchParams.get("machine_id")

  const supabase = createServerClient()

  let query = supabase
    .from("reviews")
    .select("*")
    .not("published_at", "is", null)
    .order("created_at", { ascending: false })

  if (machineId) {
    query = query.eq("machine_id", machineId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST a new review
export async function POST(request: Request) {
  const supabase = createServerClient()

  try {
    const reviewData = await request.json()

    // Set timestamps
    reviewData.created_at = new Date().toISOString()
    reviewData.updated_at = new Date().toISOString()

    const { data, error } = await supabase.from("reviews").insert(reviewData).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}

