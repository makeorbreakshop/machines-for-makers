import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

// Specify nodejs runtime to ensure environment variables are properly accessible
export const runtime = 'nodejs';

// GET a specific machine by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Use the createAdminClient utility to ensure correct configuration
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("machines")
      .select(`
        *,
        reviews(*),
        images(*)
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error fetching machine:", error?.message || error);
    return NextResponse.json({ error: "Invalid request data", details: error?.message || error }, { status: 400 })
  }
}

// PUT to update a machine
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Debug info
    console.log("===== PUT REQUEST DEBUG =====");
    console.log("Node environment:", process.env.NODE_ENV);
    console.log("Vercel environment:", process.env.VERCEL_ENV);
    console.log("Request path:", request.url);
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));
    console.log("Cookie header:", request.headers.get('cookie'));
    console.log("Authorization header:", request.headers.get('authorization'));
    
    // Debug Supabase config
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log("Supabase URL exists:", !!supabaseUrl);
    console.log("Supabase Service Key exists:", !!supabaseServiceKey);
    console.log("Supabase URL prefix:", supabaseUrl?.substring(0, 10));
    console.log("Service Key length:", supabaseServiceKey?.length);
    
    // Use the createAdminClient utility to ensure correct configuration
    const supabase = createAdminClient();
    
    const machineData = await request.json()
    
    console.log("Updating machine with ID:", params.id)
    console.log("Form data received:", JSON.stringify(machineData, null, 2))

    // Fetch the current machine data to check if Hidden status is changing
    const { data: currentMachine, error: fetchError } = await supabase
      .from("machines")
      .select("Hidden, \"Published On\"")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      console.error("Error fetching current machine state:", fetchError.message)
      console.error("Fetch error details:", {
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint
      });
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Extract images array for separate handling
    const { images = [], ...restMachineData } = machineData;
    console.log(`Processing ${images.length} images for machine ${params.id}`);

    // Transform data to match database column names (similar to POST endpoint)
    const dbData: Record<string, any> = {
      "Machine Name": restMachineData.machine_name,
      "Internal link": restMachineData.slug,
      "Company": restMachineData.company,
      "Machine Category": restMachineData.machine_category,
      "Laser Category": restMachineData.laser_category,
      "Price": restMachineData.price,
      "Rating": restMachineData.rating,
      "Award": restMachineData.award,
      "Laser Type A": restMachineData.laser_type_a,
      "Laser Power A": restMachineData.laser_power_a,
      "Laser Type B": restMachineData.laser_type_b,
      "LaserPower B": restMachineData.laser_power_b,
      "Work Area": restMachineData.work_area,
      "Speed": restMachineData.speed,
      "Height": restMachineData.height,
      "Machine Size": restMachineData.machine_size,
      "Acceleration": restMachineData.acceleration,
      "Software": restMachineData.software,
      "Focus": restMachineData.focus,
      "Enclosure": restMachineData.enclosure ? "Yes" : "No",
      "Wifi": restMachineData.wifi ? "Yes" : "No",
      "Camera": restMachineData.camera ? "Yes" : "No",
      "Passthrough": restMachineData.passthrough ? "Yes" : "No",
      "Controller": restMachineData.controller,
      "Warranty": restMachineData.warranty,
      "Excerpt (Short)": restMachineData.excerpt_short,
      "Description": restMachineData.description,
      "Highlights": restMachineData.highlights,
      "Drawbacks": restMachineData.drawbacks,
      "Is A Featured Resource?": restMachineData.is_featured ? "true" : "false",
      "Hidden": restMachineData.hidden ? "true" : "false",
      "Image": restMachineData.image_url, // Still maintain primary image for backwards compatibility
      "product_link": restMachineData.product_link,
      "Affiliate Link": restMachineData.affiliate_link,
      "YouTube Review": restMachineData.youtube_review,
      "Laser Frequency": restMachineData.laser_frequency,
      "Pulse Width": restMachineData.pulse_width,
      "Laser Source Manufacturer": restMachineData.laser_source_manufacturer,
      // Update timestamp
      "Updated On": new Date().toISOString(),
    }

    // If machine is being made visible for the first time, set Published On
    if (
      currentMachine?.Hidden === "true" && // Was previously hidden
      restMachineData.hidden === false && // Now being made visible
      !currentMachine["Published On"] // Has never been published before
    ) {
      console.log("First-time publishing detected. Setting Published On date.")
      dbData["Published On"] = new Date().toISOString();
    }

    console.log("Transformed data for Supabase:", JSON.stringify(dbData, null, 2))

    // Start a transaction to update both machine and images
    const { data, error } = await supabase.rpc('update_machine_with_images', {
      p_machine_id: params.id,
      p_machine_data: dbData,
      p_images: images.map((url: string, index: number) => ({
        url, 
        machine_id: params.id,
        sort_order: index,
        alt_text: `${restMachineData.machine_name || 'Machine'} image ${index + 1}`
      }))
    }).single();

    // Fallback if RPC is not available (less ideal but works)
    if (error && error.message.includes('function "update_machine_with_images" does not exist')) {
      console.log("RPC function not available, using fallback method");
      
      // Update machine data
      const { data: machineUpdateData, error: machineUpdateError } = await supabase
        .from("machines")
        .update(dbData)
        .eq("id", params.id)
        .select();
      
      if (machineUpdateError) {
        console.error("Error updating machine:", machineUpdateError.message, machineUpdateError.details || '')
        return NextResponse.json({ error: machineUpdateError.message }, { status: 500 })
      }
      
      // Delete existing images for this machine
      const { error: deleteImagesError } = await supabase
        .from("images")
        .delete()
        .eq("machine_id", params.id);
      
      if (deleteImagesError) {
        console.error("Error deleting existing images:", deleteImagesError.message)
        // Continue anyway, as the machine update was successful
      }
      
      // Insert new images if any
      if (images.length > 0) {
        const imageRecords = images.map((url: string, index: number) => ({
          machine_id: params.id,
          url: url,
          alt_text: `${restMachineData.machine_name || 'Machine'} image ${index + 1}`,
          sort_order: index
        }));
        
        const { error: insertImagesError } = await supabase
          .from("images")
          .insert(imageRecords);
        
        if (insertImagesError) {
          console.error("Error inserting images:", insertImagesError.message)
          // We'll still return success for the machine update
        } else {
          console.log(`Successfully saved ${images.length} images for machine ${params.id}`);
        }
      }
      
      console.log("Machine updated successfully:", machineUpdateData?.[0]?.id)
      return NextResponse.json({ data: machineUpdateData?.[0] })
    }
    
    if (error) {
      console.error("Error in transaction:", error.message, error.details || '')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Machine and images updated successfully in transaction")
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Detailed error in PUT:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    return NextResponse.json({ error: "Invalid request data", details: error?.message || String(error) }, { status: 400 })
  }
}

// DELETE a machine
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Use the createAdminClient utility to ensure correct configuration
    const supabase = createAdminClient();

    const { error } = await supabase.from("machines").delete().eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting machine:", error?.message || error);
    return NextResponse.json({ error: "Invalid request data", details: error?.message || error }, { status: 400 })
  }
}