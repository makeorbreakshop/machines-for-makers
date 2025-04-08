export const runtime = 'nodejs';

import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { optimizeImage, ensureSupabaseFolderExists } from "@/lib/imageUtils";

const BUCKET_NAME = 'images';
const BASE_FOLDER = 'learn-lightburn';

export async function POST(request: Request) {
  const supabase = createServerClient();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const subfolder = formData.get("subfolder") as string | null; // e.g., 'hero', 'projects'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    if (!subfolder || typeof subfolder !== 'string') {
      return NextResponse.json({ error: "Missing or invalid 'subfolder' parameter" }, { status: 400 });
    }

    console.log(`Processing image for Learn Lightburn: ${file.name}, Subfolder: ${subfolder}`);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Optimize the image
    const {
      optimizedBuffer,
      optimizedFileName,
      originalWidth,
      originalHeight,
      optimizedWidth,
      optimizedHeight,
      processingInfo,
    } = await optimizeImage(buffer, file.name);

    // Construct the full path including the subfolder
    const folderPath = `${BASE_FOLDER}/${subfolder.trim().replace(/^\/+|\/+$/g, '')}`; // Clean subfolder path
    const filePath = `${folderPath}/${optimizedFileName}`;

    // Ensure the target folder exists in Supabase
    await ensureSupabaseFolderExists(supabase, BUCKET_NAME, folderPath);

    // Upload the optimized image to Supabase Storage
    console.log(`Uploading optimized image to Supabase path: ${filePath}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, optimizedBuffer, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000", // 1 year cache
        upsert: true, // Overwrite if file exists (useful for updates)
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);

    console.log(`Image uploaded successfully: ${publicUrl}`);

    return NextResponse.json({
      url: publicUrl,
      path: uploadData.path,
      fileName: optimizedFileName,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: buffer.length > 0 ? Math.round((1 - (optimizedBuffer.length / buffer.length)) * 100) + '%' : 'N/A',
      originalDimensions: { width: originalWidth, height: originalHeight },
      optimizedDimensions: { width: optimizedWidth, height: optimizedHeight },
      processingInfo,
    });

  } catch (error: any) {
    console.error("Learn Lightburn image upload error:", error);
    return NextResponse.json({
      error: "Upload failed",
      message: error.message || "Unknown error",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
} 