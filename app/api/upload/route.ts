// Use nodejs runtime for this route since it uses file processing
export const runtime = 'nodejs';

import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import sharp from "sharp"
import path from "path"

export async function POST(request: Request) {
  const supabase = createServerClient()

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`Processing image: ${file.name} (${file.size} bytes, type: ${file.type})`)

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Get original image dimensions
    let originalWidth = 0;
    let originalHeight = 0;
    let optimizedWidth = 0;
    let optimizedHeight = 0;
    
    try {
      const originalMetadata = await sharp(buffer).metadata();
      originalWidth = originalMetadata.width || 0;
      originalHeight = originalMetadata.height || 0;
      console.log(`Original dimensions: ${originalWidth}x${originalHeight}`)
    } catch (err) {
      console.error("Error reading image metadata:", err);
    }
    
    // Process the image with Sharp
    let optimizedBuffer: Buffer;
    const processingInfo = {
      resized: false,
      format: file.type
    };
    
    try {
      // Get file name without extension
      const fileNameWithoutExt = path.parse(file.name).name
      
      // Create Sharp instance and get metadata
      const sharpInstance = sharp(buffer);
      
      // Determine if image needs resizing
      if (originalWidth > 1200) {
        sharpInstance.resize({ width: 1200, withoutEnlargement: true });
        processingInfo.resized = true;
      }
      
      // Convert to WebP with appropriate quality
      optimizedBuffer = await sharpInstance
        .webp({ quality: 80, effort: 6 }) // WebP with 80% quality, higher effort for better compression
        .toBuffer();
      
      // Get optimized dimensions
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();
      optimizedWidth = optimizedMetadata.width || 0;
      optimizedHeight = optimizedMetadata.height || 0;
      processingInfo.format = 'image/webp';
      
      console.log(`Image optimized successfully to ${optimizedWidth}x${optimizedHeight}`);
    } catch (err) {
      console.error("Image optimization failed:", err)
      // If optimization fails, fall back to original buffer
      optimizedBuffer = buffer
    }

    // Create a unique filename with webp extension
    const timestamp = Date.now()
    const fileName = path.parse(file.name).name
    // Sanitize the filename - remove spaces and special characters
    const sanitizedFileName = fileName
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 200) // Limit length to avoid issues
    const optimizedFileName = `${sanitizedFileName}_${timestamp}.webp`
    const folderPath = "machines"
    const filePath = `${folderPath}/${optimizedFileName}`

    // Check if the folder exists, if not create a dummy file (Supabase doesn't have explicit folder creation)
    try {
      const { data: folderExists, error: folderCheckError } = await supabase.storage
        .from("images")
        .list(folderPath)
      
      if (folderCheckError && folderCheckError.message !== "The resource was not found") {
        console.error("Error checking folder:", folderCheckError)
        // Continue anyway, the upload might still work
      } else if (!folderExists || folderExists.length === 0) {
        console.log(`Folder "${folderPath}" doesn't exist, creating it...`)
        // Create an empty .placeholder file to ensure folder exists
        const placeholderFileName = `.placeholder_${timestamp}`
        const { error: placeholderError } = await supabase.storage
          .from("images")
          .upload(`${folderPath}/${placeholderFileName}`, new Uint8Array(0), {
            contentType: "application/octet-stream",
            upsert: true,
          })
        
        if (placeholderError) {
          console.error("Error creating folder:", placeholderError)
          // Continue anyway, the upload might still work
        }
      }
    } catch (err) {
      console.error("Error during folder check/creation:", err)
      // Continue anyway, the upload might still work
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, optimizedBuffer, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000", // 1 year cache
        upsert: true, // Overwrite if file exists
      })

    if (error) {
      console.error("Storage upload error:", error)
      return NextResponse.json({ 
        error: error.message,
        details: {
          message: error.message,
          name: error.name
        }
      }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(data.path)

    console.log(`Image uploaded to: ${publicUrl}`)
    console.log(`Size reduction: ${buffer.length} -> ${optimizedBuffer.length} bytes`)

    return NextResponse.json({ 
      url: publicUrl,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: Math.round((1 - (optimizedBuffer.length / buffer.length)) * 100) + '%',
      originalDimensions: {
        width: originalWidth,
        height: originalHeight
      },
      optimizedDimensions: {
        width: optimizedWidth,
        height: optimizedHeight
      },
      processing: processingInfo
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ 
      error: "Upload failed", 
      message: error.message || "Unknown error", 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 })
  }
}