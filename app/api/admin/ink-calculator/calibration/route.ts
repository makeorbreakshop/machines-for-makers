import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/auth-utils';

export interface CalibrationFactors {
  baseConsumption: Record<string, number>;
  channelScalingFactors: Record<string, number>;
  qualityChannelMultipliers: Record<string, Record<string, number>>;
  areaScalingMultipliers: Record<string, number>;
}

/**
 * GET handler to load calibration factors
 */
export async function GET(req: NextRequest) {
  console.log("[API-DEBUG] GET /api/admin/ink-calculator/calibration called");
  
  try {
    // Check admin auth
    await requireAdminAuth();
    console.log("[API-DEBUG] Admin auth verified for GET");

    // Initialize Supabase client
    const supabase = await createServerClient();
    
    // Get the latest calibration entry
    const { data, error } = await supabase
      .from('ink_calculator_calibration')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log("[API-DEBUG] Calibration data retrieved:", data ? data.length : 0, "records");
    
    if (error) {
      console.error("[API-DEBUG] Supabase error:", error);
      throw error;
    }
    
    // If no calibration factors exist, return null
    if (!data || data.length === 0) {
      console.log("[API-DEBUG] No calibration factors found");
      return NextResponse.json({ 
        factors: null,
        message: 'No calibration factors found'
      });
    }
    
    console.log("[API-DEBUG] Returning calibration factors from:", data[0].created_at);
    
    // Return the latest calibration factors
    return NextResponse.json({
      factors: data[0].factors,
      created_at: data[0].created_at,
      message: 'Calibration factors loaded successfully'
    });
  } catch (error: any) {
    console.error("[API-DEBUG] Error in GET handler:", error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to load calibration factors' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to save calibration factors
 */
export async function POST(req: NextRequest) {
  console.log("[API-DEBUG] POST /api/admin/ink-calculator/calibration called");
  
  try {
    // Check admin auth
    await requireAdminAuth();
    console.log("[API-DEBUG] Admin auth verified for POST");
    
    // Parse request body
    const factors: CalibrationFactors = await req.json();
    console.log("[API-DEBUG] Received calibration factors:", 
      Object.keys(factors.baseConsumption).length, "base consumption values",
      Object.keys(factors.channelScalingFactors).length, "channel scaling factors");
    
    // Validate the data
    if (!factors || 
        !factors.baseConsumption || 
        !factors.channelScalingFactors || 
        !factors.qualityChannelMultipliers ||
        !factors.areaScalingMultipliers) {
      console.error("[API-DEBUG] Invalid calibration factors provided");
      return NextResponse.json(
        { error: 'Invalid calibration factors provided' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = await createServerClient();
    
    // Save the calibration factors
    const { data, error } = await supabase
      .from('ink_calculator_calibration')
      .insert({
        factors,
        created_at: new Date().toISOString(),
      })
      .select();
    
    if (error) {
      console.error("[API-DEBUG] Supabase insert error:", error);
      throw error;
    }
    
    console.log("[API-DEBUG] Calibration factors saved successfully, ID:", data?.[0]?.id);
    
    return NextResponse.json({
      success: true,
      id: data?.[0]?.id,
      message: 'Calibration factors saved successfully'
    });
  } catch (error: any) {
    console.error("[API-DEBUG] Error in POST handler:", error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to save calibration factors' },
      { status: 500 }
    );
  }
} 