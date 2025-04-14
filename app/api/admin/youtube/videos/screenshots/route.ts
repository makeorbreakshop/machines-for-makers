import { NextRequest, NextResponse } from 'next/server';
import { createFallbackRouteHandler } from '@/lib/supabase/route-handler';
import { v4 as uuidv4 } from 'uuid';

// Add explicit runtime declaration
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Initialize Supabase client with fallback handler to bypass cookie auth issues
    const supabase = createFallbackRouteHandler();
    
    // Skip session validation since we're using the service role key
    // Rely on Route/API level protection instead
    
    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const draftId = formData.get('draftId') as string;
    const videoId = formData.get('videoId') as string;
    const timestamp = formData.get('timestamp') as string;
    const machineId = formData.get('machineId') as string || null;
    
    if (!file || !draftId || !videoId) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing screenshot upload: draft=${draftId}, video=${videoId}, timestamp=${timestamp}, machineId=${machineId || 'none'}`);
    
    // Check if the images bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error checking storage buckets:', bucketsError);
      return new NextResponse(JSON.stringify({ error: `Storage error: ${bucketsError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const imagesBucketExists = buckets.some(bucket => bucket.name === 'images');
    
    if (!imagesBucketExists) {
      console.log('Images bucket does not exist, creating it...');
      const { error: createBucketError } = await supabase.storage.createBucket('images', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024 // 5MB limit
      });
      
      if (createBucketError) {
        console.error('Error creating images bucket:', createBucketError);
        return new NextResponse(JSON.stringify({ error: `Failed to create storage bucket: ${createBucketError.message}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.log('Created images bucket successfully');
    }
    
    // Generate a unique ID for the screenshot
    const screenshotId = uuidv4();
    
    // Define path in storage - use the existing images bucket
    const path = `review-drafts/${draftId}/${videoId}/screenshots/${screenshotId}.jpg`;
    
    console.log(`Uploading screenshot to path: ${path}`);

    // Upload to Supabase Storage using the 'images' bucket
    const { data: storageData, error: storageError } = await supabase.storage
      .from('images')
      .upload(path, file, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    
    if (storageError) {
      console.error('Storage upload error:', storageError);
      return new NextResponse(JSON.stringify({ error: storageError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(path);
    
    console.log(`Screenshot uploaded successfully, public URL: ${publicUrlData.publicUrl}`);
    
    // Use the provided machineId if available, otherwise use a placeholder
    const finalMachineId = machineId || '00000000-0000-0000-0000-000000000000';
    
    // Save screenshot metadata to images table
    const { data: screenshotData, error: dbError } = await supabase
      .from('images')
      .insert({
        id: screenshotId,
        url: publicUrlData.publicUrl,
        alt_text: `Screenshot at ${timestamp} (Video: ${videoId})`,
        source_type: 'review_draft',
        source_id: draftId,
        timestamp: timestamp,
        created_at: new Date().toISOString(),
        machine_id: finalMachineId,
        sort_order: 0 // Default sort order
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database insert error:', dbError);
      // Even if DB insert fails, we still have the file uploaded, so return success with URL
      return new NextResponse(
        JSON.stringify({
          id: screenshotId,
          url: publicUrlData.publicUrl,
          warning: 'File uploaded but metadata could not be saved',
          dbError: dbError.message
        }),
        {
          status: 207,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log(`Screenshot metadata saved to database with ID: ${screenshotId}`);
    
    return new NextResponse(
      JSON.stringify({
        id: screenshotId,
        url: publicUrlData.publicUrl,
        timestamp: timestamp,
        machineId: finalMachineId
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET endpoint to fetch screenshots for a review draft
export async function GET(req: NextRequest) {
  try {
    // Initialize Supabase client with fallback handler to bypass cookie auth issues
    const supabase = createFallbackRouteHandler();
    
    // Skip session validation since we're using the service role key
    // Rely on Route/API level protection instead
    
    // Get query parameters
    const url = new URL(req.url);
    const draftId = url.searchParams.get('draftId');
    const videoId = url.searchParams.get('videoId');
    
    if (!draftId || !videoId) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Fetching screenshots for draft=${draftId}, video=${videoId}`);
    
    // Query database for screenshots from the images table
    const { data: screenshots, error } = await supabase
      .from('images')
      .select('*')
      .eq('source_type', 'review_draft')
      .eq('source_id', draftId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database error fetching screenshots:', error);
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found ${screenshots?.length || 0} screenshots for draft=${draftId}, video=${videoId}`);
    
    // Check if any screenshots were found
    if (!screenshots || screenshots.length === 0) {
      console.log('No screenshots found');
    }
    
    return new NextResponse(
      JSON.stringify({
        screenshots: screenshots.map(s => ({
          id: s.id,
          url: s.url,
          timestamp: s.timestamp || '',
          used: s.alt_text ? s.alt_text.includes('[USED]') : false,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching screenshots:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 