import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { calibrateCmykFactors, calibrateSpecialLayerFactors } from '@/app/tools/ink-calculator/services/auto-calibration';

/**
 * POST handler to trigger calibration factor optimization (legacy approach)
 * This is kept for backward compatibility but now runs both optimizations separately
 * and then saves them with their respective calibration_type values
 */
export async function POST(req: NextRequest) {
  console.log("[API-DEBUG] POST /api/admin/ink-calculator/optimize-factors called (legacy endpoint)");
  
  try {
    // Check admin auth
    await requireAdminAuth();
    console.log("[API-DEBUG] Admin auth verified for legacy optimize-factors");

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
    
    // Filter for entries with CMYK data
    const cmykEntries = testData.filter(entry => 
      Object.keys(entry.channel_ml || {}).some(channel => 
        ['cyan', 'magenta', 'yellow', 'black'].includes(channel) && 
        entry.channel_ml[channel] > 0
      )
    );
    
    // Filter for entries with special layer data
    const specialLayerEntries = testData.filter(entry => 
      Object.keys(entry.channel_ml || {}).some(channel => 
        ['white', 'gloss', 'clear', 'primer'].includes(channel) && 
        entry.channel_ml[channel] > 0
      )
    );
    
    console.log("[API-DEBUG] CMYK test entries:", cmykEntries.length);
    console.log("[API-DEBUG] Special layer test entries:", specialLayerEntries.length);
    
    // Run both optimizations
    let cmykResult = null;
    let specialLayerResult = null;
    let cmykSaveError = null;
    let specialLayerSaveError = null;
    
    // Optimize CMYK if we have enough data
    if (cmykEntries.length >= 5) {
      console.log("[API-DEBUG] Starting CMYK calibration optimization");
      cmykResult = calibrateCmykFactors(cmykEntries);
      console.log("[API-DEBUG] CMYK optimization complete");
      
      // Save the CMYK optimized factors
      const { error } = await supabase
        .from('ink_calculator_calibration')
        .insert({
          factors: cmykResult.factors,
          calibration_type: 'cmyk',
          created_at: new Date().toISOString()
        });
        
      cmykSaveError = error;
      if (error) {
        console.error("[API-DEBUG] CMYK optimization save error:", error);
      } else {
        console.log("[API-DEBUG] CMYK optimized factors saved successfully");
      }
    }
    
    // Optimize special layers if we have enough data
    if (specialLayerEntries.length >= 5) {
      console.log("[API-DEBUG] Starting special layer calibration optimization");
      specialLayerResult = calibrateSpecialLayerFactors(specialLayerEntries);
      console.log("[API-DEBUG] Special layer optimization complete");
      
      // Save the special layer optimized factors
      const { error } = await supabase
        .from('ink_calculator_calibration')
        .insert({
          factors: specialLayerResult.factors,
          calibration_type: 'special_layer',
          created_at: new Date().toISOString()
        });
        
      specialLayerSaveError = error;
      if (error) {
        console.error("[API-DEBUG] Special layer optimization save error:", error);
      } else {
        console.log("[API-DEBUG] Special layer optimized factors saved successfully");
      }
    }
    
    // Check if any optimizations were successful
    if (!cmykResult && !specialLayerResult) {
      return NextResponse.json(
        { error: 'Not enough data to perform any optimizations' },
        { status: 400 }
      );
    }
    
    // Check if any save operations failed
    if (cmykSaveError || specialLayerSaveError) {
      console.error("[API-DEBUG] One or more save operations failed");
    }
    
    // Return combined results
    return NextResponse.json({
      success: true,
      cmyk: cmykResult ? {
        success: !cmykSaveError,
        accuracy: {
          before: {
            averageError: cmykResult.errors.initial.standardChannels
          },
          after: {
            averageError: cmykResult.errors.final.standardChannels
          }
        }
      } : null,
      specialLayers: specialLayerResult ? {
        success: !specialLayerSaveError,
        accuracy: {
          before: {
            averageError: specialLayerResult.errors.initial.specialLayers
          },
          after: {
            averageError: specialLayerResult.errors.final.specialLayers
          }
        }
      } : null,
      accuracy: {
        before: {
          averageError: cmykResult ? cmykResult.errors.initial.overall : 
                        (specialLayerResult ? specialLayerResult.errors.initial.overall : 0)
        },
        after: {
          averageError: cmykResult ? cmykResult.errors.final.overall : 
                        (specialLayerResult ? specialLayerResult.errors.final.overall : 0)
        }
      },
      message: 'Calibration factors optimized with decoupled approach'
    });
  } catch (error: any) {
    console.error("[API-DEBUG] Error in legacy optimize-factors handler:", error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to optimize calibration factors' },
      { status: 500 }
    );
  }
} 