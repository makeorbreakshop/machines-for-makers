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

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Process the image with Sharp
    let optimizedBuffer: Buffer
    try {
      // Get file name without extension
      const fileNameWithoutExt = path.parse(file.name).name
      
      // Process image with Sharp
      optimizedBuffer = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true }) // Resize to max width of 1200px
        .webp({ quality: 80 }) // Convert to WebP with 80% quality
        .toBuffer()
      
      console.log("Image optimized successfully")
    } catch (err) {
      console.error("Image optimization failed:", err)
      // If optimization fails, fall back to original buffer
      optimizedBuffer = buffer
    }

    // Create a unique filename with webp extension
    const timestamp = Date.now()
    const fileName = path.parse(file.name).name
    const optimizedFileName = `${fileName}_${timestamp}.webp`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("images")
      .upload(`machines/${optimizedFileName}`, optimizedBuffer, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(data.path)

    return NextResponse.json({ 
      url: publicUrl,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: Math.round((1 - (optimizedBuffer.length / buffer.length)) * 100) + '%'
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

