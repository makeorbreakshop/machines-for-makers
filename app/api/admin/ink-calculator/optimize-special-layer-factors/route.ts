import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { calibrateSpecialLayerFactors } from '@/app/tools/ink-calculator/services/auto-calibration';

/**
 * POST handler to trigger special layer calibration factor optimization
 * This endpoint fetches all test data with special layer information (white, gloss, etc.),
 * runs the optimization algorithm for special layers only, and saves the optimized factors
 * to the ink_calculator_calibration table with calibration_type='special_layer'
 */
export async function POST(req: NextRequest) {
  console.log("[API-DEBUG] POST /api/admin/ink-calculator/optimize-special-layer-factors called");
  
  try {
    // Check admin auth
    await requireAdminAuth();
    console.log("[API-DEBUG] Admin auth verified for optimize-special-layer-factors");

    // Initialize Supabase client
    const supabase = await createServerClient();
    
    // Fetch test data entries that contain special layer data
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
    
    // Filter for entries with special layer data
    const specialLayerEntries = testData.filter(entry => 
      Object.keys(entry.channel_ml || {}).some(channel => 
        ['white', 'gloss', 'clear', 'primer'].includes(channel) && 
        entry.channel_ml[channel] > 0
      )
    );
    
    console.log("[API-DEBUG] Special layer test entries:", specialLayerEntries.length);
    
    if (specialLayerEntries.length < 5) {
      return NextResponse.json(
        { error: 'Not enough special layer test data for meaningful optimization (minimum 5 entries required)' },
        { status: 400 }
      );
    }
    
    // Run the special layer optimization algorithm
    console.log("[API-DEBUG] Starting special layer calibration optimization");
    const optimizationResult = calibrateSpecialLayerFactors(specialLayerEntries);
    console.log("[API-DEBUG] Special layer optimization complete");
    
    // Save the optimized factors to the database with calibration_type='special_layer'
    const { data: savedData, error: saveError } = await supabase
      .from('ink_calculator_calibration')
      .insert({
        factors: optimizationResult.factors,
        calibration_type: 'special_layer', // Specify this is a special layer-specific calibration
        created_at: new Date().toISOString()
      })
      .select();
    
    if (saveError) {
      console.error("[API-DEBUG] Supabase save error:", saveError);
      throw saveError;
    }
    
    console.log("[API-DEBUG] Saved special layer optimized factors with ID:", savedData?.[0]?.id);
    
    // Return the optimization results
    return NextResponse.json({
      success: true,
      id: savedData?.[0]?.id,
      calibration_type: 'special_layer',
      accuracy: {
        before: {
          averageError: optimizationResult.errors.initial.specialLayers,
          byChannel: Object.fromEntries(
            Object.entries(optimizationResult.errors.initial.byChannel)
              .filter(([key]) => ['white', 'gloss', 'clear', 'primer'].includes(key))
          )
        },
        after: {
          averageError: optimizationResult.errors.final.specialLayers,
          byChannel: optimizationResult.errors.final.specialLayersByChannel
        },
        improvement: {
          absolute: optimizationResult.errors.improvement.specialLayers,
          percent: optimizationResult.errors.improvement.percentSpecialLayers
        }
      },
      message: 'Special layer calibration factors optimized and saved successfully'
    });
  } catch (error: any) {
    console.error("[API-DEBUG] Error in optimize-special-layer-factors handler:", error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to optimize special layer calibration factors' },
      { status: 500 }
    );
  }
} 