import { createEdgeFallbackHandler } from "@/lib/supabase/route-handler"
import { NextResponse } from "next/server"

export const runtime = 'edge';

export async function GET() {
  try {
    // For edge runtime, use the edge-compatible client that doesn't rely on cookies
    const supabase = createEdgeFallbackHandler();
    
    // Get logo URL from site settings
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "logo_url")
      .single()

    if (error) {
      console.error("Error fetching logo:", error)
      return NextResponse.json({ url: null, message: "Could not fetch logo URL." })
    }

    if (!data || !data.value) {
      return NextResponse.json({ url: null })
    }

    return NextResponse.json({ url: data.value })
  } catch (error) {
    console.error("Error fetching logo:", error)
    return NextResponse.json({ url: null, error: "Failed to fetch logo" })
  }
} 