import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createRouteHandlerSupabase()
  const adminClient = createAdminClient()

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("File received:", file.name, file.type, file.size)

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log("Buffer created, size:", buffer.length)

    try {
      // First check if the images bucket exists
      const { data: buckets, error: bucketError } = await adminClient.storage.listBuckets()
      
      if (bucketError) {
        console.error("Error checking buckets:", bucketError)
        return NextResponse.json({ error: `Bucket check error: ${bucketError.message}` }, { status: 500 })
      }
      
      const imagesBucketExists = buckets.some(bucket => bucket.name === "images")
      
      if (!imagesBucketExists) {
        console.error("The 'images' bucket does not exist!")
        // Try to create the bucket using admin client
        const { error: createBucketError } = await adminClient.storage.createBucket("images", {
          public: true,
          fileSizeLimit: 1024 * 1024 * 2 // 2MB limit
        })
        
        if (createBucketError) {
          console.error("Failed to create 'images' bucket:", createBucketError)
          return NextResponse.json({ error: "The storage bucket doesn't exist and couldn't be created" }, { status: 500 })
        }
        
        console.log("Created 'images' bucket successfully")
      } else {
        console.log("The 'images' bucket exists")
      }

      // Upload to Supabase Storage in a logo folder using regular client
      const { data, error } = await supabase.storage
        .from("images")
        .upload(`logo/${Date.now()}_${file.name}`, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        })

      if (error) {
        console.error("Storage upload error:", error.message, error)
        return NextResponse.json({ error: `Storage upload error: ${error.message}` }, { status: 500 })
      }

      console.log("File uploaded successfully:", data.path)

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(data.path)

      console.log("Public URL generated:", publicUrl)

      // Update site settings with the new logo URL
      // First check if site_settings table has a logo record
      const { data: existingSettings, error: settingsError } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "logo_url")
        .single()

      // Only proceed with database operations if the table exists
      if (settingsError && settingsError.code !== 'PGRST116') {
        // PGRST116 is the "not found" error code, which is expected if no logo URL is set yet
        console.error("Error checking existing settings:", settingsError)
        // If the table doesn't exist or can't be accessed, just return the URL
        return NextResponse.json({ 
          url: publicUrl, 
          warning: "Could not save to settings database, but file was uploaded successfully. Please ensure the site_settings table exists." 
        })
      }

      console.log("Existing settings:", existingSettings)

      if (existingSettings) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("site_settings")
          .update({ value: publicUrl })
          .eq("key", "logo_url")
        
        if (updateError) {
          console.error("Error updating settings:", updateError)
          return NextResponse.json({ 
            url: publicUrl, 
            warning: "Logo uploaded to storage but could not update settings database" 
          })
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from("site_settings")
          .insert([{ key: "logo_url", value: publicUrl }])
        
        if (insertError) {
          console.error("Error inserting settings:", insertError)
          return NextResponse.json({ 
            url: publicUrl, 
            warning: "Logo uploaded to storage but could not create settings database entry" 
          })
        }
      }

      return NextResponse.json({ url: publicUrl })
    } catch (storageError: any) {
      console.error("Storage operation error:", storageError)
      return NextResponse.json({ error: `Storage operation failed: ${storageError.message || 'Unknown error'}` }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Logo upload error:", error)
    return NextResponse.json({ error: `Upload failed: ${error.message || 'Unknown error'}` }, { status: 500 })
  }
} 