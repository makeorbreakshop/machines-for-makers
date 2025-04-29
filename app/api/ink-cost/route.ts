import { NextResponse } from "next/server";
import { 
  INK_MODES, 
  DEFAULT_INK_PACKAGE_PRICE, 
  DEFAULT_ML_PER_SET, 
  QUALITY_MULTIPLIERS 
} from "@/app/tools/ink-calculator/config";
import { 
  calculateInkUsage, 
  calculateCost, 
  normalizeSize 
} from "@/app/tools/ink-calculator/utils";
import type { 
  ChannelMlValues, 
  PrintQuality, 
  DimensionUnit 
} from "@/app/tools/ink-calculator/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body) {
      return NextResponse.json(
        { error: "Request body is missing" },
        { status: 400 }
      );
    }

    // Extract params
    const {
      // Common parameters
      inkMode = "CMYK",
      quality = "standard" as PrintQuality,
      inkPrice = DEFAULT_INK_PACKAGE_PRICE,
      mlPerSet = DEFAULT_ML_PER_SET,
      
      // Direct mL input mode
      manualValues,
      
      // Image mode
      coverage,
      width,
      height,
      unit = "in" as DimensionUnit,
    } = body;

    // Validate ink mode
    if (!INK_MODES[inkMode]) {
      return NextResponse.json(
        { error: `Invalid ink mode: ${inkMode}` },
        { status: 400 }
      );
    }

    // Validate quality
    if (!Object.keys(QUALITY_MULTIPLIERS).includes(quality)) {
      return NextResponse.json(
        { error: `Invalid quality setting: ${quality}` },
        { status: 400 }
      );
    }

    // Determine calculation mode
    const useManualValues = !!manualValues;
    
    // Validate required fields based on mode
    if (useManualValues) {
      if (!manualValues || typeof manualValues !== "object") {
        return NextResponse.json(
          { error: "manualValues must be provided as an object" },
          { status: 400 }
        );
      }
      
      // Ensure all channels in ink mode have values
      const selectedInkMode = INK_MODES[inkMode];
      const missingChannels = selectedInkMode.channels.filter(
        (channel) => typeof manualValues[channel] !== "number"
      );
      
      if (missingChannels.length > 0) {
        return NextResponse.json(
          {
            error: `Missing values for channels: ${missingChannels.join(", ")}`,
          },
          { status: 400 }
        );
      }
    } else {
      // Image mode requires coverage, width, and height
      if (!coverage || typeof coverage !== "number") {
        return NextResponse.json(
          { error: "coverage must be provided as a number" },
          { status: 400 }
        );
      }
      
      if (!width || typeof width !== "number" || width <= 0) {
        return NextResponse.json(
          { error: "width must be a positive number" },
          { status: 400 }
        );
      }
      
      if (!height || typeof height !== "number" || height <= 0) {
        return NextResponse.json(
          { error: "height must be a positive number" },
          { status: 400 }
        );
      }
    }

    // Perform calculations
    const selectedInkMode = INK_MODES[inkMode];
    
    let inkUsageResult;
    if (useManualValues) {
      // Use manual values directly
      const totalMl = Object.values(manualValues as ChannelMlValues).reduce(
        (sum, ml) => sum + (ml as number),
        0
      );
      
      inkUsageResult = {
        totalMl,
        channelMl: manualValues as ChannelMlValues,
        coverage: 0, // Not applicable in manual mode
      };
    } else {
      // Calculate based on image properties
      inkUsageResult = calculateInkUsage(
        coverage as number,
        width as number,
        height as number,
        unit as DimensionUnit,
        selectedInkMode,
        quality as PrintQuality
      );
    }
    
    const costResult = calculateCost(
      inkUsageResult,
      inkPrice as number,
      mlPerSet as number
    );
    
    // Return results
    return NextResponse.json({
      inkUsage: inkUsageResult,
      cost: costResult,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
} 