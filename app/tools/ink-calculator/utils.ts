import { ChannelMlValues, InkMode, InkUsageResult, CostResult, PrintQuality, ImageAnalysisResult, ChannelCoverageValues } from "./types";
import { QUALITY_MULTIPLIERS, DEFAULT_ML_PER_SET } from "./config";
import colorConvert from 'color-convert';
import { 
  AREA_SCALING_THRESHOLDS,
  AREA_SCALING_MULTIPLIERS,
  BASE_CONSUMPTION,
  CHANNEL_SCALING_FACTORS,
  QUALITY_CHANNEL_MULTIPLIERS,
  AREA_EXPONENTS,
  COVERAGE_EXPONENTS,
  INK_MODE_ADJUSTMENTS,
  calculateAreaScalingMultiplier,
  SPECIAL_LAYER_MODES
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
  
  // No need to normalize to 0-1 range, keep values in 0-100 scale
  const c = cmyk[0];
  const m = cmyk[1];
  const y = cmyk[2];
  const k = cmyk[3];
  
  // Apply alpha transparency factor - alpha is 0-1, so we need to maintain scale
  return {
    cyan: c * a,           // c is 0-100, a is 0-1
    magenta: m * a,        // m is 0-100, a is 0-1
    yellow: y * a,         // y is 0-100, a is 0-1
    black: k * a           // k is 0-100, a is 0-1
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
        
        // Normalize channel coverage and convert to 0-100 scale to match test data
        if (sampledPixels > 0) {
          channelCoverage.cyan = (channelCoverage.cyan / sampledPixels) * 100;
          channelCoverage.magenta = (channelCoverage.magenta / sampledPixels) * 100;
          channelCoverage.yellow = (channelCoverage.yellow / sampledPixels) * 100;
          channelCoverage.black = (channelCoverage.black / sampledPixels) * 100;
        }
        
        resolve({
          // Convert coverage to 0-100 scale to match test data scale
          coverage: avgCoverage * 100,
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
 * Calculate area scaling multiplier using dynamic calibration factors
 * This overrides the static function in ink-calibration.ts
 */
function calculateDynamicAreaScalingMultiplier(area: number, calibration: any): number {
  // If we have multipliers in the calibration, use them to calculate a weighted average
  if (calibration && calibration.areaScalingMultipliers) {
    const { small, medium, large, xlarge } = calibration.areaScalingMultipliers;
    
    // Use logarithmic scaling based on the calibrated multipliers
    // This creates a smooth curve between the calibrated points
    if (area < 10) {
      return small;
    } else if (area < 50) {
      const t = (area - 10) / (50 - 10);
      return small + t * (medium - small);
    } else if (area < 100) {
      const t = (area - 50) / (100 - 50);
      return medium + t * (large - medium);
    } else {
      return xlarge;
    }
  }
  
  // Fallback to the default formula if no calibration data
  return 1.2 - (0.15 * Math.log10(1 + area/100));
}

/**
 * Calculate special layer usage (white underlayer or gloss finishing)
 * Uses a completely separate area-based linear model for special layers 
 * as specified in the PRD: mL = baseValue + (area × scalingFactor × modeSpecificFactor × qualityMultiplier)
 */
function calculateSpecialLayerUsage(
  layerType: 'white' | 'gloss',
  area: number,
  inkMode: InkMode,
  quality: PrintQuality,
  calibration: any
): number {
  // Skip calculation if this layer type isn't in the ink mode
  if (!inkMode.channels.includes(layerType)) {
    return 0;
  }
  
  // Get base consumption for this layer - using higher values in 0.05-0.1 mL range
  const baseConsumption = calibration.baseConsumption[layerType] || 0.05;
  
  // Get scaling factor for this layer - significantly increased (100x higher than CMYK)
  const layerFactor = calibration.channelScalingFactors[layerType] || 0.05;
  
  // Get quality multiplier for this layer
  const qualityMultiplier = calibration.qualityChannelMultipliers[quality]?.[layerType] || 1.0;
  
  // Get ink mode adjustment with significant differences between modes (3-5x)
  const inkModeAdjustment = calibration.inkModeAdjustments[inkMode.label]?.[layerType] || 1.0;
  
  // Fixed minimum threshold based on printer mechanics
  const minimumLayerUsage = layerType === 'white' ? 0.03 : 0.04;
  
  // Implement size-based calculation branches
  
  // Small Print Handling (<50mm square = ~4 sq inches)
  if (area < 4) {
    // Steeper linear formula for small prints to prevent underestimation
    const smallAreaUsage = baseConsumption + (area * layerFactor * 2.0 * qualityMultiplier * inkModeAdjustment);
    return Math.max(smallAreaUsage, minimumLayerUsage);
  }
  
  // Large Print Handling (>250mm square = >100 sq inches)
  if (area > 100) {
    // Tapering function for large prints to prevent extreme values
    const taperFactor = 0.8 - (0.1 * Math.log10(area / 100));
    const largeAreaUsage = baseConsumption + (area * layerFactor * qualityMultiplier * inkModeAdjustment * taperFactor);
    return Math.max(largeAreaUsage, minimumLayerUsage);
  }
  
  // Medium Print Handling (50-250mm square = ~4-100 sq inches)
  // For white and gloss, determine mode-specific factor
  let modeFactor = 1.0;
  
  if (layerType === 'white') {
    // White layer is typically full coverage but can vary by mode
    const isWhiteMode = SPECIAL_LAYER_MODES.WHITE_MODES.includes(inkMode.label);
    modeFactor = isWhiteMode ? 1.0 : 0;
  } else if (layerType === 'gloss') {
    // Gloss might be selective or full coverage based on mode
    const isGlossMode = SPECIAL_LAYER_MODES.GLOSS_MODES.includes(inkMode.label);
    const isSelectiveGloss = inkMode.label.includes('SELECTIVE');
    
    if (!isGlossMode) {
      modeFactor = 0;
    } else {
      // Increased difference between selective (0.5) and full (1.0)
      modeFactor = isSelectiveGloss ? 0.5 : 1.0;
    }
  }
  
  // Standard medium-size calculation using the exact formula from the PRD
  // mL = baseValue + (area × scalingFactor × modeSpecificFactor × qualityMultiplier)
  const standardUsage = baseConsumption + (area * layerFactor * qualityMultiplier * inkModeAdjustment * modeFactor);
  
  return Math.max(standardUsage, minimumLayerUsage);
}

/**
 * Calculate ink usage based on image coverage, dimensions, and settings
 * Uses completely separate calculation models for CMYK vs special layers
 */
export async function calculateInkUsage(
  coverage: number,
  width: number,
  height: number,
  unit: DimensionUnit,
  inkMode: InkMode,
  quality: PrintQuality,
  manualValues?: ChannelMlValues,
  channelCoverage?: ChannelCoverageValues,
  calibrationFactors?: any // Add parameter for direct calibration factors
): Promise<InkUsageResult> {
  console.log("[INK-CALCULATOR] Calculating ink usage with separate models for CMYK vs. special layers");
  
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
  
  // Get calibration factors - either from parameter or from current calibration
  const calibration = calibrationFactors || getCurrentCalibration();
  
  const baseConsumption = calibration.baseConsumption;
  const channelScalingFactors = calibration.channelScalingFactors;
  const qualityChannelMultipliers = calibration.qualityChannelMultipliers;
  const areaExponents = calibration.areaExponents;
  const coverageExponents = calibration.coverageExponents;
  const inkModeAdjustments = calibration.inkModeAdjustments;
  
  console.log("[INK-CALCULATOR] Using calibration factors from:", calibration.lastUpdated || "default");
  
  // Normalize dimensions to inches for consistent calculations
  const normalizedSize = normalizeSize(width, height, unit);
  const area = normalizedSize.width * normalizedSize.height;
  
  // Get the quality multiplier
  const qualityMultiplier = QUALITY_MULTIPLIERS[quality] || 1;
  
  // Calculate area scaling multiplier using our dynamic function with calibration data
  const areaScalingMultiplier = calculateDynamicAreaScalingMultiplier(area, calibration);
  
  // Define special layers to use separate calculation model
  const specialLayers = new Set(['white', 'gloss', 'clear', 'primer']);
  
  // Initialize result object with all channels from the ink mode
  const result: ChannelMlValues = {};
  let totalMl = 0;
  
  // Process each channel in the ink mode
  inkMode.channels.forEach(channel => {
    // COMPLETELY SEPARATE CALCULATION MODELS
    
    // Special Layer Model: Primarily area-based linear model
    if (specialLayers.has(channel)) {
      const specialLayerMl = calculateSpecialLayerUsage(
        channel as 'white' | 'gloss',
        area,
        inkMode,
        quality,
        calibration
      );
      
      result[channel] = specialLayerMl;
      totalMl += specialLayerMl;
      return; // Skip CMYK calculation for special layers
    }
    
    // CMYK Channel Model: Complex model incorporating coverage analysis
    // Get the quality-specific multiplier for this channel
    const channelQualityMultiplier = 
      qualityChannelMultipliers[quality]?.[channel] || 
      qualityMultiplier;
    
    // Get channel-specific exponents
    const areaExponent = areaExponents[channel] || 0.8;
    const coverageExponent = coverageExponents[channel] || 1.0;
    
    // Get channel-specific ink mode adjustment
    const inkModeAdjustment = inkModeAdjustments[inkMode.label]?.[channel] || 1.0;
    
    // Get the coverage value for this specific channel, or use the average coverage
    // IMPORTANT: Assume coverage is already in 0-100 scale, don't convert
    let channelCoverageValue = coverage;
    if (channelCoverage && channelCoverage[channel] !== undefined) {
      channelCoverageValue = channelCoverage[channel];
    }
    
    // Get base consumption
    const baseValue = baseConsumption[channel] || 0;
    
    // Get scaling factor
    const channelFactor = channelScalingFactors[channel] || 0.0001;
    
    // Calculate the coverage component with the non-linear formula for CMYK
    // Since coverage is now 0-100, adjust the formula to work with this scale directly
    // mL = baseConsumption + (area^areaExponent × (coverage/100)^coverageExponent × channelFactor × qualityMultiplier × areaScaling × inkModeAdjustment)
    const coverageComponent = 
      Math.pow(area, areaExponent) * 
      Math.pow(channelCoverageValue / 100, coverageExponent) * // Divide by 100 to use in exponential calculation
      channelFactor * 
      channelQualityMultiplier * 
      areaScalingMultiplier *
      inkModeAdjustment;
    
    // Calculate final ink usage for this channel
    const channelMl = baseValue + coverageComponent;
    
    // Add to result and update total
    result[channel] = parseFloat(channelMl.toFixed(6));
    totalMl += channelMl;
  });
  
  return {
    channelMl: result,
    totalMl: parseFloat(totalMl.toFixed(6)),
    coverage: coverage, // No conversion needed, already in 0-100 scale
    channelCoverage: channelCoverage || {}
  };
}

/**
 * Calculate cost based on ink usage and pricing
 */
export function calculateCost(
  inkUsage: InkUsageResult,
  inkPackagePrice: number,
  totalMlPerSet: number = DEFAULT_ML_PER_SET
): CostResult {
  // Calculate cost per print
  const mlPerSet = totalMlPerSet;
  const pricePerMl = inkPackagePrice / mlPerSet;
  const costPerPrint = inkUsage.totalMl * pricePerMl;
  
  // Calculate prints per ink set (if no ink used, return 0 to avoid division by zero)
  const printsPerSet = inkUsage.totalMl > 0 ? mlPerSet / inkUsage.totalMl : 0;
  
  // Calculate cost breakdown per channel
  const channelBreakdown: ChannelMlValues = {};
  
  Object.entries(inkUsage.channelMl).forEach(([channel, ml]) => {
    channelBreakdown[channel] = ml * pricePerMl;
  });
  
  return {
    costPerPrint,
    printsPerSet,
    channelBreakdown,
    coverage: inkUsage.coverage,
    totalMl: inkUsage.totalMl
  };
} 