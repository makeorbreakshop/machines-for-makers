import { createRouteHandlerSupabase, createFallbackRouteHandler } from "@/lib/supabase/route-handler"
import { NextResponse } from "next/server"

export const runtime = 'edge';

export async function GET() {
  // First try with the normal route handler
  let supabase = createRouteHandlerSupabase();
  
  try {
    // Get logo URL from site settings
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "logo_url")
      .single()

    if (error) {
      console.error("Error fetching logo with standard client, trying fallback:", error)
      
      // Try again with the fallback method that uses direct service role
      supabase = createFallbackRouteHandler();
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "logo_url")
        .single()
        
      if (fallbackError) {
        console.error("Error fetching logo with fallback client:", fallbackError)
        return NextResponse.json({ url: null, message: "Could not fetch logo URL after multiple attempts." })
      }
      
      if (!fallbackData || !fallbackData.value) {
        return NextResponse.json({ url: null })
      }
      
      return NextResponse.json({ url: fallbackData.value })
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