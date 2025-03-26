import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createRouteHandlerSupabase()

  try {
    // Get logo URL from site settings
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "logo_url")
      .single()

    if (error) {
      console.error("Error fetching logo from site_settings:", error)
      // Don't treat this as a fatal error, just return null URL
      return NextResponse.json({ url: null, message: "Could not fetch logo URL. Table might not exist yet." })
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