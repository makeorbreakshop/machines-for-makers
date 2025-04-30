import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/auth-utils";

// GET handler to fetch all test data
export async function GET(request: Request) {
  try {
    await requireAdminAuth();
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
      { error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}

// POST handler to add new test data
export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("[INK-TEST-DATA] Starting POST request");
  
  try {
    console.log("[INK-TEST-DATA] Checking admin authentication");
    await requireAdminAuth();
    console.log("[INK-TEST-DATA] Admin auth verified - time elapsed:", Date.now() - startTime, "ms");
    
    const supabase = await createServiceClient();
    console.log("[INK-TEST-DATA] Supabase client created - time elapsed:", Date.now() - startTime, "ms");
    
    console.log("[INK-TEST-DATA] Parsing form data");
    const formData = await request.formData();
    console.log("[INK-TEST-DATA] Form data parsed - time elapsed:", Date.now() - startTime, "ms");
    
    // Extract form data
    const inkMode = formData.get("inkMode") as string;
    const quality = formData.get("quality") as string;
    const imageType = formData.get("imageType") as string;
    const dimensionsString = formData.get("dimensions") as string;
    const channelMlString = formData.get("channelMl") as string;
    const notes = formData.get("notes") as string;
    const imageFile = formData.get("image") as File;
    const imageAnalysisString = formData.get("imageAnalysis") as string;
    
    // Validate required fields
    if (!inkMode || !quality || !imageType || !dimensionsString || !channelMlString) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Parse JSON strings
    let dimensions;
    let channelMl;
    let imageAnalysis = null;
    
    try {
      dimensions = JSON.parse(dimensionsString);
      channelMl = JSON.parse(channelMlString);
      if (imageAnalysisString) {
        imageAnalysis = JSON.parse(imageAnalysisString);
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON data for dimensions, channelMl, or imageAnalysis" },
        { status: 400 }
      );
    }
    
    // Upload image if provided
    let imageUrl = null;
    if (imageFile && imageFile.size > 0) {
      console.log("[INK-TEST-DATA] Starting image upload, size:", imageFile.size, "bytes");
      const imageStartTime = Date.now();
      
      // Compress the image if it's large (over 1MB)
      let buffer;
      const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `ink-test-data/${fileName}`;
      
      // Get the file data as buffer
      buffer = Buffer.from(await imageFile.arrayBuffer());
      console.log("[INK-TEST-DATA] Buffer created - time elapsed:", Date.now() - imageStartTime, "ms");
      
      console.log("[INK-TEST-DATA] Uploading to storage bucket");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ink-calculator")
        .upload(filePath, buffer, {
          contentType: imageFile.type,
          cacheControl: "3600",
          duplex: 'half',
        });
      console.log("[INK-TEST-DATA] Upload complete - time elapsed:", Date.now() - imageStartTime, "ms");
      
      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload image: " + uploadError.message },
          { status: 500 }
        );
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("ink-calculator")
        .getPublicUrl(filePath);
      
      imageUrl = publicUrl;
      console.log("[INK-TEST-DATA] Image processing complete - total time:", Date.now() - imageStartTime, "ms");
    }
    
    // Insert data into Supabase
    console.log("[INK-TEST-DATA] Inserting data into database");
    const dbStartTime = Date.now();
    
    const { data, error } = await supabase
      .from("ink_test_data")
      .insert({
        ink_mode: inkMode,
        quality,
        image_type: imageType,
        dimensions,
        channel_ml: channelMl,
        image_url: imageUrl,
        notes,
        image_analysis: imageAnalysis
      })
      .select()
      .single();
    
    console.log("[INK-TEST-DATA] Database insert complete - time elapsed:", Date.now() - dbStartTime, "ms");
    
    if (error) {
      console.error("Error inserting test data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log("[INK-TEST-DATA] POST request complete - total time:", Date.now() - startTime, "ms");
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE handler to remove test data
export async function DELETE(request: Request) {
  try {
    await requireAdminAuth();
    const supabase = await createServiceClient();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Missing test data ID" },
        { status: 400 }
      );
    }
    
    // Get the record to find image URL
    const { data: testData } = await supabase
      .from("ink_test_data")
      .select("image_url")
      .eq("id", id)
      .single();
    
    // Delete the image if it exists
    if (testData?.image_url) {
      const imagePath = testData.image_url.split('/').pop();
      if (imagePath) {
        await supabase.storage
          .from("ink-calculator")
          .remove([`ink-test-data/${imagePath}`]);
      }
    }
    
    // Delete the database record
    const { error } = await supabase
      .from("ink_test_data")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting test data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
} 