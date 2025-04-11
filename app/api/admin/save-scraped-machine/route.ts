import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

// Use nodejs runtime for Supabase operations as per DEVELOPMENT_GUIDELINES
export const runtime = 'nodejs';

// Define validation schema for machine data
const machineSchema = z.object({
  id: z.string().optional(), // Optional ID for updates
  machine_name: z.string().min(2, { message: "Machine name is required" }),
  company: z.string().min(1, { message: "Company name is required" }),
  machine_category: z.string().optional(),
  laser_category: z.string().optional(),
  price: z.number().optional(),
  rating: z.number().optional(),
  award: z.string().optional(),
  image_url: z.string().optional(),
  images: z.array(z.string()).optional(), // Array of image URLs
  laser_type_a: z.string().optional(),
  laser_power_a: z.string().optional(),
  laser_type_b: z.string().optional(),
  laser_power_b: z.string().optional(),
  laser_frequency: z.string().optional(),
  pulse_width: z.string().optional(),
  laser_source_manufacturer: z.string().optional(),
  work_area: z.string().optional(),
  machine_size: z.string().optional(),
  height: z.string().optional(),
  speed: z.string().optional(),
  speed_category: z.string().optional(),
  acceleration: z.string().optional(),
  focus: z.string().optional(),
  controller: z.string().optional(),
  software: z.string().optional(),
  warranty: z.string().optional(),
  enclosure: z.boolean().default(false),
  wifi: z.boolean().default(false),
  camera: z.boolean().default(false),
  passthrough: z.boolean().default(false),
  excerpt_short: z.string().optional(),
  description: z.string().optional(),
  highlights: z.string().optional(),
  drawbacks: z.string().optional(),
  product_link: z.string().optional(),
  affiliate_link: z.string().optional(),
  youtube_review: z.string().optional(),
  is_featured: z.boolean().default(false),
  hidden: z.boolean().default(true),
});

