import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { calibrateFactors } from '@/app/tools/ink-calculator/services/auto-calibration';

/**
 * POST handler to trigger calibration factor optimization
 * This endpoint fetches all test data, runs the optimization algorithm,
 * and saves the optimized factors to the ink_calculator_calibration table
 */
export async function POST(req: NextRequest) {
  console.log("[API-DEBUG] POST /api/admin/ink-calculator/optimize-factors called");
  
  try {
    // Check admin auth
    await requireAdminAuth();
    console.log("[API-DEBUG] Admin auth verified for optimize-factors");

    // Initialize Supabase client
    const supabase = await createServerClient();
    
    // Fetch all test data entries
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
    
    // Run the optimization algorithm
    console.log("[API-DEBUG] Starting calibration optimization");
    const optimizationResult = calibrateFactors(testData);
    console.log("[API-DEBUG] Optimization complete");
    
    // Save the optimized factors to the database
    const { data: savedData, error: saveError } = await supabase
      .from('ink_calculator_calibration')
      .insert({
        factors: optimizationResult.factors,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (saveError) {
      console.error("[API-DEBUG] Supabase save error:", saveError);
      throw saveError;
    }
    
    console.log("[API-DEBUG] Saved optimized factors with ID:", savedData?.[0]?.id);
    
    // Return the optimization results
    return NextResponse.json({
      success: true,
      id: savedData?.[0]?.id,
      accuracy: optimizationResult.accuracy,
      message: 'Calibration factors optimized and saved successfully'
    });
  } catch (error: any) {
    console.error("[API-DEBUG] Error in optimize-factors handler:", error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to optimize calibration factors' },
      { status: 500 }
    );
  }
} 