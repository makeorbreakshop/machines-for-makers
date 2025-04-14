import { NextRequest, NextResponse } from 'next/server';
import { createFallbackRouteHandler } from '@/lib/supabase/route-handler';

// Add explicit runtime declaration
export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screenshotId = params.id;
    
    if (!screenshotId) {
      return new NextResponse(JSON.stringify({ error: 'Missing screenshot ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Processing screenshot deletion request for ID: ${screenshotId}`);
    
    // Initialize Supabase client with fallback handler to bypass cookie auth issues
    const supabase = createFallbackRouteHandler();
    
    // Skip session validation since we're using the service role key
    // Rely on Route/API level protection instead
    
    // Get the screenshot URL from the images table
    const { data: screenshot, error: fetchError } = await supabase
      .from('images')
      .select('url, source_type, source_id')
      .eq('id', screenshotId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching screenshot:', fetchError);
      return new NextResponse(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!screenshot) {
      return new NextResponse(JSON.stringify({ error: 'Screenshot not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found screenshot with URL: ${screenshot.url}`);
    
    // Extract path from URL
    // URLs are like https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/path/to/image.jpg
    let urlPath = null;
    try {
      urlPath = screenshot.url.split('/public/images/')[1];
    } catch (error) {
      console.error('Error parsing URL path:', error);
    }
    
    if (!urlPath) {
      console.error('Unable to extract storage path from URL:', screenshot.url);
      // Try an alternative parsing method
      try {
        const urlObj = new URL(screenshot.url);
        const pathParts = urlObj.pathname.split('/');
        // Find the index of 'images' in the path
        const imagesIndex = pathParts.findIndex(part => part === 'images');
        if (imagesIndex !== -1 && imagesIndex < pathParts.length - 1) {
          urlPath = pathParts.slice(imagesIndex + 1).join('/');
          console.log(`Found alternative path: ${urlPath}`);
        }
      } catch (error) {
        console.error('Alternative URL parsing failed:', error);
      }
    }
    
    // Delete from images table first
    console.log(`Deleting record from images table...`);
    const { error: deleteDbError } = await supabase
      .from('images')
      .delete()
      .eq('id', screenshotId);
    
    if (deleteDbError) {
      console.error('Error deleting from database:', deleteDbError);
      return new NextResponse(JSON.stringify({ error: deleteDbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Check if the images bucket exists before attempting to delete the file
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error checking storage buckets:', bucketsError);
      return new NextResponse(
        JSON.stringify({ 
          message: 'Database record deleted but could not verify storage bucket', 
          error: bucketsError.message 
        }),
        { status: 207, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const imagesBucketExists = buckets.some(bucket => bucket.name === 'images');
    
    if (!imagesBucketExists) {
      console.error('Images bucket does not exist');
      return new NextResponse(
        JSON.stringify({ message: 'Database record deleted but storage bucket does not exist' }),
        { status: 207, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Try to delete from storage
    if (urlPath) {
      console.log(`Attempting to delete file from storage path: ${urlPath}`);
      try {
        const { error: deleteStorageError } = await supabase.storage
          .from('images')
          .remove([urlPath]);
        
        if (deleteStorageError) {
          console.error('Error deleting from storage:', deleteStorageError);
          return new NextResponse(
            JSON.stringify({ 
              message: 'Database record deleted but storage file could not be removed', 
              error: deleteStorageError.message 
            }),
            { status: 207, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (storageError) {
        console.error('Exception during storage deletion:', storageError);
        return new NextResponse(
          JSON.stringify({ 
            message: 'Database record deleted but storage file deletion threw an exception', 
            error: storageError instanceof Error ? storageError.message : String(storageError) 
          }),
          { status: 207, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn('No valid storage path found, skipping storage deletion');
      return new NextResponse(
        JSON.stringify({ 
          message: 'Database record deleted but storage file path could not be determined' 
        }),
        { status: 207, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Screenshot successfully deleted: ${screenshotId}`);
    return new NextResponse(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting screenshot:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 