import { NextRequest, NextResponse } from 'next/server';
import { calculateInkUsage, calculateCost } from '@/app/tools/ink-calculator/utils';
import { INK_MODES, DEFAULT_ML_PER_SET } from '@/app/tools/ink-calculator/config';
import { PrintQuality } from '@/app/tools/ink-calculator/types';

// Unit type for dimensions
type DimensionUnit = 'in' | 'mm';

export async function POST(req: NextRequest) {
  console.log("[API-DEBUG] POST /api/ink-cost called");
  
  try {
    // Parse JSON body
    const body = await req.json();
    
    // Extract parameters
    const {
      inkMode = 'CMYK',
      quality = 'standard',
      width = 5,
      height = 5,
      unit = 'in',
      coverage,
      channelCoverage,
      manualValues,
      inkPrice = 300,
      mlPerSet = DEFAULT_ML_PER_SET
    } = body;
    
    // Look up the ink mode object
    const inkModeObject = INK_MODES[inkMode];
    if (!inkModeObject) {
      return NextResponse.json(
        { error: `Invalid ink mode: ${inkMode}` },
        { status: 400 }
      );
    }
    
    // Calculate ink usage
    const inkUsage = await calculateInkUsage(
      coverage !== undefined ? coverage : 0.5, // Default coverage 50%
      width,
      height,
      unit,
      inkModeObject,
      quality,
      manualValues,
      channelCoverage
    );
    
    // Calculate cost 
    const cost = calculateCost(inkUsage, inkPrice, mlPerSet);
    
    // Return results
    return NextResponse.json({
      inkUsage,
      cost
    });
  } catch (error: any) {
    console.error("[API-DEBUG] Error processing ink cost calculation:", error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate ink cost' },
      { status: 500 }
    );
  }
} 