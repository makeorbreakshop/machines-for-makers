import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    // Ensure only admin can access this endpoint
    await requireAdminAuth();
    
    // Get image URL from query parameter
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");
    
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
    }
    
    // Fetch the image
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch image: ${response.statusText}` 
      }, { status: response.status });
    }
    
    // Get image data as array buffer
    const imageData = await response.arrayBuffer();
    
    // Get content type
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error: any) {
    console.error("Proxy image error:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error" 
    }, { status: 500 });
  }
} 