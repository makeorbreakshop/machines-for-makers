import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (!key) {
      return NextResponse.json({ error: "Key parameter is required" }, { status: 400 })
    }
    
    const supabase = createRouteHandlerSupabase()
    
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .single()
    
    if (error) {
      console.error(`Error fetching site setting for key "${key}":`, error)
      return NextResponse.json({ error: "Failed to fetch site setting" }, { status: 500 })
    }
    
    return NextResponse.json({ value: data?.value || null })
  } catch (error) {
    console.error("Error in site-settings API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 