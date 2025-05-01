import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { calibrateCmykFactors } from '@/app/tools/ink-calculator/services/auto-calibration';

/**
 * POST handler to trigger CMYK-specific calibration factor optimization
 * This endpoint fetches all test data with CMYK channel information, runs the optimization algorithm
 * for CMYK channels only, and saves the optimized factors to the ink_calculator_calibration table
 * with calibration_type='cmyk'
 */
export async function POST(req: NextRequest) {
  console.log("[API-DEBUG] POST /api/admin/ink-calculator/optimize-cmyk-factors called");
  
  try {
    // Check admin auth
    await requireAdminAuth();
    console.log("[API-DEBUG] Admin auth verified for optimize-cmyk-factors");

    // Initialize Supabase client
    const supabase = await createServerClient();
    
    // Fetch test data entries that contain CMYK channel data
    const { data: testData, error: fetchError } = await supabase
      .from('ink_test_data')
      .select('*')
      .filter('image_analysis', 'not.is', null); // Only get entries with image analysis data
    
    if (fetchError) {
      console.error("[API-DEBUG] Supabase fetch error:", fetchError);
      throw fetchError;
    }
    
    console.log("[API-DEBUG] Fetched test data entries:", testData?.length || 0);
    
    if (!testData || testData.length === 0) {
      return NextResponse.json(
        { error: 'No test data available for optimization' },
        { status: 400 }
      );
    }
    
    // Filter for entries with CMYK data
    const cmykEntries = testData.filter(entry => 
      Object.keys(entry.channel_ml || {}).some(channel => 
        ['cyan', 'magenta', 'yellow', 'black'].includes(channel) && 
        entry.channel_ml[channel] > 0
      )
    );
    
    console.log("[API-DEBUG] CMYK test entries:", cmykEntries.length);
    
    if (cmykEntries.length < 5) {
      return NextResponse.json(
        { error: 'Not enough CMYK test data for meaningful optimization (minimum 5 entries required)' },
        { status: 400 }
      );
    }
    
    // Run the CMYK-specific optimization algorithm
    console.log("[API-DEBUG] Starting CMYK calibration optimization");
    const optimizationResult = calibrateCmykFactors(cmykEntries);
    console.log("[API-DEBUG] CMYK optimization complete");
    
    // Save the optimized factors to the database with calibration_type='cmyk'
    const { data: savedData, error: saveError } = await supabase
      .from('ink_calculator_calibration')
      .insert({
        factors: optimizationResult.factors,
        calibration_type: 'cmyk', // Specify this is a CMYK-specific calibration
        created_at: new Date().toISOString()
      })
      .select();
    
    if (saveError) {
      console.error("[API-DEBUG] Supabase save error:", saveError);
      throw saveError;
    }
    
    console.log("[API-DEBUG] Saved CMYK optimized factors with ID:", savedData?.[0]?.id);
    
    // Return the optimization results
    return NextResponse.json({
      success: true,
      id: savedData?.[0]?.id,
      calibration_type: 'cmyk',
      accuracy: {
        before: {
          averageError: optimizationResult.errors.initial.standardChannels,
          byChannel: optimizationResult.errors.initial.byChannel
        },
        after: {
          averageError: optimizationResult.errors.final.standardChannels,
          byChannel: optimizationResult.errors.final.byChannel
        },
        improvement: {
          absolute: optimizationResult.errors.improvement.standardChannels,
          percent: optimizationResult.errors.improvement.percentStandardChannels
        }
      },
      message: 'CMYK calibration factors optimized and saved successfully'
    });
  } catch (error: any) {
    console.error("[API-DEBUG] Error in optimize-cmyk-factors handler:", error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to optimize CMYK calibration factors' },
      { status: 500 }
    );
  }
} 