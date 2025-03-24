import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET a specific machine by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("machines")
    .select(`
      *,
      reviews(*),
      images(*)
    `)
    .eq("id", params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ data })
}

// PUT to update a machine
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient()

  try {
    const machineData = await request.json()

    // Update timestamp
    machineData.updated_at = new Date().toISOString()

    const { data, error } = await supabase.from("machines").update(machineData).eq("id", params.id).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data[0] })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
}

// DELETE a machine
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient()

  const { error } = await supabase.from("machines").delete().eq("id", params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

