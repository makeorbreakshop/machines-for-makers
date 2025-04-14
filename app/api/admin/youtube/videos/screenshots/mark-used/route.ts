import { NextRequest, NextResponse } from 'next/server';
import { createFallbackRouteHandler } from '@/lib/supabase/route-handler';

// Add explicit runtime declaration
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Initialize Supabase client with fallback handler to bypass cookie auth issues
    const supabase = createFallbackRouteHandler();
    
    // Skip session validation since we're using the service role key
    // Rely on Route/API level protection instead
    
    // Get request body
    const body = await req.json();
    const { screenshotId, isUsed = true } = body;
    
    if (!screenshotId) {
      return new NextResponse(JSON.stringify({ error: 'Missing screenshot ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Processing mark-used request for screenshot ID: ${screenshotId}, isUsed: ${isUsed}`);
    
    // First verify that the screenshot exists and get its current data
    const { data: screenshot, error: checkError } = await supabase
      .from('images')
      .select('id, url, alt_text')
      .eq('id', screenshotId)
      .single();
    
    if (checkError) {
      console.error('Error verifying screenshot exists:', checkError);
      return new NextResponse(JSON.stringify({ error: `Screenshot verification failed: ${checkError.message}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!screenshot) {
      console.error(`Screenshot ID ${screenshotId} not found`);
      return new NextResponse(JSON.stringify({ error: 'Screenshot not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found screenshot with ID: ${screenshotId}, URL: ${screenshot.url}`);
    
    // Since we don't have a metadata field, we'll update the alt_text to indicate usage status
    let updatedAltText = screenshot.alt_text || '';
    
    // Check if it's already marked as used
    const isAlreadyMarked = updatedAltText.includes('[USED]');
    
    if (isUsed && !isAlreadyMarked) {
      // Add the [USED] marker to the beginning
      updatedAltText = `[USED] ${updatedAltText}`;
    } else if (!isUsed && isAlreadyMarked) {
      // Remove the [USED] marker
      updatedAltText = updatedAltText.replace('[USED] ', '');
    }
    
    // Update the alt_text field with the usage status
    const { data, error } = await supabase
      .from('images')
      .update({ 
        alt_text: updatedAltText
      })
      .eq('id', screenshotId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating screenshot usage status:', error);
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Successfully marked screenshot ${screenshotId} as ${isUsed ? 'used' : 'unused'}`);
    
    return new NextResponse(
      JSON.stringify({
        success: true,
        screenshot: {
          id: data.id,
          used: isUsed,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error marking screenshot as used:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 