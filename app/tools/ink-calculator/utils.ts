import { ChannelMlValues, InkMode, InkUsageResult, CostResult, PrintQuality, ImageAnalysisResult, ChannelCoverageValues } from "./types";
import { QUALITY_MULTIPLIERS, DEFAULT_ML_PER_SET } from "./config";
import colorConvert from 'color-convert';
import { 
  AREA_SCALING_THRESHOLDS,
  AREA_SCALING_MULTIPLIERS,
  BASE_CONSUMPTION,
  CHANNEL_SCALING_FACTORS,
  QUALITY_CHANNEL_MULTIPLIERS
} from "./ink-calibration";
import { 
  refreshCalibrationFromDatabase, 
  getCurrentCalibration 
} from "./services/calibration-loader";

// Define DimensionUnit type locally if it's not exported from types.ts
type DimensionUnit = 'in' | 'mm';

/**
 * Convert dimensions from mm to inches if needed
 */
export function normalizeSize(
  width: number,
  height: number,
  unit: DimensionUnit
): { width: number; height: number } {
  if (unit === "mm") {
    return {
      width: width / 25.4,
      height: height / 25.4,
    };
  }
  return { width, height };
}

/**
 * Convert RGB to CMYK and calculate channel coverage
 */
function calculateChannelCoverage(r: number, g: number, b: number, a: number): ChannelCoverageValues {
  // Convert RGB to CMYK
  // The resulting array contains [C, M, Y, K] values from 0-100
  const cmyk = colorConvert.rgb.cmyk([r, g, b]);
  
  // Normalize to 0-1 range for coverage calculations
  const c = cmyk[0] / 100;
  const m = cmyk[1] / 100;
  const y = cmyk[2] / 100;
  const k = cmyk[3] / 100;
  
  // Apply alpha transparency factor
  return {
    cyan: c * a,
    magenta: m * a,
    yellow: y * a,
    black: k * a
  };
}

/**
 * Process an uploaded image to estimate ink coverage
 */
export async function processImage(
  file: File
): Promise<ImageAnalysisResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Extract original image dimensions
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        // Create a canvas to sample the image
        const canvas = document.createElement("canvas");
        // Scale down for performance if image is large
        const scaleFactor = Math.min(1, 1000 / Math.max(img.width, img.height));
        const width = Math.floor(img.width * scaleFactor);
        const height = Math.floor(img.height * scaleFactor);
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        const { data, width: imgWidth, height: imgHeight } = imageData;
        
        // Initialize coverage tracking
        let totalCoverage = 0;
        let totalPixels = imgWidth * imgHeight;
        const channelCoverage: ChannelCoverageValues = {
          cyan: 0,
          magenta: 0,
          yellow: 0,
          black: 0
        };
        
        // Sample rate - higher value means fewer samples for better performance
        // For a 1000x1000 image, sampling every 10th pixel gives 10,000 samples
        const sampleRate = 10;
        let sampledPixels = 0;
        
        // Sample pixels to determine coverage
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3] / 255; // Alpha is 0-255, normalize to 0-1
          
          // Skip transparent pixels
          if (a < 0.1) {
            totalPixels--;
            continue;
          }
          
          // Calculate coverage for each channel
          const pixelCoverage = calculateChannelCoverage(r, g, b, a);
          
          // Update channel coverage totals
          channelCoverage.cyan += pixelCoverage.cyan;
          channelCoverage.magenta += pixelCoverage.magenta;
          channelCoverage.yellow += pixelCoverage.yellow;
          channelCoverage.black += pixelCoverage.black;
          
          // Calculate overall coverage (using the standard formula for brightness)
          // Using the formula: (0.299*R + 0.587*G + 0.114*B)
          const pixelBrightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const pixelOverallCoverage = (1 - pixelBrightness) * a;
          totalCoverage += pixelOverallCoverage;
          
          sampledPixels++;
        }
        
        // Normalize coverage values
        const avgCoverage = totalPixels > 0 ? totalCoverage / sampledPixels : 0;
        
        // Normalize channel coverage
        if (sampledPixels > 0) {
          channelCoverage.cyan /= sampledPixels;
          channelCoverage.magenta /= sampledPixels;
          channelCoverage.yellow /= sampledPixels;
          channelCoverage.black /= sampledPixels;
        }
        
        resolve({
          coverage: avgCoverage,
          channelCoverage,
          imageUrl: URL.createObjectURL(file),
          dimensions: {
            width: originalWidth,
            height: originalHeight
          }
        });
      };
      
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      
      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate ink usage based on image coverage, dimensions, and settings
 * Uses the enhanced formula: mL = base_value + (coverage% × area × channel_factor × quality_factor)
 */
