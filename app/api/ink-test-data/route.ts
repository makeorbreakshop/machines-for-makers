import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

// GET handler to fetch test data for the calculation model
export async function GET(request: Request) {
  try {
    const supabase = await createServiceClient();
    
    // Get query parameters for filtering
    const url = new URL(request.url);
    const inkMode = url.searchParams.get("inkMode");
    const quality = url.searchParams.get("quality");
    const imageType = url.searchParams.get("imageType");
    
    // Build query
    let query = supabase
      .from("ink_test_data")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Apply filters if provided
    if (inkMode) {
      query = query.eq("ink_mode", inkMode);
    }
    
    if (quality) {
      query = query.eq("quality", quality);
    }
    
    if (imageType) {
      query = query.eq("image_type", imageType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching ink test data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
} 