import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/auth-utils";

// POST endpoint to recalculate image analysis for a test data entry
export async function POST(request: Request) {
  try {
    // Ensure only admin can perform this operation
    await requireAdminAuth();
    
    // Parse the request body to get the test data ID
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: "Missing test data ID" }, { status: 400 });
    }
    
    // Get Supabase client
    const supabase = await createServiceClient();
    
    // Fetch the test data entry
    const { data: testData, error: fetchError } = await supabase
      .from("ink_test_data")
      .select("*")
      .eq("id", id)
      .single();
    
    if (fetchError) {
      console.error("Error fetching test data:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!testData) {
      return NextResponse.json({ error: "Test data not found" }, { status: 404 });
    }
    
    // Check if the test data has an image URL
    if (!testData.image_url) {
      return NextResponse.json({ 
        error: "This test data entry has no image to analyze" 
      }, { status: 400 });
    }
    
    // We need to return the image URL and ink mode to the client
    // The actual analysis will happen client-side where we have access to the Canvas API
    return NextResponse.json({
      success: true,
      testData: {
        id: testData.id,
        ink_mode: testData.ink_mode,
        image_url: testData.image_url
      }
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error" 
    }, { status: 500 });
  }
}

// PUT endpoint to update the test data with analysis results
export async function PUT(request: Request) {
  try {
    // Ensure only admin can perform this operation
    await requireAdminAuth();
    
    // Parse the request body
    const { id, image_analysis } = await request.json();
    
    if (!id || !image_analysis) {
      return NextResponse.json({ 
        error: "Missing required fields: id, image_analysis" 
      }, { status: 400 });
    }
    
    // Get Supabase client
    const supabase = await createServiceClient();
    
    // Update the test data with the analysis results
    const { data, error } = await supabase
      .from("ink_test_data")
      .update({ image_analysis })
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating test data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Image analysis updated successfully", 
      data 
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error" 
    }, { status: 500 });
  }
} 