// Create a machine
export async function POST(request: NextRequest) {
  try {
    // Get the machine data from the request
    const machineData = await request.json();
    
    // Validate the data
    const parsedData = machineSchema.safeParse(machineData);
    
    if (!parsedData.success) {
      // Return validation errors
      return NextResponse.json(
        { 
          message: 'Validation failed', 
          errors: parsedData.error.format() 
        },
        { status: 400 }
      );
    }
    
    // Initialize Supabase admin client
    const supabase = createAdminClient();
    
    // Insert the machine into the database
    const { data, error } = await supabase
      .from('machines')
      .insert([
        {
          "Machine Name": parsedData.data.machine_name,
          "Company": parsedData.data.company,
          "Machine Category": parsedData.data.machine_category || null,
          "Laser Category": parsedData.data.laser_category || null,
          "Price": parsedData.data.price || null,
          "Rating": parsedData.data.rating || null,
          "Award": parsedData.data.award || null,
          "Image": parsedData.data.image_url || null,
          "Laser Type A": parsedData.data.laser_type_a || null,
          "Laser Power A": parsedData.data.laser_power_a || null,
          "Laser Type B": parsedData.data.laser_type_b || null,
          "LaserPower B": parsedData.data.laser_power_b || null,
          "Laser Frequency": parsedData.data.laser_frequency || null,
          "Pulse Width": parsedData.data.pulse_width || null,
          "Laser Source Manufacturer": parsedData.data.laser_source_manufacturer || null,
          "Work Area": parsedData.data.work_area || null,
          "Machine Size": parsedData.data.machine_size || null,
          "Height": parsedData.data.height || null,
          "Speed": parsedData.data.speed || null,
          "Speed Category": parsedData.data.speed_category || null,
          "Acceleration": parsedData.data.acceleration || null,
          "Focus": parsedData.data.focus || null,
          "Controller": parsedData.data.controller || null,
          "Software": parsedData.data.software || null,
          "Warranty": parsedData.data.warranty || null,
          "Enclosure": parsedData.data.enclosure ? "Yes" : "No",
          "Wifi": parsedData.data.wifi ? "Yes" : "No",
          "Camera": parsedData.data.camera ? "Yes" : "No",
          "Passthrough": parsedData.data.passthrough ? "Yes" : "No",
          "Excerpt (Short)": parsedData.data.excerpt_short || null,
          "Description": parsedData.data.description || null,
          "Highlights": parsedData.data.highlights || null,
          "Drawbacks": parsedData.data.drawbacks || null,
          "product_link": parsedData.data.product_link || null,
          "Affiliate Link": parsedData.data.affiliate_link || null,
          "YouTube Review": parsedData.data.youtube_review || null,
          "Is A Featured Resource?": parsedData.data.is_featured ? "Yes" : "No",
          "Hidden": parsedData.data.hidden ? "Yes" : "No",
          "Created On": new Date().toISOString(),
          "Updated On": new Date().toISOString(),
        }
      ])
      .select("id")
      .single();
    
    if (error) {
      console.error('Error inserting machine:', error);
      return NextResponse.json(
        { message: 'Failed to save machine data', error: error.message },
        { status: 500 }
      );
    }
    
    // Return the created machine data
    return NextResponse.json({
      message: 'Machine created successfully',
      machine_id: data?.id
    });
  } catch (error) {
    console.error('Error saving machine data:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

// Update an existing machine
export async function PUT(request: NextRequest) {
  try {
    // Get the machine data from the request
    const machineData = await request.json();
    
    // Ensure ID is provided for update
    if (!machineData.id) {
      return NextResponse.json(
        { message: 'Machine ID is required for updates' },
        { status: 400 }
      );
    }
    
    // Handle images separately if provided
    const images = machineData.images || [];
    
    // Extract the ID and remove it from the validation schema
    const { id, images: _, ...updateData } = machineData;
    
    // Validate the update data
    const parsedData = machineSchema.partial().safeParse(updateData);
    
    if (!parsedData.success) {
      // Return validation errors
      return NextResponse.json(
        { 
          message: 'Validation failed', 
          errors: parsedData.error.format() 
        },
        { status: 400 }
      );
    }
    
    // Initialize Supabase admin client
    const supabase = createAdminClient();
    
    // Format the data for database update
    const formattedData: Record<string, any> = {};
    
    // Only include fields that are present in the update
    if ('machine_name' in parsedData.data) formattedData["Machine Name"] = parsedData.data.machine_name;
    if ('company' in parsedData.data) formattedData["Company"] = parsedData.data.company;
    if ('machine_category' in parsedData.data) formattedData["Machine Category"] = parsedData.data.machine_category || null;
    if ('laser_category' in parsedData.data) formattedData["Laser Category"] = parsedData.data.laser_category || null;
    if ('price' in parsedData.data) formattedData["Price"] = parsedData.data.price || null;
    if ('rating' in parsedData.data) formattedData["Rating"] = parsedData.data.rating || null;
    if ('award' in parsedData.data) formattedData["Award"] = parsedData.data.award || null;
    if ('image_url' in parsedData.data) formattedData["Image"] = parsedData.data.image_url || null;
    if ('laser_type_a' in parsedData.data) formattedData["Laser Type A"] = parsedData.data.laser_type_a || null;
    if ('laser_power_a' in parsedData.data) formattedData["Laser Power A"] = parsedData.data.laser_power_a || null;
    if ('laser_type_b' in parsedData.data) formattedData["Laser Type B"] = parsedData.data.laser_type_b || null;
    if ('laser_power_b' in parsedData.data) formattedData["LaserPower B"] = parsedData.data.laser_power_b || null;
    if ('laser_frequency' in parsedData.data) formattedData["Laser Frequency"] = parsedData.data.laser_frequency || null;
    if ('pulse_width' in parsedData.data) formattedData["Pulse Width"] = parsedData.data.pulse_width || null;
    if ('laser_source_manufacturer' in parsedData.data) formattedData["Laser Source Manufacturer"] = parsedData.data.laser_source_manufacturer || null;
    if ('work_area' in parsedData.data) formattedData["Work Area"] = parsedData.data.work_area || null;
    if ('machine_size' in parsedData.data) formattedData["Machine Size"] = parsedData.data.machine_size || null;
    if ('height' in parsedData.data) formattedData["Height"] = parsedData.data.height || null;
    if ('speed' in parsedData.data) formattedData["Speed"] = parsedData.data.speed || null;
    if ('speed_category' in parsedData.data) formattedData["Speed Category"] = parsedData.data.speed_category || null;
    if ('acceleration' in parsedData.data) formattedData["Acceleration"] = parsedData.data.acceleration || null;
    if ('focus' in parsedData.data) formattedData["Focus"] = parsedData.data.focus || null;
    if ('controller' in parsedData.data) formattedData["Controller"] = parsedData.data.controller || null;
    if ('software' in parsedData.data) formattedData["Software"] = parsedData.data.software || null;
    if ('warranty' in parsedData.data) formattedData["Warranty"] = parsedData.data.warranty || null;
    if ('enclosure' in parsedData.data) formattedData["Enclosure"] = parsedData.data.enclosure ? "Yes" : "No";
    if ('wifi' in parsedData.data) formattedData["Wifi"] = parsedData.data.wifi ? "Yes" : "No";
    if ('camera' in parsedData.data) formattedData["Camera"] = parsedData.data.camera ? "Yes" : "No";
    if ('passthrough' in parsedData.data) formattedData["Passthrough"] = parsedData.data.passthrough ? "Yes" : "No";
    if ('excerpt_short' in parsedData.data) formattedData["Excerpt (Short)"] = parsedData.data.excerpt_short || null;
    if ('description' in parsedData.data) formattedData["Description"] = parsedData.data.description || null;
    if ('highlights' in parsedData.data) formattedData["Highlights"] = parsedData.data.highlights || null;
    if ('drawbacks' in parsedData.data) formattedData["Drawbacks"] = parsedData.data.drawbacks || null;
    if ('product_link' in parsedData.data) formattedData["product_link"] = parsedData.data.product_link || null;
    if ('affiliate_link' in parsedData.data) formattedData["Affiliate Link"] = parsedData.data.affiliate_link || null;
    if ('youtube_review' in parsedData.data) formattedData["YouTube Review"] = parsedData.data.youtube_review || null;
    if ('is_featured' in parsedData.data) formattedData["Is A Featured Resource?"] = parsedData.data.is_featured ? "Yes" : "No";
    if ('hidden' in parsedData.data) formattedData["Hidden"] = parsedData.data.hidden ? "Yes" : "No";
    
    // Always update the "Updated On" timestamp
    formattedData["Updated On"] = new Date().toISOString();
    
    // Update the machine in the database
    const { data, error } = await supabase
      .from('machines')
      .update(formattedData)
      .eq('id', id)
      .select("id")
      .single();
    
    if (error) {
      console.error('Error updating machine:', error);
      return NextResponse.json(
        { message: 'Failed to update machine data', error: error.message },
        { status: 500 }
      );
    }
    
    // Handle multiple images if provided
    if (images && images.length > 0) {
      // First, set the primary image if not already set
      if (!formattedData["Image"] && images[0]) {
        await supabase
          .from('machines')
          .update({ "Image": images[0] })
          .eq('id', id);
      }
      
      // Then store additional images in the images table
      if (images.length > 1) {
        // First, get existing images for this machine to avoid duplicates
        const { data: existingImages } = await supabase
          .from('images')
          .select('url')
          .eq('machine_id', id);
        
        const existingUrls = new Set(existingImages?.map(img => img.url) || []);
        
        // Prepare new images to insert
        const newImages = images
          .filter(url => !existingUrls.has(url))
          .map((url, index) => ({
            machine_id: id,
            url: url,
            alt_text: `${parsedData.data.machine_name || 'Machine'} image ${index + 1}`,
            sort_order: index + existingUrls.size
          }));
        
        if (newImages.length > 0) {
          // Insert new images
          const { error: imgError } = await supabase
            .from('images')
            .insert(newImages);
          
          if (imgError) {
            console.error('Error saving additional images:', imgError);
          }
        }
      }
    }
    
    // Return the updated machine data
    return NextResponse.json({
      message: 'Machine updated successfully',
      machine_id: data?.id,
      updated_fields: Object.keys(formattedData).filter(k => k !== "Updated On"),
      images_saved: images ? images.length : 0
    });
  } catch (error) {
    console.error('Error updating machine data:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 