export async function calculateInkUsage(
  coverage: number,
  width: number,
  height: number,
  unit: DimensionUnit,
  inkMode: InkMode,
  quality: PrintQuality,
  manualValues?: ChannelMlValues,
  channelCoverage?: ChannelCoverageValues
): Promise<InkUsageResult> {
  console.log("[INK-CALCULATOR] Calculating ink usage with dynamic calibration factors");
  
  // If manual values are provided, return them directly
  if (manualValues) {
    const totalMl = Object.values(manualValues).reduce((sum, ml) => sum + ml, 0);
    
    return {
      channelMl: { ...manualValues },
      channelCoverage: {},
      totalMl,
      coverage
    };
  }
  
  // Load the latest calibration factors from the database/storage
  // This includes caching for performance
  let calibrationFactors;
  try {
    // Try to get the latest factors - first checks cache, then API, then local storage 
    calibrationFactors = getCurrentCalibration();
    
    // Every 5 minutes or so, refresh the calibration factors in the background
    // to ensure we eventually get the latest without affecting performance
    if (typeof window !== 'undefined' && Math.random() < 0.1) { // ~10% chance to refresh
      refreshCalibrationFromDatabase().catch(err => {
        console.warn("[INK-CALCULATOR] Background refresh of calibration failed:", err);
      });
    }
  } catch (error) {
    console.warn("[INK-CALCULATOR] Error loading calibration factors, using defaults:", error);
    // Continue with default values from ink-calibration.ts (these are already imported)
  }
  
  // Extract the calibration factors
  const baseConsumption = calibrationFactors?.baseConsumption || BASE_CONSUMPTION;
  const channelScalingFactors = calibrationFactors?.channelScalingFactors || CHANNEL_SCALING_FACTORS;
  const qualityChannelMultipliers = calibrationFactors?.qualityChannelMultipliers || QUALITY_CHANNEL_MULTIPLIERS;
  const areaScalingMultipliers = calibrationFactors?.areaScalingMultipliers || AREA_SCALING_MULTIPLIERS;
  
  // Normalize dimensions to inches for consistent calculations
  const normalizedSize = normalizeSize(width, height, unit);
  const area = normalizedSize.width * normalizedSize.height;
  
  // Get the quality multiplier
  const qualityMultiplier = QUALITY_MULTIPLIERS[quality] || 1;
  
  // Get area scaling multiplier based on print dimensions
  const areaScalingMultiplier = getAreaScalingMultiplier(area, areaScalingMultipliers);
  
  // Initialize result object with all channels from the ink mode
  const result: ChannelMlValues = {};
  let totalMl = 0;
  
  // For each channel in the ink mode, calculate mL usage
  inkMode.channels.forEach(channel => {
    // Get the base consumption for this channel (minimum ink used regardless of coverage)
    const baseConsumptionValue = baseConsumption[channel] || 0.01;
    
    // Get the channel-specific scaling factor
    const channelFactor = channelScalingFactors[channel] || 0.0001;
    
    // Get quality-specific channel multiplier
    const qualityChannelMultiplier = qualityChannelMultipliers[quality]?.[channel] || qualityMultiplier;
    
    // Get the coverage percentage for this specific channel
    // If channel-specific coverage is available, use it; otherwise, use the general coverage
    const channelCoveragePercentage = channelCoverage ? 
      (channelCoverage[channel] || 0) : 
      coverage * 100; // Convert 0-1 to 0-100 for percentage
    
    // Calculate mL for this channel using the enhanced formula:
    // mL = base_value + (coverage% × area × channel_factor × quality_factor × area_scaling)
    let channelMl = baseConsumptionValue + 
      (channelCoveragePercentage / 100 * area * channelFactor * qualityChannelMultiplier * areaScalingMultiplier);
    
    // Round to 4 decimal places for precision
    channelMl = Math.round(channelMl * 10000) / 10000;
    
    // Store the result
    result[channel] = channelMl;
    totalMl += channelMl;
  });
  
  return {
    channelMl: result,
    channelCoverage: channelCoverage || {},
    totalMl,
    coverage
  };
}

/**
 * Get the area scaling multiplier based on print dimensions
 */
function getAreaScalingMultiplier(area: number, customScalingMultipliers?: Record<string, number>): number {
  // Use custom scaling multipliers if provided, otherwise use defaults
  const scalingMultipliers = customScalingMultipliers || AREA_SCALING_MULTIPLIERS;
  
  if (area < AREA_SCALING_THRESHOLDS.small) {
    return scalingMultipliers.small;
  } else if (area < AREA_SCALING_THRESHOLDS.medium) {
    return scalingMultipliers.medium;
  } else if (area < AREA_SCALING_THRESHOLDS.large) {
    return scalingMultipliers.large;
  } else {
    return scalingMultipliers.xlarge;
  }
}

/**
 * Calculate cost based on ink usage and pricing
 */
export function calculateCost(
  inkUsage: InkUsageResult,
  inkPackagePrice: number,
  totalMlPerSet: number = DEFAULT_ML_PER_SET
): CostResult {
  console.log('DEBUG: calculateCost called with:', {
    inkUsage,
    inkPackagePrice,
    totalMlPerSet
  });
  
  // Calculate cost per ml of ink
  const costPerMl = inkPackagePrice / totalMlPerSet;
  console.log('DEBUG: Cost per mL:', costPerMl);
  
  // Calculate cost for each channel
  const channelBreakdown: ChannelMlValues = {};
  Object.entries(inkUsage.channelMl).forEach(([channel, ml]) => {
    // Store the raw calculated value without rounding
    channelBreakdown[channel] = ml * costPerMl;
    console.log(`DEBUG: Channel ${channel} cost calculation:`, {
      ml,
      costPerMl,
      channelCost: channelBreakdown[channel]
    });
  });
  
  // Calculate total cost per print - use raw values without rounding
  const costPerPrint = Object.values(channelBreakdown).reduce(
    (sum, cost) => sum + cost,
    0
  );
  
  // Calculate how many prints can be made with one set
  const printsPerSet = Math.floor(totalMlPerSet / inkUsage.totalMl);
  
  const result = {
    costPerPrint: costPerPrint, // No rounding or formatting
    printsPerSet,
    channelBreakdown,
    totalMl: inkUsage.totalMl,
    coverage: inkUsage.coverage
  };
  
  console.log('DEBUG: Final cost calculation result:', result);
  return result;
} 