/**
 * Auto-Calibration Service
 * 
 * This service analyzes ink test data and automatically generates optimized
 * calibration factors for the UV printer ink calculator.
 */

import { ChannelMlValues, PrintQuality } from "../types";
import { calculateInkUsage, normalizeSize } from "../utils";
import { INK_MODES } from "../config";
import { 
  BASE_CONSUMPTION,
  CHANNEL_SCALING_FACTORS,
  QUALITY_CHANNEL_MULTIPLIERS,
  AREA_SCALING_THRESHOLDS,
  AREA_SCALING_MULTIPLIERS,
  AREA_EXPONENTS,
  COVERAGE_EXPONENTS,
  INK_MODE_ADJUSTMENTS,
  calculateAreaScalingMultiplier,
  SPECIAL_LAYER_MODES,
  LAYER_INTERCEPTS,
  LAYER_SLOPES
} from "../ink-calibration";
import { calculateErrorPercentage } from "./validation";

interface TestDataEntry {
  id: string;
  ink_mode: string;
  quality: string;
  dimensions: {
    width: number;
    height: number;
    unit: string;
  };
  channel_ml: Record<string, number>;
  image_analysis: {
    totalCoverage: number;
    channelCoverage: Record<string, number>;
  };
}

interface CalibrationFactors {
  baseConsumption: Record<string, number>;
  channelScalingFactors: Record<string, number>;
  qualityChannelMultipliers: Record<PrintQuality, ChannelMlValues>;
  areaScalingMultipliers: Record<string, number>;
  areaExponents: Record<string, number>;
  coverageExponents: Record<string, number>;
  inkModeAdjustments: Record<string, Record<string, number>>;
  layerIntercepts: Record<string, number>;
  layerSlopes: Record<string, number>;
}

interface CalibrationResult {
  factors: CalibrationFactors;
  errors: {
    initial: {
      overall: number;
      standardChannels: number;
      specialLayers: number;
      byChannel: Record<string, number>;
    };
    final: {
      overall: number;
      standardChannels: number;
      specialLayers: number;
      byChannel: Record<string, number>;
      singleColorChannels: Record<string, number>;
      specialLayersByChannel: Record<string, number>;
    };
    improvement: {
      overall: number;
      standardChannels: number;
      specialLayers: number;
      percentOverall: number;
      percentStandardChannels: number;
      percentSpecialLayers: number;
    };
  };
}

// Volume thresholds for differentiating optimization strategies
const VOLUME_CATEGORIES = {
  verySmall: 0.02,  // Below 0.02 mL
  small: 0.1,       // 0.02-0.1 mL
  medium: 0.5,      // 0.1-0.5 mL
  large: 1.0        // Above 0.5 mL
};

/**
 * Identifies if a channel is a special layer (white underlayer or gloss finish)
 */
function isSpecialLayer(channel: string): boolean {
  return channel === 'white' || channel === 'gloss' || channel === 'clear' || channel === 'primer';
}

/**
 * Identifies single-color test entries based on channel coverage percentages
 * A single-color test has high coverage (>70%) for one channel and low (<30%) for others
 */
function isSingleColorTest(entry: TestDataEntry, channel: string): boolean {
  // Special layers use different calculation logic, don't classify as single-color tests
  if (isSpecialLayer(channel)) {
    return false;
  }
  
  if (!entry.image_analysis?.channelCoverage) return false;
  
  const coverages = entry.image_analysis.channelCoverage;
  const thisCoverage = coverages[channel] || 0;
  
  // Check if this channel has high coverage (>70%)
  if (thisCoverage < 70) return false;
  
  // Check if other channels have low coverage (<30%)
  const otherChannelsLow = Object.entries(coverages)
    .filter(([key]) => key !== channel && !isSpecialLayer(key))
    .every(([_, coverage]) => coverage < 30);
    
  return otherChannelsLow;
}

/**
 * Groups test entries by type (single-color vs mixed) and by channel
 * Also separates special layer tests (white and gloss)
 */
function categorizeTestEntries(testEntries: TestDataEntry[]): {
  singleColorByChannel: Record<string, TestDataEntry[]>;
  mixedColor: TestDataEntry[];
  specialLayerTests: Record<string, TestDataEntry[]>;
} {
  const result = {
    singleColorByChannel: {} as Record<string, TestDataEntry[]>,
    mixedColor: [] as TestDataEntry[],
    specialLayerTests: {} as Record<string, TestDataEntry[]>
  };
  
  // Initialize empty arrays for each channel
  const standardChannels = ['cyan', 'magenta', 'yellow', 'black'];
  const specialLayers = ['white', 'gloss', 'clear', 'primer'];
  
  standardChannels.forEach(channel => {
    result.singleColorByChannel[channel] = [];
  });
  
  specialLayers.forEach(layer => {
    result.specialLayerTests[layer] = [];
  });
  
  // Categorize test entries
  testEntries.forEach(entry => {
    // Check if this is a special layer test
    let hasSpecialLayer = false;
    specialLayers.forEach(layer => {
      if (entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0) {
        result.specialLayerTests[layer].push(entry);
        hasSpecialLayer = true;
      }
    });
    
    // Check if this is a single-color test for any standard channel
    let isSingleColor = false;
    
    for (const channel of standardChannels) {
      if (isSingleColorTest(entry, channel)) {
        result.singleColorByChannel[channel].push(entry);
        isSingleColor = true;
        break;
      }
    }
    
    // If not a single-color test, it's a mixed-color test
    if (!isSingleColor) {
      result.mixedColor.push(entry);
    }
  });
  
  return result;
}

/**
 * Find the optimal value for a calibration factor using binary search
 * with volume-specific optimization strategies and prioritization for single-color tests
 */
function optimizeFactor(
  testEntries: TestDataEntry[],
  channel: string,
  currentValue: number,
  evaluateError: (factor: number) => number,
  min = currentValue * 0.1,
  max = currentValue * 10,
  iterations = 10,
  options: { 
    prioritizeSingleColor?: boolean;
    isSpecialLayer?: boolean;
  } = {}
): number {
  // Filter entries for this channel with non-zero values
  const relevantEntries = testEntries.filter(entry => 
    entry.channel_ml[channel] !== undefined && 
    entry.channel_ml[channel] > 0
  );
  
  // If we don't have enough test entries for this channel, return current value
  if (relevantEntries.length < 3) {
    console.log(`[CALIBRATION-DEBUG] Not enough test data for ${channel}, skipping optimization`);
    return currentValue;
  }

  // Categorize test entries
  const { singleColorByChannel, mixedColor, specialLayerTests } = categorizeTestEntries(relevantEntries);
  const singleColorTests = singleColorByChannel[channel] || [];
  const specialLayerEntries = specialLayerTests[channel] || [];
  
  // Log test data categorization
  if (options.isSpecialLayer) {
    console.log(`[CALIBRATION-DEBUG] Test data for special layer ${channel}:`, {
      specialLayerTests: specialLayerEntries.length,
      mixedColor: mixedColor.length
    });
  } else {
    console.log(`[CALIBRATION-DEBUG] Test data for ${channel}:`, {
      singleColor: singleColorTests.length,
      mixedColor: mixedColor.length
    });
  }
  
  // Group test entries by volume category for targeted optimization
  const entriesByVolume = {
    verySmall: relevantEntries.filter(e => e.channel_ml[channel] < VOLUME_CATEGORIES.verySmall),
    small: relevantEntries.filter(e => 
      e.channel_ml[channel] >= VOLUME_CATEGORIES.verySmall && 
      e.channel_ml[channel] < VOLUME_CATEGORIES.small
    ),
    medium: relevantEntries.filter(e => 
      e.channel_ml[channel] >= VOLUME_CATEGORIES.small && 
      e.channel_ml[channel] < VOLUME_CATEGORIES.medium
    ),
    large: relevantEntries.filter(e => e.channel_ml[channel] >= VOLUME_CATEGORIES.medium)
  };
  
  console.log(`[CALIBRATION-DEBUG] Test entries by volume for ${channel}:`, {
    verySmall: entriesByVolume.verySmall.length,
    small: entriesByVolume.small.length,
    medium: entriesByVolume.medium.length,
    large: entriesByVolume.large.length
  });
  
  let bestFactor = currentValue;
  let bestError = evaluateError(currentValue);
  console.log(`[CALIBRATION-DEBUG] Starting optimization for ${channel} with MAE: ${bestError.toFixed(4)} mL`);
  
  // Determine which volume categories have sufficient test data
  const hasLargeVolumes = entriesByVolume.large.length >= 2;
  const hasMediumVolumes = entriesByVolume.medium.length >= 2;
  const hasSmallVolumes = entriesByVolume.small.length >= 2 || entriesByVolume.verySmall.length >= 2;
  const hasSingleColorTests = singleColorTests.length >= 1;
  const hasSpecialLayerTests = specialLayerEntries.length >= 1;
  
  // Prioritize optimization strategy based on test data availability
  let optimizationPriority = 'balanced';
  
  if (options.isSpecialLayer && hasSpecialLayerTests) {
    optimizationPriority = 'specialLayer';
    console.log(`[CALIBRATION-DEBUG] Prioritizing special layer tests for ${channel}`);
  } else if (options.prioritizeSingleColor && hasSingleColorTests) {
    optimizationPriority = 'singleColor';
    console.log(`[CALIBRATION-DEBUG] Prioritizing single-color tests for ${channel}`);
  } else if (hasLargeVolumes && !hasSmallVolumes) {
    optimizationPriority = 'large';
  } else if (!hasLargeVolumes && hasSmallVolumes) {
    optimizationPriority = 'small';
  } else if (hasLargeVolumes && hasMediumVolumes && hasSmallVolumes) {
    optimizationPriority = 'balanced';
  }
  
  console.log(`[CALIBRATION-DEBUG] Optimization priority for ${channel}: ${optimizationPriority}`);
  
  // Apply different optimization strategies based on priority
  // Try several values within the range and find the one with lowest error
  for (let i = 0; i < iterations; i++) {
    const step = (max - min) / (iterations - 1);
    for (let j = 0; j < iterations; j++) {
      const testFactor = min + step * j;
      let error = evaluateError(testFactor);
      
      // Apply different optimization strategies based on priority
      if (optimizationPriority === 'specialLayer') {
        // For special layers like white and gloss, focus on area-based calculation
        // weight large area prints higher since they're more representative
        const largeError = hasLargeVolumes ?
          evaluateVolumeSpecificError(entriesByVolume.large, channel, testFactor) : error;
          
        // Special layers focus more on large area prints (80% weight)
        error = error * 0.2 + largeError * 0.8;
      } else if (optimizationPriority === 'singleColor') {
        // Give much higher weight to single-color test errors
        const singleColorError = evaluateVolumeSpecificError(singleColorTests, channel, testFactor);
        
        // 80% weight to single-color tests, 20% to all tests to prevent overfitting to single-color case
        error = error * 0.2 + singleColorError * 0.8;
      } else if (optimizationPriority === 'large') {
        // Give more weight to errors in large volume entries
        const largeError = evaluateVolumeSpecificError(entriesByVolume.large, channel, testFactor);
        error = error * 0.3 + largeError * 0.7; // 70% weight to large volumes
      } else if (optimizationPriority === 'small') {
        // Give more weight to errors in small volume entries
        const smallError = evaluateVolumeSpecificError(
          [...entriesByVolume.small, ...entriesByVolume.verySmall], 
          channel, 
          testFactor
        );
        error = error * 0.3 + smallError * 0.7; // 70% weight to small volumes
      } else {
        // Balanced approach with graduated weighting
        const largeError = hasLargeVolumes ? 
          evaluateVolumeSpecificError(entriesByVolume.large, channel, testFactor) : 0;
        const mediumError = hasMediumVolumes ? 
          evaluateVolumeSpecificError(entriesByVolume.medium, channel, testFactor) : 0;
        const smallError = hasSmallVolumes ? 
          evaluateVolumeSpecificError(
            [...entriesByVolume.small, ...entriesByVolume.verySmall], 
            channel, 
            testFactor
          ) : 0;
        
        // Incorporate single-color test data if available
        const singleColorError = hasSingleColorTests ?
          evaluateVolumeSpecificError(singleColorTests, channel, testFactor) : 0;
        
        // Incorporate special layer test data if available and relevant
        const specialLayerError = options.isSpecialLayer && hasSpecialLayerTests ?
          evaluateVolumeSpecificError(specialLayerEntries, channel, testFactor) : 0;
        
        // Weight distribution depends on what data we have
        if (options.isSpecialLayer && hasSpecialLayerTests) {
          // For special layers, prioritize large areas
          if (hasLargeVolumes) {
            error = specialLayerError * 0.5 + largeError * 0.3 + (mediumError + smallError) * 0.1;
          } else {
            error = specialLayerError * 0.7 + error * 0.3;
          }
        } else if (hasSingleColorTests) {
          // Give higher weight to single-color tests even in balanced mode
          if (hasLargeVolumes && hasMediumVolumes && hasSmallVolumes) {
            error = singleColorError * 0.4 + largeError * 0.2 + mediumError * 0.2 + smallError * 0.2;
          } else if (hasLargeVolumes && hasMediumVolumes) {
            error = singleColorError * 0.5 + largeError * 0.3 + mediumError * 0.2;
          } else if (hasMediumVolumes && hasSmallVolumes) {
            error = singleColorError * 0.5 + mediumError * 0.3 + smallError * 0.2;
          } else if (hasLargeVolumes && hasSmallVolumes) {
            error = singleColorError * 0.5 + largeError * 0.3 + smallError * 0.2;
          } else {
            error = singleColorError * 0.7 + error * 0.3;
          }
        } else {
          // Traditional balanced approach without single-color tests
          if (hasLargeVolumes && hasMediumVolumes && hasSmallVolumes) {
            error = largeError * 0.4 + mediumError * 0.4 + smallError * 0.2;
          } else if (hasLargeVolumes && hasMediumVolumes) {
            error = largeError * 0.6 + mediumError * 0.4;
          } else if (hasMediumVolumes && hasSmallVolumes) {
            error = mediumError * 0.6 + smallError * 0.4;
          } else if (hasLargeVolumes && hasSmallVolumes) {
            error = largeError * 0.7 + smallError * 0.3;
          }
        }
      }
      
      if (error < bestError) {
        bestError = error;
        bestFactor = testFactor;
        console.log(`[CALIBRATION-DEBUG] Found better factor for ${channel}: ${bestFactor.toPrecision(5)} with MAE: ${bestError.toFixed(4)} mL`);
      }
    }
    
    // Narrow the search space around the best factor found
    const range = step * 2;
    min = Math.max(min, bestFactor - range);
    max = Math.min(max, bestFactor + range);
  }
  
  // Round to 5 significant digits for readability
  const result = Number(bestFactor.toPrecision(5));
  console.log(`[CALIBRATION-DEBUG] Final optimized factor for ${channel}: ${result} with MAE: ${bestError.toFixed(4)} mL`);
  return result;
}

/**
 * Evaluate error for a specific volume category of test entries
 */
function evaluateVolumeSpecificError(
  entries: TestDataEntry[],
  channel: string,
  factor: number
): number {
  if (entries.length === 0) return 0;
  
  // Calculate predicted values for each entry and measure error
  let totalError = 0;
  
  entries.forEach(entry => {
    const inkMode = INK_MODES[entry.ink_mode];
    if (!inkMode) return;
    
    // Get the actual values from the test data
    const actual = entry.channel_ml[channel];
    if (!actual || actual <= 0) return;
    
    // Calculate the predicted value using the non-linear model
    const predicted = estimateChannelUsage(entry, channel, { channelScalingFactor: factor });
    
    // Calculate error using absolute difference (MAE)
    const absoluteDifference = Math.abs(predicted - actual);
    totalError += absoluteDifference;
  });
  
  return totalError / entries.length;
}

/**
 * Estimate channel ink usage with a specific scaling factor
 */
function estimateChannelUsage(
  entry: TestDataEntry,
  channel: string,
  options: { channelScalingFactor?: number } = {}
): number {
  const inkMode = INK_MODES[entry.ink_mode];
  if (!inkMode) return 0;
  
  // Normalize dimensions to get area in square inches
  const normalizedDimensions = normalizeSize(
    entry.dimensions.width, 
    entry.dimensions.height, 
    entry.dimensions.unit as 'in' | 'mm'
  );
  const area = normalizedDimensions.width * normalizedDimensions.height;
  
  // Get base consumption
  const baseValue = BASE_CONSUMPTION[channel] || 0;
  
  // Get scaling factors
  const channelFactor = options.channelScalingFactor !== undefined 
    ? options.channelScalingFactor 
    : CHANNEL_SCALING_FACTORS[channel] || 0.0001;
    
  const quality = entry.quality as PrintQuality;
  const qualityFactor = QUALITY_CHANNEL_MULTIPLIERS[quality][channel] || 1.0;
  
  // Special handling for white and gloss layers
  if (isSpecialLayer(channel)) {
    // Get ink mode adjustment if available
    const inkModeAdjustment = INK_MODE_ADJUSTMENTS[entry.ink_mode]?.[channel] || 1.0;
    
    // Get layer-specific area exponent (white and gloss use exponents closer to 1.0)
    const areaExponent = AREA_EXPONENTS[channel] || 0.95;
    
    // For very small prints, use a more direct linear approach
    if (area < 2) {
      // Simple linear calculation for very small prints to avoid underestimation
      return baseValue + (area * channelFactor * 100 * qualityFactor * inkModeAdjustment);
    }
    
    // For white and gloss, determine mode factor
    let modeFactor = 1.0;
    
    if (channel === 'white') {
      // White layer is typically full coverage but can vary by mode
      const isWhiteMode = SPECIAL_LAYER_MODES.WHITE_MODES.includes(entry.ink_mode);
      modeFactor = isWhiteMode ? 1.0 : 0;
    } else if (channel === 'gloss') {
      // Gloss might be selective or full coverage based on mode
      const isGlossMode = SPECIAL_LAYER_MODES.GLOSS_MODES.includes(entry.ink_mode);
      const isSelectiveGloss = entry.ink_mode.includes('SELECTIVE');
      
      if (!isGlossMode) {
        modeFactor = 0;
      } else {
        modeFactor = isSelectiveGloss ? 0.7 : 1.0;
      }
    }
    
    // For special layers, use a simplified formula without complex area scaling
    // to better match their more linear relationship with area
    return baseValue + 
      (Math.pow(area, areaExponent) * 
       channelFactor * 
       qualityFactor * 
       inkModeAdjustment *
       modeFactor);
  }
  
  // Standard handling for color channels
  
  // Get channel coverage
  let channelCoverage = entry.image_analysis.totalCoverage / 100;
  if (entry.image_analysis.channelCoverage && 
      entry.image_analysis.channelCoverage[channel] !== undefined) {
    channelCoverage = entry.image_analysis.channelCoverage[channel] / 100;
  }
  
  // Get area scaling using continuous function
  const areaScalingMultiplier = calculateAreaScalingMultiplier(area);
  
  // Get channel-specific exponents
  const areaExponent = AREA_EXPONENTS[channel] || 0.8; // Default if not specified
  const coverageExponent = COVERAGE_EXPONENTS[channel] || 1.0; // Default if not specified
  
  // Get ink mode adjustments
  const inkModeAdjustment = INK_MODE_ADJUSTMENTS[entry.ink_mode]?.[channel] || 1.0;
  
  // Calculate ink usage using non-linear formula:
  // mL = base_consumption + (area^area_exponent * coverage^coverage_exponent * channel_factor * quality_factor * area_scaling * ink_mode_adjustment)
  const coverageComponent = 
    Math.pow(area, areaExponent) * 
    Math.pow(channelCoverage * 100, coverageExponent) * 
    channelFactor * 
    qualityFactor * 
    areaScalingMultiplier *
    inkModeAdjustment;
    
  return baseValue + coverageComponent;
}

/**
 * Calculate the average error across all test entries for a given channel
 */
function calculateChannelError(
  testEntries: TestDataEntry[],
  channel: string,
  factors: CalibrationFactors
): number {
  // Filter entries that have this channel
  const relevantEntries = testEntries.filter(entry => 
    entry.channel_ml[channel] !== undefined && 
    entry.channel_ml[channel] > 0
  );
  
  if (relevantEntries.length === 0) {
    return 0;
  }
  
  let totalError = 0;
  let validSampleCount = 0;
  
  relevantEntries.forEach(entry => {
    const inkMode = INK_MODES[entry.ink_mode];
    if (!inkMode) return;
    
    // Calculate predicted values with current factors using the same non-linear model
    const predictedMl = estimateChannelUsage(entry, channel, {
      channelScalingFactor: factors.channelScalingFactors[channel]
    });
    
    // Calculate error using MAE
    const actualMl = entry.channel_ml[channel];
    const absoluteDifference = Math.abs(predictedMl - actualMl);
    
    // For very small ink volumes, we might still want to reduce their weight
    const weight = actualMl < VOLUME_CATEGORIES.verySmall ? 0.5 : 1.0;
    totalError += absoluteDifference * weight;
    validSampleCount += weight;
  });
  
  return validSampleCount > 0 ? totalError / validSampleCount : 0;
}

/**
 * Evaluate overall error with a specific base consumption factor for a channel
 */
function evaluateBaseConsumptionError(
  testEntries: TestDataEntry[],
  channel: string,
  factors: CalibrationFactors,
  baseValue: number
): number {
  const testFactors = {
    ...factors,
    baseConsumption: {
      ...factors.baseConsumption,
      [channel]: baseValue
    }
  };
  
  return calculateChannelError(testEntries, channel, testFactors);
}

/**
 * Evaluate overall error with a specific channel scaling factor
 */
function evaluateChannelScalingError(
  testEntries: TestDataEntry[],
  channel: string,
  factors: CalibrationFactors,
  scalingFactor: number
): number {
  const testFactors = {
    ...factors,
    channelScalingFactors: {
      ...factors.channelScalingFactors,
      [channel]: scalingFactor
    }
  };
  
  return calculateChannelError(testEntries, channel, testFactors);
}

/**
 * Evaluate overall error with a specific quality multiplier for a channel
 */
function evaluateQualityMultiplierError(
  testEntries: TestDataEntry[],
  channel: string,
  quality: PrintQuality,
  factors: CalibrationFactors,
  multiplier: number
): number {
  const qualityMultipliers = { ...factors.qualityChannelMultipliers };
  qualityMultipliers[quality] = {
    ...qualityMultipliers[quality],
    [channel]: multiplier
  };
  
  const testFactors = {
    ...factors,
    qualityChannelMultipliers: qualityMultipliers
  };
  
  // Only consider test entries with this quality setting
  const qualityEntries = testEntries.filter(entry => entry.quality === quality);
  
  return calculateChannelError(qualityEntries, channel, testFactors);
}

/**
 * Evaluate overall error with a specific area exponent for a channel
 */
function evaluateAreaExponentError(
  testEntries: TestDataEntry[],
  channel: string,
  factors: CalibrationFactors,
  areaExponent: number
): number {
  const testFactors = {
    ...factors,
    areaExponents: {
      ...factors.areaExponents,
      [channel]: areaExponent
    }
  };
  
  return calculateChannelError(testEntries, channel, testFactors);
}

/**
 * Evaluate overall error with a specific coverage exponent for a channel
 */
function evaluateCoverageExponentError(
  testEntries: TestDataEntry[],
  channel: string,
  factors: CalibrationFactors,
  coverageExponent: number
): number {
  const testFactors = {
    ...factors,
    coverageExponents: {
      ...factors.coverageExponents,
      [channel]: coverageExponent
    }
  };
  
  return calculateChannelError(testEntries, channel, testFactors);
}

/**
 * Evaluate overall error with a specific ink mode adjustment for a channel
 */
function evaluateInkModeAdjustmentError(
  testEntries: TestDataEntry[],
  channel: string,
  inkMode: string,
  factors: CalibrationFactors,
  adjustment: number
): number {
  const testFactors = {
    ...factors,
    inkModeAdjustments: {
      ...factors.inkModeAdjustments,
      [inkMode]: {
        ...factors.inkModeAdjustments[inkMode],
        [channel]: adjustment
      }
    }
  };
  
  // Only consider test entries for this ink mode
  const inkModeEntries = testEntries.filter(entry => entry.ink_mode === inkMode);
  
  return calculateChannelError(inkModeEntries, channel, testFactors);
}

/**
 * Evaluate layer slope error for a specific channel
 */
function evaluateLayerSlopeError(
  testEntries: TestDataEntry[],
  layer: string,
  factors: CalibrationFactors,
  slope: number
): number {
  const tempFactors = { ...factors, layerSlopes: { ...factors.layerSlopes, [layer]: slope } };
  return calculateChannelError(testEntries, layer, tempFactors);
}

/**
 * Evaluate layer intercept error for a specific channel
 */
function evaluateLayerInterceptError(
  testEntries: TestDataEntry[],
  layer: string,
  factors: CalibrationFactors,
  intercept: number
): number {
  const tempFactors = { ...factors, layerIntercepts: { ...factors.layerIntercepts, [layer]: intercept } };
  return calculateChannelError(testEntries, layer, tempFactors);
}

/**
 * Calibrate all factors based on test data using the four-phase process from the PRD:
 * 1. Data Preparation Phase
 * 2. CMYK Channel Optimization Phase
 * 3. Special Layer Optimization Phase
 * 4. Validation Phase
 */
export function calibrateFactors(testEntries: TestDataEntry[]): CalibrationResult {
  console.log("[CALIBRATION-DEBUG] Starting calibration with", testEntries.length, "test entries");
  
  // Start with current factors as baseline
  const initialFactors: CalibrationFactors = {
    baseConsumption: { ...BASE_CONSUMPTION },
    channelScalingFactors: { ...CHANNEL_SCALING_FACTORS },
    qualityChannelMultipliers: JSON.parse(JSON.stringify(QUALITY_CHANNEL_MULTIPLIERS)),
    areaScalingMultipliers: { ...AREA_SCALING_MULTIPLIERS },
    areaExponents: { ...AREA_EXPONENTS },
    coverageExponents: { ...COVERAGE_EXPONENTS },
    inkModeAdjustments: JSON.parse(JSON.stringify(INK_MODE_ADJUSTMENTS)),
    layerIntercepts: { ...LAYER_INTERCEPTS },
    layerSlopes: { ...LAYER_SLOPES }
  };

  console.log("[CALIBRATION-DEBUG] Initial factors:", initialFactors);
  
  // ====================================================================
  // PHASE 1: DATA PREPARATION PHASE
  // ====================================================================
  console.log("[CALIBRATION-DEBUG] PHASE 1: DATA PREPARATION PHASE");
  
  // Define standard CMYK channels and special layers
  const standardChannels = ['cyan', 'magenta', 'yellow', 'black'];
  const specialLayers = new Set(['white', 'gloss', 'clear', 'primer']);
  
  // Track all unique channels in test data
  const allChannels = new Set<string>();
  
  // Group test entries by channel presence
  const channelDatasets: Record<string, TestDataEntry[]> = {};
  
  // Initialize empty arrays for each channel
  [...standardChannels, ...Array.from(specialLayers)].forEach(channel => {
    channelDatasets[channel] = [];
  });
  
  // Detect all channels present in test data
  testEntries.forEach(entry => {
    Object.keys(entry.channel_ml).forEach(channel => {
      if (entry.channel_ml[channel] > 0) {
        allChannels.add(channel);
      }
    });
  });
  
  // Create per-channel datasets
  // Use ALL test data containing a channel when optimizing that channel
  console.log("[CALIBRATION-DEBUG] Creating channel-specific datasets");
  testEntries.forEach(entry => {
    Object.keys(entry.channel_ml).forEach(channel => {
      if (entry.channel_ml[channel] > 0) {
        channelDatasets[channel].push(entry);
      }
    });
  });
  
  // Count entries per channel
  Object.entries(channelDatasets).forEach(([channel, entries]) => {
    console.log(`[CALIBRATION-DEBUG] Test entries for ${channel}: ${entries.length}`);
  });
  
  // Calculate initial error rates
  const initialChannelErrors: Record<string, number> = {};
  let initialTotalError = 0;
  let initialStandardChannelsError = 0;
  let initialSpecialLayersError = 0;
  let channelCount = 0;
  let standardChannelCount = 0;
  let specialLayerCount = 0;
  
  // Calculate initial errors to have a baseline
  testEntries.forEach(entry => {
    Object.entries(entry.channel_ml).forEach(([channel, actualMl]) => {
      const estimatedMl = estimateChannelUsage(entry, channel);
      const error = Math.abs(estimatedMl - actualMl);
      
      initialChannelErrors[channel] = (initialChannelErrors[channel] || 0) + error;
      initialTotalError += error;
      channelCount++;
      
      if (specialLayers.has(channel)) {
        initialSpecialLayersError += error;
        specialLayerCount++;
      } else {
        initialStandardChannelsError += error;
        standardChannelCount++;
      }
    });
  });
  
  // Average error per channel
  Object.keys(initialChannelErrors).forEach(channel => {
    const channelTestCount = channelDatasets[channel]?.length || 0;
    
    if (channelTestCount > 0) {
      initialChannelErrors[channel] /= channelTestCount;
    }
  });
  
  // Average overall error
  if (channelCount > 0) initialTotalError /= channelCount;
  if (standardChannelCount > 0) initialStandardChannelsError /= standardChannelCount;
  if (specialLayerCount > 0) initialSpecialLayersError /= specialLayerCount;
  
  console.log("[CALIBRATION-DEBUG] Initial average error rates:", {
    overall: initialTotalError.toFixed(4) + " mL",
    standardChannels: initialStandardChannelsError.toFixed(4) + " mL",
    specialLayers: initialSpecialLayersError.toFixed(4) + " mL",
    byChannel: Object.fromEntries(Object.entries(initialChannelErrors).map(([k, v]) => [k, v.toFixed(4) + " mL"]))
  });
  
  // Create a copy of the initial factors to optimize
  const optimizedFactors = structuredClone(initialFactors);
  
  // ====================================================================
  // PHASE 2: CMYK CHANNEL OPTIMIZATION PHASE
  // ====================================================================
  console.log("[CALIBRATION-DEBUG] PHASE 2: CMYK CHANNEL OPTIMIZATION PHASE");
  
  // Process each standard channel (CMYK)
  for (const channel of standardChannels) {
    if (!allChannels.has(channel)) {
      console.log(`[CALIBRATION-DEBUG] Skipping ${channel} optimization - no data available`);
      continue;
    }
    
    const channelEntries = channelDatasets[channel];
    if (channelEntries.length < 3) {
      console.log(`[CALIBRATION-DEBUG] Skipping ${channel} optimization - insufficient data (${channelEntries.length} < 3)`);
      continue;
    }
    
    console.log(`[CALIBRATION-DEBUG] Optimizing standard channel: ${channel} with ${channelEntries.length} test entries`);
    
    // 2.1 Optimize base consumption values
    console.log(`[CALIBRATION-DEBUG] Phase 2.1: Optimizing base consumption for ${channel}`);
    const currentBase = optimizedFactors.baseConsumption[channel] || 0;
    
    if (currentBase > 0) {
      const optimizedBase = optimizeFactor(
        channelEntries,
        channel,
        currentBase,
        (factor) => evaluateBaseConsumptionError(channelEntries, channel, optimizedFactors, factor),
        0.0001, // min
        0.02,   // max
        8,      // iterations
        { isSpecialLayer: false }
      );
      
      optimizedFactors.baseConsumption[channel] = optimizedBase;
    }
    
    // 2.2 Optimize channel scaling factors
    console.log(`[CALIBRATION-DEBUG] Phase 2.2: Optimizing scaling factor for ${channel}`);
    const currentFactor = optimizedFactors.channelScalingFactors[channel] || 0.0001;
    
    const optimizedFactor = optimizeFactor(
      channelEntries,
      channel,
      currentFactor,
      (factor) => evaluateChannelScalingError(channelEntries, channel, optimizedFactors, factor),
      0.00001, // min
      0.001,   // max
      8,       // iterations
      { isSpecialLayer: false }
    );
    
    optimizedFactors.channelScalingFactors[channel] = optimizedFactor;
    
    // 2.3 Optimize area exponents
    console.log(`[CALIBRATION-DEBUG] Phase 2.3: Optimizing area exponent for ${channel}`);
    const currentExponent = optimizedFactors.areaExponents[channel] || 0.8;
    
    const optimizedExponent = optimizeFactor(
      channelEntries,
      channel,
      currentExponent,
      (factor) => evaluateAreaExponentError(channelEntries, channel, optimizedFactors, factor),
      0.4,  // min
      0.95, // max - standard channels often have diminishing returns with area
      8,    // iterations
      { isSpecialLayer: false }
    );
    
    optimizedFactors.areaExponents[channel] = optimizedExponent;
    
    // 2.4 Optimize coverage exponents
    console.log(`[CALIBRATION-DEBUG] Phase 2.4: Optimizing coverage exponent for ${channel}`);
    const currentCoverageExponent = optimizedFactors.coverageExponents[channel] || 1.0;
    
    const optimizedCoverageExponent = optimizeFactor(
      channelEntries,
      channel,
      currentCoverageExponent,
      (factor) => evaluateCoverageExponentError(channelEntries, channel, optimizedFactors, factor),
      0.5,  // min
      1.5,  // max
      8,    // iterations
      { isSpecialLayer: false }
    );
    
    optimizedFactors.coverageExponents[channel] = optimizedCoverageExponent;
  }
  
  // 2.5 Optimize quality multipliers for standard channels
  console.log("[CALIBRATION-DEBUG] Phase 2.5: Optimizing quality multipliers for standard channels");
  
  // Get all quality settings in the test data
  const qualities = new Set<PrintQuality>();
  testEntries.forEach(entry => {
    if (entry.quality) {
      qualities.add(entry.quality as PrintQuality);
    }
  });
  
  console.log("[CALIBRATION-DEBUG] Detected quality settings:", Array.from(qualities));
  
  // Process each quality setting
  for (const quality of Array.from(qualities)) {
    // Get all entries for this quality setting with standard channels
    const cmykQualityEntries = testEntries.filter(entry => 
      entry.quality === quality && 
      standardChannels.some(channel => entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0)
    );
    
    if (cmykQualityEntries.length < 3) {
      console.log(`[CALIBRATION-DEBUG] Skipping quality ${quality} optimization for standard channels - insufficient data (${cmykQualityEntries.length} < 3)`);
      continue;
    }
    
    console.log(`[CALIBRATION-DEBUG] Optimizing quality multipliers for ${quality} with ${cmykQualityEntries.length} test entries`);
    
    // Ensure quality multipliers exist for this quality level
    if (!optimizedFactors.qualityChannelMultipliers[quality]) {
      optimizedFactors.qualityChannelMultipliers[quality] = {} as ChannelMlValues;
    }
    
    // Optimize each standard channel for this quality
    for (const channel of standardChannels) {
      if (!allChannels.has(channel)) continue;
      
      // Skip channels that don't have test data for this quality
      const channelQualityEntries = cmykQualityEntries.filter(entry => 
        entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0
      );
      
      if (channelQualityEntries.length < 2) {
        console.log(`[CALIBRATION-DEBUG] Skipping ${channel} for quality ${quality} - insufficient data (${channelQualityEntries.length} < 2)`);
        continue;
      }
      
      const currentMultiplier = optimizedFactors.qualityChannelMultipliers[quality][channel] || 1.0;
      
      const optimizedMultiplier = optimizeFactor(
        channelQualityEntries,
        channel,
        currentMultiplier,
        (factor) => evaluateQualityMultiplierError(channelQualityEntries, channel, quality, optimizedFactors, factor),
        0.5,  // min
        2.0,  // max
        6,    // iterations
        { isSpecialLayer: false }
      );
      
      optimizedFactors.qualityChannelMultipliers[quality][channel] = optimizedMultiplier;
    }
  }
  
  // 2.6 Optimize ink mode adjustments for standard channels
  console.log("[CALIBRATION-DEBUG] Phase 2.6: Optimizing ink mode adjustments for standard channels");
  
  // Get all ink modes in the test data that use standard channels
  const standardInkModes = new Set<string>();
  testEntries.forEach(entry => {
    if (standardChannels.some(channel => entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0)) {
      standardInkModes.add(entry.ink_mode);
    }
  });
  
  console.log("[CALIBRATION-DEBUG] Ink modes with standard channels:", Array.from(standardInkModes));
  
  // Process each ink mode
  for (const inkMode of Array.from(standardInkModes)) {
    // Get entries for this ink mode with standard channels
    const modeEntries = testEntries.filter(entry => 
      entry.ink_mode === inkMode && 
      standardChannels.some(channel => entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0)
    );
    
    if (modeEntries.length < 3) {
      console.log(`[CALIBRATION-DEBUG] Skipping ink mode ${inkMode} optimization for standard channels - insufficient data (${modeEntries.length} < 3)`);
      continue;
    }
    
    console.log(`[CALIBRATION-DEBUG] Optimizing ink mode adjustments for ${inkMode} with ${modeEntries.length} test entries`);
    
    // Ensure ink mode adjustments exist for this mode
    if (!optimizedFactors.inkModeAdjustments[inkMode]) {
      optimizedFactors.inkModeAdjustments[inkMode] = {};
    }
    
    // Optimize each standard channel for this ink mode
    for (const channel of standardChannels) {
      if (!allChannels.has(channel)) continue;
      
      // Skip channels that don't have test data for this ink mode
      const channelModeEntries = modeEntries.filter(entry => 
        entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0
      );
      
      if (channelModeEntries.length < 2) {
        console.log(`[CALIBRATION-DEBUG] Skipping ${channel} for ink mode ${inkMode} - insufficient data (${channelModeEntries.length} < 2)`);
        continue;
      }
      
      const currentAdjustment = optimizedFactors.inkModeAdjustments[inkMode][channel] || 1.0;
      
      const optimizedAdjustment = optimizeFactor(
        channelModeEntries,
        channel,
        currentAdjustment,
        (factor) => evaluateInkModeAdjustmentError(channelModeEntries, channel, inkMode, optimizedFactors, factor),
        0.5,  // min
        1.5,  // max - narrower range for standard channels
        6,    // iterations
        { isSpecialLayer: false }
      );
      
      optimizedFactors.inkModeAdjustments[inkMode][channel] = optimizedAdjustment;
    }
  }
  
  // ====================================================================
  // PHASE 3: SPECIAL LAYER OPTIMIZATION PHASE
  // ====================================================================
  console.log("[CALIBRATION-DEBUG] PHASE 3: SPECIAL LAYER OPTIMIZATION PHASE");
  
  // Process each special layer (white, gloss, etc.)
  for (const layer of Array.from(specialLayers)) {
    if (!allChannels.has(layer)) {
      console.log(`[CALIBRATION-DEBUG] Skipping ${layer} optimization - no data available`);
      continue;
    }
    
    const layerEntries = channelDatasets[layer];
    if (layerEntries.length < 3) {
      console.log(`[CALIBRATION-DEBUG] Skipping ${layer} optimization - insufficient data (${layerEntries.length} < 3)`);
      continue;
    }
    
    console.log(`[CALIBRATION-DEBUG] Optimizing special layer: ${layer} with ${layerEntries.length} test entries`);
    
    // 3.1 Optimize base consumption values (higher values for special layers)
    console.log(`[CALIBRATION-DEBUG] Phase 3.1: Optimizing base consumption for ${layer}`);
    const currentBase = optimizedFactors.baseConsumption[layer] || 0.05;
    
    if (currentBase > 0) {
      const optimizedBase = optimizeFactor(
        layerEntries,
        layer,
        currentBase,
        (factor) => evaluateBaseConsumptionError(layerEntries, layer, optimizedFactors, factor),
        0.01,  // min - higher values for special layers
        0.2,   // max - higher values for special layers
        8,     // iterations
        { isSpecialLayer: true }
      );
      
      optimizedFactors.baseConsumption[layer] = optimizedBase;
    }
    
    // 3.2 Optimize channel scaling factors (much larger values for special layers)
    console.log(`[CALIBRATION-DEBUG] Phase 3.2: Optimizing scaling factor for ${layer}`);
    const currentFactor = optimizedFactors.channelScalingFactors[layer] || 0.05;
    
    const optimizedFactor = optimizeFactor(
      layerEntries,
      layer,
      currentFactor,
      (factor) => evaluateChannelScalingError(layerEntries, layer, optimizedFactors, factor),
      0.01,   // min - much higher for special layers (100x CMYK)
      0.5,    // max - much higher for special layers
      8,      // iterations
      { isSpecialLayer: true }
    );
    
    optimizedFactors.channelScalingFactors[layer] = optimizedFactor;
    
    // Skip coverage-related optimizations for special layers
    // Special layers don't depend on image content (coverage)
    
    // 3.3 Optimize area exponents (special layers closer to linear)
    console.log(`[CALIBRATION-DEBUG] Phase 3.3: Optimizing area exponent for ${layer}`);
    
    // For special layers, area exponents should be very close to 1.0 for more linear relationship
    const currentExponent = optimizedFactors.areaExponents[layer] || 0.95;
    
    const optimizedExponent = optimizeFactor(
      layerEntries,
      layer,
      currentExponent,
      (factor) => evaluateAreaExponentError(layerEntries, layer, optimizedFactors, factor),
      0.9,    // min - special layers use higher values (more linear)
      0.99,   // max - close to linear (1.0) but not exactly
      6,      // iterations
      { isSpecialLayer: true }
    );
    
    optimizedFactors.areaExponents[layer] = optimizedExponent;
  }
  
  // 3.4 Optimize quality multipliers for special layers
  console.log("[CALIBRATION-DEBUG] Phase 3.4: Optimizing quality multipliers for special layers");
  
  // Process each quality setting
  for (const quality of Array.from(qualities)) {
    // Get all entries for this quality setting with special layers
    const specialLayerQualityEntries = testEntries.filter(entry => 
      entry.quality === quality && 
      Array.from(specialLayers).some(layer => entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0)
    );
    
    if (specialLayerQualityEntries.length < 3) {
      console.log(`[CALIBRATION-DEBUG] Skipping quality ${quality} optimization for special layers - insufficient data (${specialLayerQualityEntries.length} < 3)`);
      continue;
    }
    
    console.log(`[CALIBRATION-DEBUG] Optimizing quality multipliers for ${quality} with ${specialLayerQualityEntries.length} test entries`);
    
    // Ensure quality multipliers exist for this quality level
    if (!optimizedFactors.qualityChannelMultipliers[quality]) {
      optimizedFactors.qualityChannelMultipliers[quality] = {} as ChannelMlValues;
    }
    
    // Optimize each special layer for this quality
    for (const layer of Array.from(specialLayers)) {
      if (!allChannels.has(layer)) continue;
      
      // Skip layers that don't have test data for this quality
      const layerQualityEntries = specialLayerQualityEntries.filter(entry => 
        entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0
      );
      
      if (layerQualityEntries.length < 2) {
        console.log(`[CALIBRATION-DEBUG] Skipping ${layer} for quality ${quality} - insufficient data (${layerQualityEntries.length} < 2)`);
        continue;
      }
      
      const currentMultiplier = optimizedFactors.qualityChannelMultipliers[quality][layer] || 1.0;
      
      const optimizedMultiplier = optimizeFactor(
        layerQualityEntries,
        layer,
        currentMultiplier,
        (factor) => evaluateQualityMultiplierError(layerQualityEntries, layer, quality, optimizedFactors, factor),
        0.5,  // min
        2.0,  // max
        6,    // iterations
        { isSpecialLayer: true }
      );
      
      optimizedFactors.qualityChannelMultipliers[quality][layer] = optimizedMultiplier;
    }
  }
  
  // 3.5 Optimize ink mode adjustments for special layers
  console.log("[CALIBRATION-DEBUG] Phase 3.5: Optimizing ink mode adjustments for special layers");
  
  // Get all ink modes in the test data that use special layers
  const specialLayerModes = new Set<string>();
  testEntries.forEach(entry => {
    if (Array.from(specialLayers).some(layer => entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0)) {
      specialLayerModes.add(entry.ink_mode);
    }
  });
  
  console.log("[CALIBRATION-DEBUG] Ink modes with special layers:", Array.from(specialLayerModes));
  
  // Process each ink mode
  for (const inkMode of Array.from(specialLayerModes)) {
    // Get entries for this ink mode with special layers
    const modeEntries = testEntries.filter(entry => 
      entry.ink_mode === inkMode && 
      Array.from(specialLayers).some(layer => entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0)
    );
    
    if (modeEntries.length < 3) {
      console.log(`[CALIBRATION-DEBUG] Skipping ink mode ${inkMode} optimization for special layers - insufficient data (${modeEntries.length} < 3)`);
      continue;
    }
    
    console.log(`[CALIBRATION-DEBUG] Optimizing ink mode adjustments for ${inkMode} with ${modeEntries.length} test entries`);
    
    // Ensure ink mode adjustments exist for this mode
    if (!optimizedFactors.inkModeAdjustments[inkMode]) {
      optimizedFactors.inkModeAdjustments[inkMode] = {};
    }
    
    // Optimize each special layer for this ink mode
    for (const layer of Array.from(specialLayers)) {
      if (!allChannels.has(layer)) continue;
      
      // Skip layers that don't have test data for this ink mode
      const layerModeEntries = modeEntries.filter(entry => 
        entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0
      );
      
      if (layerModeEntries.length < 2) {
        console.log(`[CALIBRATION-DEBUG] Skipping ${layer} for ink mode ${inkMode} - insufficient data (${layerModeEntries.length} < 2)`);
        continue;
      }
      
      const currentAdjustment = optimizedFactors.inkModeAdjustments[inkMode][layer] || 1.0;
      
      const optimizedAdjustment = optimizeFactor(
        layerModeEntries,
        layer,
        currentAdjustment,
        (factor) => evaluateInkModeAdjustmentError(layerModeEntries, layer, inkMode, optimizedFactors, factor),
        1.0,  // min - allowing for larger range
        5.0,  // max - much higher range for special layers (3-5× difference between modes)
        8,    // iterations
        { isSpecialLayer: true }
      );
      
      optimizedFactors.inkModeAdjustments[inkMode][layer] = optimizedAdjustment;
    }
  }
  
  // 3.6 Implement area-based optimization using three size ranges
  console.log("[CALIBRATION-DEBUG] PHASE 3.6: Size-based calculation verification for special layers");
  
  // Small, Medium, and Large print entries
  const smallPrintEntries = testEntries.filter(entry => {
    const normalizedDimensions = normalizeSize(
      entry.dimensions.width, 
      entry.dimensions.height, 
      entry.dimensions.unit as 'in' | 'mm'
    );
    const area = normalizedDimensions.width * normalizedDimensions.height;
    return area < 4; // Small prints (<50mm square = ~4 sq inches)
  });
  
  const mediumPrintEntries = testEntries.filter(entry => {
    const normalizedDimensions = normalizeSize(
      entry.dimensions.width, 
      entry.dimensions.height, 
      entry.dimensions.unit as 'in' | 'mm'
    );
    const area = normalizedDimensions.width * normalizedDimensions.height;
    return area >= 4 && area <= 100; // Medium prints (50-250mm square = ~4-100 sq inches)
  });
  
  const largePrintEntries = testEntries.filter(entry => {
    const normalizedDimensions = normalizeSize(
      entry.dimensions.width, 
      entry.dimensions.height, 
      entry.dimensions.unit as 'in' | 'mm'
    );
    const area = normalizedDimensions.width * normalizedDimensions.height;
    return area > 100; // Large prints (>250mm square = >100 sq inches)
  });
  
  console.log("[CALIBRATION-DEBUG] Print size distribution:", {
    small: smallPrintEntries.length,
    medium: mediumPrintEntries.length,
    large: largePrintEntries.length
  });
  
  // ====================================================================
  // PHASE 4: VALIDATION PHASE
  // ====================================================================
  console.log("[CALIBRATION-DEBUG] PHASE 4: VALIDATION PHASE");
  
  // Calculate final error rates with separate metrics for standard vs. special layers
  const finalChannelErrorsSpecial: Record<string, number> = {};
  const finalSingleColorErrorsSpecial: Record<string, number> = {};
  const finalSpecialLayersErrorsSpecial: Record<string, number> = {};
  let finalTotalErrorSpecial = 0;
  let finalStandardChannelsErrorSpecial = 0;
  let finalSpecialLayersErrorSpecial = 0;
  let finalSingleColorTotalErrorSpecial = 0;
  
  // Size-stratified error metrics
  const sizeErrors = {
    small: { total: 0, count: 0, standardChannels: 0, standardCount: 0, specialLayers: 0, specialCount: 0 },
    medium: { total: 0, count: 0, standardChannels: 0, standardCount: 0, specialLayers: 0, specialCount: 0 },
    large: { total: 0, count: 0, standardChannels: 0, standardCount: 0, specialLayers: 0, specialCount: 0 },
  };
  
  // Reset counters for final error calculation
  channelCount = 0;
  standardChannelCount = 0;
  specialLayerCount = 0;
  let singleColorChannelCount = 0;
  
  // Calculate errors across all entries
  testEntries.forEach(entry => {
    // Get the area to categorize print size
    const normalizedDimensions = normalizeSize(
      entry.dimensions.width, 
      entry.dimensions.height, 
      entry.dimensions.unit as 'in' | 'mm'
    );
    const area = normalizedDimensions.width * normalizedDimensions.height;
    
    // Determine size category
    let sizeCategory: 'small' | 'medium' | 'large';
    if (area < 4) {
      sizeCategory = 'small';
    } else if (area <= 100) {
      sizeCategory = 'medium';
    } else {
      sizeCategory = 'large';
    }
    
    // Process each channel with actual data
    Object.entries(entry.channel_ml).forEach(([channel, actualMl]) => {
      if (actualMl <= 0) return; // Skip zero or undefined values
      
      // Calculate predicted value using optimized factors
      const estimatedMl = estimateChannelUsage(entry, channel, {
        channelScalingFactor: optimizedFactors.channelScalingFactors[channel]
      });
      
      // Calculate absolute error (MAE)
      const error = Math.abs(estimatedMl - actualMl);
      
      // Update overall error metrics
      finalChannelErrorsSpecial[channel] = (finalChannelErrorsSpecial[channel] || 0) + error;
      finalTotalErrorSpecial += error;
      channelCount++;
      
      // Update size-stratified error metrics
      sizeErrors[sizeCategory].total += error;
      sizeErrors[sizeCategory].count++;
      
      // Split metrics by channel type (standard vs. special)
      if (specialLayers.has(channel)) {
        finalSpecialLayersErrorsSpecial[channel] = (finalSpecialLayersErrorsSpecial[channel] || 0) + error;
        finalSpecialLayersErrorSpecial += error;
        specialLayerCount++;
        
        // Size-stratified special layer errors
        sizeErrors[sizeCategory].specialLayers += error;
        sizeErrors[sizeCategory].specialCount++;
      } else {
        finalStandardChannelsErrorSpecial += error;
        standardChannelCount++;
        
        // Size-stratified standard channel errors
        sizeErrors[sizeCategory].standardChannels += error;
        sizeErrors[sizeCategory].standardCount++;
        
        // Track single-color test errors separately
        if (isSingleColorTest(entry, channel)) {
          finalSingleColorErrorsSpecial[channel] = (finalSingleColorErrorsSpecial[channel] || 0) + error;
          finalSingleColorTotalErrorSpecial += error;
          singleColorChannelCount++;
        }
      }
    });
  });
  
  // Average error per channel
  Object.keys(finalChannelErrorsSpecial).forEach(channel => {
    const channelTestCount = channelDatasets[channel]?.length || 0;
    
    if (channelTestCount > 0) {
      finalChannelErrorsSpecial[channel] /= channelTestCount;
    }
  });
  
  // Average overall error
  if (channelCount > 0) finalTotalErrorSpecial /= channelCount;
  if (standardChannelCount > 0) finalStandardChannelsErrorSpecial /= standardChannelCount;
  if (specialLayerCount > 0) finalSpecialLayersErrorSpecial /= specialLayerCount;
  if (singleColorChannelCount > 0) finalSingleColorTotalErrorSpecial /= singleColorChannelCount;
  
  // Average error for single-color tests
  Object.keys(finalSingleColorErrorsSpecial).forEach(channel => {
    const singleColorTests = testEntries.filter(entry => isSingleColorTest(entry, channel));
    if (singleColorTests.length > 0) {
      finalSingleColorErrorsSpecial[channel] /= singleColorTests.length;
    }
  });
  
  // Average error for special layers
  Object.keys(finalSpecialLayersErrorsSpecial).forEach(channel => {
    const layerTests = channelDatasets[channel];
    if (layerTests && layerTests.length > 0) {
      finalSpecialLayersErrorsSpecial[channel] /= layerTests.length;
    }
  });
  
  // Average size-stratified errors
  Object.keys(sizeErrors).forEach(size => {
    const sizeData = sizeErrors[size as keyof typeof sizeErrors];
    
    if (sizeData.count > 0) {
      sizeData.total /= sizeData.count;
    }
    
    if (sizeData.standardCount > 0) {
      sizeData.standardChannels /= sizeData.standardCount;
    }
    
    if (sizeData.specialCount > 0) {
      sizeData.specialLayers /= sizeData.specialCount;
    }
  });
  
  // Compile improvement stats
  const improvement = {
    overall: initialTotalError - finalTotalErrorSpecial,
    standardChannels: initialStandardChannelsError - finalStandardChannelsErrorSpecial,
    specialLayers: initialSpecialLayersError - finalSpecialLayersErrorSpecial,
    percentOverall: ((initialTotalError - finalTotalErrorSpecial) / initialTotalError) * 100,
    percentStandardChannels: ((initialStandardChannelsError - finalStandardChannelsErrorSpecial) / initialStandardChannelsError) * 100,
    percentSpecialLayers: ((initialSpecialLayersError - finalSpecialLayersErrorSpecial) / initialSpecialLayersError) * 100
  };
  
  // Log detailed final results
  console.log("[CALIBRATION-DEBUG] Final average error rates:", {
    overall: finalTotalErrorSpecial.toFixed(4) + " mL",
    standardChannels: finalStandardChannelsErrorSpecial.toFixed(4) + " mL",
    specialLayers: finalSpecialLayersErrorSpecial.toFixed(4) + " mL",
    byChannel: Object.fromEntries(Object.entries(finalChannelErrorsSpecial).map(([k, v]) => [k, v.toFixed(4) + " mL"])),
    singleColorChannels: Object.fromEntries(Object.entries(finalSingleColorErrorsSpecial).map(([k, v]) => [k, v.toFixed(4) + " mL"])),
    specialLayersByChannel: Object.fromEntries(Object.entries(finalSpecialLayersErrorsSpecial).map(([k, v]) => [k, v.toFixed(4) + " mL"])),
    bySize: {
      small: {
        overall: sizeErrors.small.total.toFixed(4) + " mL",
        standardChannels: sizeErrors.small.standardChannels.toFixed(4) + " mL",
        specialLayers: sizeErrors.small.specialLayers.toFixed(4) + " mL",
      },
      medium: {
        overall: sizeErrors.medium.total.toFixed(4) + " mL",
        standardChannels: sizeErrors.medium.standardChannels.toFixed(4) + " mL",
        specialLayers: sizeErrors.medium.specialLayers.toFixed(4) + " mL",
      },
      large: {
        overall: sizeErrors.large.total.toFixed(4) + " mL",
        standardChannels: sizeErrors.large.standardChannels.toFixed(4) + " mL",
        specialLayers: sizeErrors.large.specialLayers.toFixed(4) + " mL",
      }
    }
  });
  
  console.log("[CALIBRATION-DEBUG] Improvement from calibration:", {
    overall: improvement.overall.toFixed(4) + " mL (" + improvement.percentOverall.toFixed(1) + "%)",
    standardChannels: improvement.standardChannels.toFixed(4) + " mL (" + improvement.percentStandardChannels.toFixed(1) + "%)",
    specialLayers: improvement.specialLayers.toFixed(4) + " mL (" + improvement.percentSpecialLayers.toFixed(1) + "%)"
  });
  
  console.log("[CALIBRATION-DEBUG] Calibration complete using four-phase process from PRD");
  
  // Return the optimized factors and detailed error metrics
  return {
    factors: optimizedFactors,
    errors: {
      initial: {
        overall: initialTotalError,
        standardChannels: initialStandardChannelsError,
        specialLayers: initialSpecialLayersError,
        byChannel: initialChannelErrors
      },
      final: {
        overall: finalTotalErrorSpecial,
        standardChannels: finalStandardChannelsErrorSpecial,
        specialLayers: finalSpecialLayersErrorSpecial,
        byChannel: finalChannelErrorsSpecial,
        singleColorChannels: finalSingleColorErrorsSpecial,
        specialLayersByChannel: finalSpecialLayersErrorsSpecial
      },
      improvement
    }
  };
}

/**
 * Save calibrated factors to database or local storage
 */
export async function saveCalibrationFactors(factors: CalibrationFactors, calibration_type: 'cmyk' | 'special_layer' | 'combined' = 'combined'): Promise<boolean> {
  console.log("[CALIBRATION-DEBUG] Saving calibration factors to database");
  
  try {
    // Format data for API with proper structure
    const requestData = {
      factors: {
        baseConsumption: factors.baseConsumption,
        channelScalingFactors: factors.channelScalingFactors,
        qualityChannelMultipliers: factors.qualityChannelMultipliers,
        areaScalingMultipliers: factors.areaScalingMultipliers,
        areaExponents: factors.areaExponents,
        coverageExponents: factors.coverageExponents,
        inkModeAdjustments: factors.inkModeAdjustments,
        layerIntercepts: factors.layerIntercepts,
        layerSlopes: factors.layerSlopes
      },
      calibration_type
    };

    // Save to API endpoint
    const response = await fetch('/api/admin/ink-calculator/calibration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    console.log("[CALIBRATION-DEBUG] API response status:", response.status);
    
    if (!response.ok) {
      console.error("[CALIBRATION-DEBUG] API request failed:", response.status);
      throw new Error('Failed to save calibration factors');
    }
    
    return true;
  } catch (error) {
    console.error('[CALIBRATION-DEBUG] Error saving calibration factors:', error);
    return false;
  }
}

/**
 * Load saved calibration factors
 */
export async function loadCalibrationFactors(): Promise<CalibrationFactors | null> {
  try {
    const response = await fetch('/api/admin/ink-calculator/calibration');
    
    if (!response.ok) {
      throw new Error('Failed to load calibration factors');
    }
    
    const data = await response.json();
    return data.factors;
  } catch (error) {
    console.error('Error loading calibration factors:', error);
    return null;
  }
}

/**
 * Specialized function for optimizing CMYK factors only
 * This operates on a filtered dataset that only includes CMYK channels
 */
export function calibrateCmykFactors(testEntries: TestDataEntry[]): CalibrationResult {
  console.log("[CALIBRATION-DEBUG] Starting CMYK-only calibration");
  
  // Filter test entries to only include those with CMYK data
  const cmykEntries = testEntries.filter(entry => 
    Object.keys(entry.channel_ml).some(channel => 
      ['cyan', 'magenta', 'yellow', 'black'].includes(channel) && 
      entry.channel_ml[channel] > 0
    )
  );
  
  console.log("[CALIBRATION-DEBUG] CMYK test entries:", cmykEntries.length);
  
  if (cmykEntries.length < 5) {
    console.error("[CALIBRATION-DEBUG] Not enough CMYK test data for meaningful calibration");
    throw new Error("Not enough CMYK test data (minimum 5 entries required)");
  }
  
  // Start with current calibration factors
  const initialFactors: CalibrationFactors = {
    baseConsumption: { ...BASE_CONSUMPTION },
    channelScalingFactors: { ...CHANNEL_SCALING_FACTORS },
    qualityChannelMultipliers: JSON.parse(JSON.stringify(QUALITY_CHANNEL_MULTIPLIERS)),
    areaScalingMultipliers: { ...AREA_SCALING_MULTIPLIERS },
    areaExponents: { ...AREA_EXPONENTS },
    coverageExponents: { ...COVERAGE_EXPONENTS },
    inkModeAdjustments: JSON.parse(JSON.stringify(INK_MODE_ADJUSTMENTS)),
    layerIntercepts: { ...LAYER_INTERCEPTS },
    layerSlopes: { ...LAYER_SLOPES }
  };
  
  // Calculate initial error metrics
  const initialOverallError = calculateOverallError(cmykEntries, initialFactors);
  const initialChannelErrors: Record<string, number> = {};
  const initialSingleColorErrors: Record<string, number> = {};
  
  // Only calculate errors for CMYK channels
  ['cyan', 'magenta', 'yellow', 'black'].forEach(channel => {
    initialChannelErrors[channel] = calculateChannelError(cmykEntries, channel, initialFactors);
    
    // Calculate errors for single-color test entries only
    const singleColorEntries = cmykEntries.filter(entry => isSingleColorTest(entry, channel));
    if (singleColorEntries.length > 0) {
      initialSingleColorErrors[channel] = calculateChannelError(singleColorEntries, channel, initialFactors);
    }
  });
  
  // Log initial errors
  console.log("[CALIBRATION-DEBUG] Initial CMYK errors:", {
    overall: initialOverallError,
    byChannel: initialChannelErrors,
    singleColor: initialSingleColorErrors
  });
  
  // Create a copy of initialFactors for optimization
  const optimizedFactors: CalibrationFactors = JSON.parse(JSON.stringify(initialFactors));
  
  // FIRST PASS: Optimize base consumption for each CMYK channel
  console.log("[CALIBRATION-DEBUG] CMYK First pass: Optimizing base consumption values");
  
  ['cyan', 'magenta', 'yellow', 'black'].forEach(channel => {
    const relevantEntries = cmykEntries.filter(entry => 
      entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0
    );
    
    if (relevantEntries.length >= 3) {
      // Optimize base consumption
      optimizedFactors.baseConsumption[channel] = optimizeFactor(
        relevantEntries,
        channel,
        initialFactors.baseConsumption[channel],
        (baseValue) => evaluateBaseConsumptionError(relevantEntries, channel, optimizedFactors, baseValue),
        initialFactors.baseConsumption[channel] * 0.1,
        initialFactors.baseConsumption[channel] * 10,
        10,
        { isSpecialLayer: false }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized ${channel} base consumption: ${optimizedFactors.baseConsumption[channel]}`);
    }
  });
  
  // SECOND PASS: Optimize scaling factors for each CMYK channel
  console.log("[CALIBRATION-DEBUG] CMYK Second pass: Optimizing scaling factors");
  
  ['cyan', 'magenta', 'yellow', 'black'].forEach(channel => {
    const relevantEntries = cmykEntries.filter(entry => 
      entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0
    );
    
    if (relevantEntries.length >= 3) {
      // Optimize scaling factor
      optimizedFactors.channelScalingFactors[channel] = optimizeFactor(
        relevantEntries,
        channel,
        initialFactors.channelScalingFactors[channel],
        (scalingFactor) => evaluateChannelScalingError(relevantEntries, channel, optimizedFactors, scalingFactor),
        initialFactors.channelScalingFactors[channel] * 0.1,
        initialFactors.channelScalingFactors[channel] * 10,
        10,
        { isSpecialLayer: false }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized ${channel} scaling factor: ${optimizedFactors.channelScalingFactors[channel]}`);
    }
  });
  
  // THIRD PASS: Optimize area exponents for each CMYK channel
  console.log("[CALIBRATION-DEBUG] CMYK Third pass: Optimizing area exponents");
  
  ['cyan', 'magenta', 'yellow', 'black'].forEach(channel => {
    const relevantEntries = cmykEntries.filter(entry => 
      entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0
    );
    
    if (relevantEntries.length >= 3) {
      // Optimize area exponent
      optimizedFactors.areaExponents[channel] = optimizeFactor(
        relevantEntries,
        channel,
        initialFactors.areaExponents[channel],
        (areaExponent) => evaluateAreaExponentError(relevantEntries, channel, optimizedFactors, areaExponent),
        Math.max(initialFactors.areaExponents[channel] * 0.5, 0.1),
        Math.min(initialFactors.areaExponents[channel] * 1.5, 2.0),
        10,
        { isSpecialLayer: false }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized ${channel} area exponent: ${optimizedFactors.areaExponents[channel]}`);
    }
  });
  
  // FOURTH PASS: Optimize coverage exponents for each CMYK channel
  console.log("[CALIBRATION-DEBUG] CMYK Fourth pass: Optimizing coverage exponents");
  
  ['cyan', 'magenta', 'yellow', 'black'].forEach(channel => {
    const relevantEntries = cmykEntries.filter(entry => 
      entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0
    );
    
    if (relevantEntries.length >= 3) {
      // Optimize coverage exponent
      optimizedFactors.coverageExponents[channel] = optimizeFactor(
        relevantEntries,
        channel,
        initialFactors.coverageExponents[channel],
        (coverageExponent) => evaluateCoverageExponentError(relevantEntries, channel, optimizedFactors, coverageExponent),
        Math.max(initialFactors.coverageExponents[channel] * 0.5, 0.1),
        Math.min(initialFactors.coverageExponents[channel] * 1.5, 2.0),
        10,
        { isSpecialLayer: false }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized ${channel} coverage exponent: ${optimizedFactors.coverageExponents[channel]}`);
    }
  });
  
  // FIFTH PASS: Optimize quality multipliers for each CMYK channel and quality
  console.log("[CALIBRATION-DEBUG] CMYK Fifth pass: Optimizing quality multipliers");
  
  const qualities: PrintQuality[] = ['draft', 'standard', 'high'];
  qualities.forEach(quality => {
    if (quality === 'standard') return; // Skip standard quality as it's always 1.0
    
    ['cyan', 'magenta', 'yellow', 'black'].forEach(channel => {
      const qualityEntries = cmykEntries.filter(entry => 
        entry.quality === quality && 
        entry.channel_ml[channel] !== undefined && 
        entry.channel_ml[channel] > 0
      );
      
      if (qualityEntries.length >= 2) {
        // Optimize quality multiplier
        optimizedFactors.qualityChannelMultipliers[quality][channel] = optimizeFactor(
          qualityEntries,
          channel,
          initialFactors.qualityChannelMultipliers[quality][channel],
          (multiplier) => evaluateQualityMultiplierError(qualityEntries, channel, quality, optimizedFactors, multiplier),
          initialFactors.qualityChannelMultipliers[quality][channel] * 0.5,
          initialFactors.qualityChannelMultipliers[quality][channel] * 1.5,
          8,
          { isSpecialLayer: false }
        );
        
        console.log(`[CALIBRATION-DEBUG] Optimized ${quality} ${channel} multiplier: ${optimizedFactors.qualityChannelMultipliers[quality][channel]}`);
      }
    });
  });
  
  // Calculate final error metrics after optimization
  const finalOverallError = calculateOverallError(cmykEntries, optimizedFactors);
  const finalChannelErrors: Record<string, number> = {};
  const finalSingleColorErrors: Record<string, number> = {};
  
  ['cyan', 'magenta', 'yellow', 'black'].forEach(channel => {
    finalChannelErrors[channel] = calculateChannelError(cmykEntries, channel, optimizedFactors);
    
    // Calculate errors for single-color test entries only
    const singleColorEntries = cmykEntries.filter(entry => isSingleColorTest(entry, channel));
    if (singleColorEntries.length > 0) {
      finalSingleColorErrors[channel] = calculateChannelError(singleColorEntries, channel, optimizedFactors);
    }
  });
  
  // Calculate improvement
  const errorImprovement = initialOverallError - finalOverallError;
  const percentImprovement = initialOverallError > 0 
    ? (errorImprovement / initialOverallError) * 100 
    : 0;
  
  console.log("[CALIBRATION-DEBUG] CMYK calibration complete", {
    initialError: initialOverallError,
    finalError: finalOverallError,
    improvement: errorImprovement,
    percentImprovement: percentImprovement
  });
  
  return {
    factors: optimizedFactors,
    errors: {
      initial: {
        overall: initialOverallError,
        standardChannels: initialOverallError, // For CMYK only, these are the same
        specialLayers: 0, // Not applicable for CMYK-only calibration
        byChannel: initialChannelErrors
      },
      final: {
        overall: finalOverallError,
        standardChannels: finalOverallError, // For CMYK only, these are the same
        specialLayers: 0, // Not applicable for CMYK-only calibration
        byChannel: finalChannelErrors,
        singleColorChannels: finalSingleColorErrors,
        specialLayersByChannel: {} // Not applicable for CMYK-only calibration
      },
      improvement: {
        overall: errorImprovement,
        standardChannels: errorImprovement, // For CMYK only, these are the same
        specialLayers: errorImprovement,
        percentOverall: percentImprovement,
        percentStandardChannels: percentImprovement, // For CMYK only, these are the same
        percentSpecialLayers: percentImprovement
      }
    }
  };
}

/**
 * Specialized function for optimizing special layer factors only
 * This operates on a filtered dataset that only includes special layers data
 * Uses a completely different optimization approach focused on area-based calculations
 */
export function calibrateSpecialLayerFactors(testEntries: TestDataEntry[]): CalibrationResult {
  // Initialize counters
  let channelCount = 0;
  let standardChannelCount = 0;
  let specialLayerCount = 0;
  
  // Define special layers set
  const specialLayers = new Set(['white', 'gloss', 'clear', 'primer']);
  
  // Group test entries by channel for easier access
  const channelDatasets: Record<string, TestDataEntry[]> = {};
  testEntries.forEach((entry: TestDataEntry) => {
    Object.keys(entry.channel_ml).forEach(channel => {
      if (!channelDatasets[channel]) channelDatasets[channel] = [];
      channelDatasets[channel].push(entry);
    });
  });

  // Filter test entries to only include those with special layer data
  const specialLayerEntries = testEntries.filter((entry: TestDataEntry) => 
    Object.keys(entry.channel_ml).some(channel => 
      specialLayers.has(channel) && entry.channel_ml[channel] > 0
    )
  );

  console.log("[CALIBRATION-DEBUG] Starting special layer calibration");
  console.log("[CALIBRATION-DEBUG] Special layer test entries:", specialLayerEntries.length);
  
  if (specialLayerEntries.length < 5) {
    console.error("[CALIBRATION-DEBUG] Not enough special layer test data for meaningful calibration");
    throw new Error("Not enough special layer test data (minimum 5 entries required)");
  }
  
  // Start with current calibration factors
  const initialFactors: CalibrationFactors = {
    baseConsumption: { ...BASE_CONSUMPTION },
    channelScalingFactors: { ...CHANNEL_SCALING_FACTORS },
    qualityChannelMultipliers: JSON.parse(JSON.stringify(QUALITY_CHANNEL_MULTIPLIERS)),
    areaScalingMultipliers: { ...AREA_SCALING_MULTIPLIERS },
    areaExponents: { ...AREA_EXPONENTS },
    coverageExponents: { ...COVERAGE_EXPONENTS },
    inkModeAdjustments: JSON.parse(JSON.stringify(INK_MODE_ADJUSTMENTS)),
    layerIntercepts: { ...LAYER_INTERCEPTS },
    layerSlopes: { ...LAYER_SLOPES }
  };
  
  // Calculate initial error metrics for special layers
  const initialChannelErrors: Record<string, number> = {};
  let initialOverallError = 0;
  let initialSpecialLayersError = 0;
  let initialStandardChannelsError = 0;
  
  // Calculate initial error using the initial factors
  specialLayerEntries.forEach(entry => {
    Object.entries(entry.channel_ml).forEach(([channel, actualMl]) => {
      if (actualMl <= 0) return;
      
      const estimatedMl = estimateChannelUsage(entry, channel, {
        channelScalingFactor: initialFactors.channelScalingFactors[channel]
      });
      
      const error = Math.abs(estimatedMl - actualMl);
      initialChannelErrors[channel] = (initialChannelErrors[channel] || 0) + error;
      initialOverallError += error;
      
      if (specialLayers.has(channel)) {
        initialSpecialLayersError += error;
      } else {
        initialStandardChannelsError += error;
      }
    });
  });
  
  // Average initial errors
  const initialChannelCount = Object.keys(initialChannelErrors).length;
  if (initialChannelCount > 0) {
    initialOverallError /= initialChannelCount;
    Object.keys(initialChannelErrors).forEach(channel => {
      const channelTestCount = channelDatasets[channel]?.length || 0;
      if (channelTestCount > 0) {
        initialChannelErrors[channel] /= channelTestCount;
      }
    });
  }
  
  // Log initial errors
  console.log("[CALIBRATION-DEBUG] Initial special layer errors:", {
    overall: initialOverallError,
    specialLayers: initialSpecialLayersError,
    byChannel: initialChannelErrors
  });

  // Create a copy of initialFactors for optimization
  const optimizedFactors: CalibrationFactors = JSON.parse(JSON.stringify(initialFactors));
  
  // FIRST PASS: Optimize layer slopes for each special layer
  console.log("[CALIBRATION-DEBUG] First pass: Optimizing layer slopes");
  
  ['white', 'gloss', 'clear', 'primer'].forEach(layer => {
    const relevantEntries = specialLayerEntries.filter(entry => 
      entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0
    );
    
    if (relevantEntries.length >= 3) {
      // Optimize layer slope
      optimizedFactors.layerSlopes[layer] = optimizeFactor(
        relevantEntries,
        layer,
        initialFactors.layerSlopes[layer],
        (slope) => evaluateLayerSlopeError(relevantEntries, layer, optimizedFactors, slope),
        initialFactors.layerSlopes[layer] * 0.5,
        initialFactors.layerSlopes[layer] * 2.0,
        10,
        { isSpecialLayer: true }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized ${layer} slope: ${optimizedFactors.layerSlopes[layer]}`);
    }
  });

  // SECOND PASS: Optimize layer intercepts for each special layer
  console.log("[CALIBRATION-DEBUG] Second pass: Optimizing layer intercepts");
  
  ['white', 'gloss', 'clear', 'primer'].forEach(layer => {
    const relevantEntries = specialLayerEntries.filter(entry => 
      entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0
    );
    
    if (relevantEntries.length >= 3) {
      // Optimize layer intercept
      optimizedFactors.layerIntercepts[layer] = optimizeFactor(
        relevantEntries,
        layer,
        initialFactors.layerIntercepts[layer],
        (intercept) => evaluateLayerInterceptError(relevantEntries, layer, optimizedFactors, intercept),
        -0.05,  // Allow slightly negative intercepts
        0.05,   // Cap positive intercepts
        10,
        { isSpecialLayer: true }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized ${layer} intercept: ${optimizedFactors.layerIntercepts[layer]}`);
    }
  });
  
  // 3.2 Optimize scaling factors for each special layer
  console.log("[CALIBRATION-DEBUG] Special Layer Second pass: Optimizing scaling factors");
  
  ['white', 'gloss', 'clear', 'primer'].forEach(layer => {
    const relevantEntries = specialLayerEntries.filter(entry => 
      entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0
    );
    
    if (relevantEntries.length >= 3) {
      // Special layers need much higher scaling factors
      optimizedFactors.channelScalingFactors[layer] = optimizeFactor(
        relevantEntries,
        layer,
        initialFactors.channelScalingFactors[layer],
        (scalingFactor) => evaluateChannelScalingError(relevantEntries, layer, optimizedFactors, scalingFactor),
        0.01,  // Minimum value much higher than CMYK
        0.2,   // Maximum value much higher than CMYK
        10,
        { isSpecialLayer: true }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized ${layer} scaling factor: ${optimizedFactors.channelScalingFactors[layer]}`);
    }
  });
  
  // 3.3 Optimize area exponents for each special layer
  // Special layers should use area exponents very close to 1.0 for linear behavior
  console.log("[CALIBRATION-DEBUG] Special Layer Third pass: Optimizing area exponents");
  
  ['white', 'gloss', 'clear', 'primer'].forEach(layer => {
    const relevantEntries = specialLayerEntries.filter(entry => 
      entry.channel_ml[layer] !== undefined && entry.channel_ml[layer] > 0
    );
    
    if (relevantEntries.length >= 3) {
      // For special layers, area exponents should be close to 1.0
      optimizedFactors.areaExponents[layer] = optimizeFactor(
        relevantEntries,
        layer,
        initialFactors.areaExponents[layer],
        (areaExponent) => evaluateAreaExponentError(relevantEntries, layer, optimizedFactors, areaExponent),
        0.8,  // Minimum closer to 1.0
        1.0,  // Maximum is 1.0 for perfect linearity
        10,
        { isSpecialLayer: true }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized ${layer} area exponent: ${optimizedFactors.areaExponents[layer]}`);
    }
  });
  
  // 3.4 Optimize ink mode adjustments for special layers
  console.log("[CALIBRATION-DEBUG] Special Layer Fourth pass: Optimizing ink mode adjustments");
  
  // For special layers, ink mode adjustments are especially important
  // These define how much ink is used in different modes like WHITE_CMYK vs WHITE_CMYK_GLOSS
  
  // For white layer
  ['WHITE_CMYK', 'WHITE_CMYK_GLOSS', 'SELECTIVE_WHITE_CMYK'].forEach(inkMode => {
    if (!optimizedFactors.inkModeAdjustments[inkMode]) {
      console.log(`[CALIBRATION-DEBUG] Skipping ${inkMode} for white adjustment (not in config)`);
      return;
    }
    
    const relevantEntries = specialLayerEntries.filter(entry => 
      entry.ink_mode === inkMode && 
      entry.channel_ml['white'] !== undefined && 
      entry.channel_ml['white'] > 0
    );
    
    if (relevantEntries.length >= 2) {
      // White layer needs specific ink mode adjustment
      optimizedFactors.inkModeAdjustments[inkMode]['white'] = optimizeFactor(
        relevantEntries,
        'white',
        initialFactors.inkModeAdjustments[inkMode]['white'] || 1.0,
        (adjustment) => evaluateInkModeAdjustmentError(relevantEntries, 'white', inkMode, optimizedFactors, adjustment),
        1.0,  // Minimum adjustment
        10.0, // Maximum adjustment much higher for special layers
        8,
        { isSpecialLayer: true }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized white ${inkMode} adjustment: ${optimizedFactors.inkModeAdjustments[inkMode]['white']}`);
    }
  });
  
  // For gloss layer
  ['CMYK_GLOSS', 'WHITE_CMYK_GLOSS', 'SELECTIVE_CMYK_GLOSS'].forEach(inkMode => {
    if (!optimizedFactors.inkModeAdjustments[inkMode]) {
      console.log(`[CALIBRATION-DEBUG] Skipping ${inkMode} for gloss adjustment (not in config)`);
      return;
    }
    
    const relevantEntries = specialLayerEntries.filter(entry => 
      entry.ink_mode === inkMode && 
      entry.channel_ml['gloss'] !== undefined && 
      entry.channel_ml['gloss'] > 0
    );
    
    if (relevantEntries.length >= 2) {
      // Gloss layer needs specific ink mode adjustment
      optimizedFactors.inkModeAdjustments[inkMode]['gloss'] = optimizeFactor(
        relevantEntries,
        'gloss',
        initialFactors.inkModeAdjustments[inkMode]['gloss'] || 1.0,
        (adjustment) => evaluateInkModeAdjustmentError(relevantEntries, 'gloss', inkMode, optimizedFactors, adjustment),
        1.0,  // Minimum adjustment
        10.0, // Maximum adjustment much higher for special layers
        8,
        { isSpecialLayer: true }
      );
      
      console.log(`[CALIBRATION-DEBUG] Optimized gloss ${inkMode} adjustment: ${optimizedFactors.inkModeAdjustments[inkMode]['gloss']}`);
    }
  });
  
  // 3.5 Optimize quality multipliers for each special layer and quality
  console.log("[CALIBRATION-DEBUG] Special Layer Fifth pass: Optimizing quality multipliers");
  
  const qualities: PrintQuality[] = ['draft', 'standard', 'high'];
  qualities.forEach(quality => {
    if (quality === 'standard') return; // Skip standard quality as it's always 1.0
    
    ['white', 'gloss', 'clear', 'primer'].forEach(layer => {
      const qualityEntries = specialLayerEntries.filter(entry => 
        entry.quality === quality && 
        entry.channel_ml[layer] !== undefined && 
        entry.channel_ml[layer] > 0
      );
      
      if (qualityEntries.length >= 2) {
        // Optimize quality multiplier
        optimizedFactors.qualityChannelMultipliers[quality][layer] = optimizeFactor(
          qualityEntries,
          layer,
          initialFactors.qualityChannelMultipliers[quality][layer],
          (multiplier) => evaluateQualityMultiplierError(qualityEntries, layer, quality, optimizedFactors, multiplier),
          initialFactors.qualityChannelMultipliers[quality][layer] * 0.5,
          initialFactors.qualityChannelMultipliers[quality][layer] * 1.5,
          8,
          { isSpecialLayer: true }
        );
        
        console.log(`[CALIBRATION-DEBUG] Optimized ${quality} ${layer} multiplier: ${optimizedFactors.qualityChannelMultipliers[quality][layer]}`);
      }
    });
  });
  
  // 3.6 Implement area-based optimization using three size ranges
  console.log("[CALIBRATION-DEBUG] PHASE 3.6: Size-based calculation verification for special layers");
  
  // Small, Medium, and Large print entries
  const smallPrintEntries = testEntries.filter(entry => {
    const normalizedDimensions = normalizeSize(
      entry.dimensions.width, 
      entry.dimensions.height, 
      entry.dimensions.unit as 'in' | 'mm'
    );
    const area = normalizedDimensions.width * normalizedDimensions.height;
    return area < 4; // Small prints (<50mm square = ~4 sq inches)
  });
  
  const mediumPrintEntries = testEntries.filter(entry => {
    const normalizedDimensions = normalizeSize(
      entry.dimensions.width, 
      entry.dimensions.height, 
      entry.dimensions.unit as 'in' | 'mm'
    );
    const area = normalizedDimensions.width * normalizedDimensions.height;
    return area >= 4 && area <= 100; // Medium prints (50-250mm square = ~4-100 sq inches)
  });
  
  const largePrintEntries = testEntries.filter(entry => {
    const normalizedDimensions = normalizeSize(
      entry.dimensions.width, 
      entry.dimensions.height, 
      entry.dimensions.unit as 'in' | 'mm'
    );
    const area = normalizedDimensions.width * normalizedDimensions.height;
    return area > 100; // Large prints (>250mm square = >100 sq inches)
  });
  
  console.log("[CALIBRATION-DEBUG] Print size distribution:", {
    small: smallPrintEntries.length,
    medium: mediumPrintEntries.length,
    large: largePrintEntries.length
  });
  
  // ====================================================================
  // PHASE 4: VALIDATION PHASE
  // ====================================================================
  console.log("[CALIBRATION-DEBUG] PHASE 4: VALIDATION PHASE");
  
  // Calculate final error rates with separate metrics for standard vs. special layers
  const finalChannelErrorsSpecial: Record<string, number> = {};
  const finalSingleColorErrorsSpecial: Record<string, number> = {};
  const finalSpecialLayersErrorsSpecial: Record<string, number> = {};
  let finalTotalErrorSpecial = 0;
  let finalStandardChannelsErrorSpecial = 0;
  let finalSpecialLayersErrorSpecial = 0;
  let finalSingleColorTotalErrorSpecial = 0;
  
  // Size-stratified error metrics
  const sizeErrors = {
    small: { total: 0, count: 0, standardChannels: 0, standardCount: 0, specialLayers: 0, specialCount: 0 },
    medium: { total: 0, count: 0, standardChannels: 0, standardCount: 0, specialLayers: 0, specialCount: 0 },
    large: { total: 0, count: 0, standardChannels: 0, standardCount: 0, specialLayers: 0, specialCount: 0 },
  };
  
  // Reset counters for final error calculation
  channelCount = 0;
  standardChannelCount = 0;
  specialLayerCount = 0;
  let singleColorChannelCount = 0;
  
  // Calculate errors across all entries
  testEntries.forEach(entry => {
    // Get the area to categorize print size
    const normalizedDimensions = normalizeSize(
      entry.dimensions.width, 
      entry.dimensions.height, 
      entry.dimensions.unit as 'in' | 'mm'
    );
    const area = normalizedDimensions.width * normalizedDimensions.height;
    
    // Determine size category
    let sizeCategory: 'small' | 'medium' | 'large';
    if (area < 4) {
      sizeCategory = 'small';
    } else if (area <= 100) {
      sizeCategory = 'medium';
    } else {
      sizeCategory = 'large';
    }
    
    // Process each channel with actual data
    Object.entries(entry.channel_ml).forEach(([channel, actualMl]) => {
      if (actualMl <= 0) return; // Skip zero or undefined values
      
      // Calculate predicted value using optimized factors
      const estimatedMl = estimateChannelUsage(entry, channel, {
        channelScalingFactor: optimizedFactors.channelScalingFactors[channel]
      });
      
      // Calculate absolute error (MAE)
      const error = Math.abs(estimatedMl - actualMl);
      
      // Update overall error metrics
      finalChannelErrorsSpecial[channel] = (finalChannelErrorsSpecial[channel] || 0) + error;
      finalTotalErrorSpecial += error;
      channelCount++;
      
      // Update size-stratified error metrics
      sizeErrors[sizeCategory].total += error;
      sizeErrors[sizeCategory].count++;
      
      // Split metrics by channel type (standard vs. special)
      if (specialLayers.has(channel)) {
        finalSpecialLayersErrorsSpecial[channel] = (finalSpecialLayersErrorsSpecial[channel] || 0) + error;
        finalSpecialLayersErrorSpecial += error;
        specialLayerCount++;
        
        // Size-stratified special layer errors
        sizeErrors[sizeCategory].specialLayers += error;
        sizeErrors[sizeCategory].specialCount++;
      } else {
        finalStandardChannelsErrorSpecial += error;
        standardChannelCount++;
        
        // Size-stratified standard channel errors
        sizeErrors[sizeCategory].standardChannels += error;
        sizeErrors[sizeCategory].standardCount++;
        
        // Track single-color test errors separately
        if (isSingleColorTest(entry, channel)) {
          finalSingleColorErrorsSpecial[channel] = (finalSingleColorErrorsSpecial[channel] || 0) + error;
          finalSingleColorTotalErrorSpecial += error;
          singleColorChannelCount++;
        }
      }
    });
  });
  
  // Average error per channel
  Object.keys(finalChannelErrorsSpecial).forEach(channel => {
    const channelTestCount = channelDatasets[channel]?.length || 0;
    
    if (channelTestCount > 0) {
      finalChannelErrorsSpecial[channel] /= channelTestCount;
    }
  });
  
  // Average overall error
  if (channelCount > 0) finalTotalErrorSpecial /= channelCount;
  if (standardChannelCount > 0) finalStandardChannelsErrorSpecial /= standardChannelCount;
  if (specialLayerCount > 0) finalSpecialLayersErrorSpecial /= specialLayerCount;
  if (singleColorChannelCount > 0) finalSingleColorTotalErrorSpecial /= singleColorChannelCount;
  
  // Average error for single-color tests
  Object.keys(finalSingleColorErrorsSpecial).forEach(channel => {
    const singleColorTests = testEntries.filter(entry => isSingleColorTest(entry, channel));
    if (singleColorTests.length > 0) {
      finalSingleColorErrorsSpecial[channel] /= singleColorTests.length;
    }
  });
  
  // Average error for special layers
  Object.keys(finalSpecialLayersErrorsSpecial).forEach(channel => {
    const layerTests = channelDatasets[channel];
    if (layerTests && layerTests.length > 0) {
      finalSpecialLayersErrorsSpecial[channel] /= layerTests.length;
    }
  });
  
  // Average size-stratified errors
  Object.keys(sizeErrors).forEach(size => {
    const sizeData = sizeErrors[size as keyof typeof sizeErrors];
    
    if (sizeData.count > 0) {
      sizeData.total /= sizeData.count;
    }
    
    if (sizeData.standardCount > 0) {
      sizeData.standardChannels /= sizeData.standardCount;
    }
    
    if (sizeData.specialCount > 0) {
      sizeData.specialLayers /= sizeData.specialCount;
    }
  });
  
  // Compile improvement stats
  const improvement = {
    overall: initialOverallError - finalTotalErrorSpecial,
    standardChannels: initialStandardChannelsError - finalStandardChannelsErrorSpecial,
    specialLayers: initialSpecialLayersError - finalSpecialLayersErrorSpecial,
    percentOverall: ((initialOverallError - finalTotalErrorSpecial) / initialOverallError) * 100,
    percentStandardChannels: ((initialStandardChannelsError - finalStandardChannelsErrorSpecial) / initialStandardChannelsError) * 100,
    percentSpecialLayers: ((initialSpecialLayersError - finalSpecialLayersErrorSpecial) / initialSpecialLayersError) * 100
  };
  
  // Log detailed final results
  console.log("[CALIBRATION-DEBUG] Final average error rates:", {
    overall: finalTotalErrorSpecial.toFixed(4) + " mL",
    standardChannels: finalStandardChannelsErrorSpecial.toFixed(4) + " mL",
    specialLayers: finalSpecialLayersErrorSpecial.toFixed(4) + " mL",
    byChannel: Object.fromEntries(Object.entries(finalChannelErrorsSpecial).map(([k, v]) => [k, v.toFixed(4) + " mL"])),
    singleColorChannels: Object.fromEntries(Object.entries(finalSingleColorErrorsSpecial).map(([k, v]) => [k, v.toFixed(4) + " mL"])),
    specialLayersByChannel: Object.fromEntries(Object.entries(finalSpecialLayersErrorsSpecial).map(([k, v]) => [k, v.toFixed(4) + " mL"])),
    bySize: {
      small: {
        overall: sizeErrors.small.total.toFixed(4) + " mL",
        standardChannels: sizeErrors.small.standardChannels.toFixed(4) + " mL",
        specialLayers: sizeErrors.small.specialLayers.toFixed(4) + " mL",
      },
      medium: {
        overall: sizeErrors.medium.total.toFixed(4) + " mL",
        standardChannels: sizeErrors.medium.standardChannels.toFixed(4) + " mL",
        specialLayers: sizeErrors.medium.specialLayers.toFixed(4) + " mL",
      },
      large: {
        overall: sizeErrors.large.total.toFixed(4) + " mL",
        standardChannels: sizeErrors.large.standardChannels.toFixed(4) + " mL",
        specialLayers: sizeErrors.large.specialLayers.toFixed(4) + " mL",
      }
    }
  });
  
  console.log("[CALIBRATION-DEBUG] Improvement from calibration:", {
    overall: improvement.overall.toFixed(4) + " mL (" + improvement.percentOverall.toFixed(1) + "%)",
    standardChannels: improvement.standardChannels.toFixed(4) + " mL (" + improvement.percentStandardChannels.toFixed(1) + "%)",
    specialLayers: improvement.specialLayers.toFixed(4) + " mL (" + improvement.percentSpecialLayers.toFixed(1) + "%)"
  });
  
  console.log("[CALIBRATION-DEBUG] Calibration complete using four-phase process from PRD");
  
  // Calculate final overall error
  const finalOverallError = calculateOverallError(specialLayerEntries, optimizedFactors);
  const finalSpecialLayersChannelErrors: Record<string, number> = {};
  const finalSpecialLayersByChannel: Record<string, number> = {};
  
  // Calculate channel-specific errors
  specialLayers.forEach(channel => {
    const channelEntries = specialLayerEntries.filter(entry => 
      entry.channel_ml[channel] !== undefined && entry.channel_ml[channel] > 0
    );
    
    if (channelEntries.length > 0) {
      finalSpecialLayersChannelErrors[channel] = calculateChannelError(channelEntries, channel, optimizedFactors);
      finalSpecialLayersByChannel[channel] = finalSpecialLayersChannelErrors[channel];
    }
  });
  
  // Calculate final special layers error (average of all special layer channels)
  const computedSpecialLayersError = specialLayerEntries
    .filter(entry => finalSpecialLayersChannelErrors[Object.keys(finalSpecialLayersChannelErrors)[0]] !== undefined)
    .reduce((sum, entry) => sum + finalSpecialLayersChannelErrors[Object.keys(finalSpecialLayersChannelErrors)[0]], 0) / 
    specialLayerEntries.filter(entry => finalSpecialLayersChannelErrors[Object.keys(finalSpecialLayersChannelErrors)[0]] !== undefined).length;

  // Calculate improvements
  const overallImprovement = initialOverallError - finalOverallError;
  const specialLayersImprovement = initialSpecialLayersError - computedSpecialLayersError;
  
  // Return the final result object
  return {
    factors: optimizedFactors,
    errors: {
      initial: {
        overall: initialOverallError,
        standardChannels: 0, // Not relevant for special layer optimization
        specialLayers: initialSpecialLayersError,
        byChannel: initialChannelErrors
      },
      final: {
        overall: finalOverallError,
        standardChannels: 0, // Not relevant for special layer optimization
        specialLayers: computedSpecialLayersError,
        byChannel: finalSpecialLayersChannelErrors,
        singleColorChannels: {},
        specialLayersByChannel: finalSpecialLayersByChannel
      },
      improvement: {
        overall: overallImprovement,
        standardChannels: 0,
        specialLayers: specialLayersImprovement,
        percentOverall: (overallImprovement / initialOverallError) * 100,
        percentStandardChannels: 0,
        percentSpecialLayers: (specialLayersImprovement / initialSpecialLayersError) * 100
      }
    }
  };
}

/**
 * Calculate overall mean absolute error (MAE) across all channels in the test entries
 */
function calculateOverallError(testEntries: TestDataEntry[], factors: CalibrationFactors): number {
  const channelSamples: Record<string, number> = {};
  const channelErrors: Record<string, number> = {};
  let totalError = 0;
  let totalSamples = 0;
  
  // Calculate errors for each channel
  testEntries.forEach(entry => {
    Object.entries(entry.channel_ml).forEach(([channel, actual]) => {
      if (actual === 0) return; // Skip channels with zero usage
      
      // Calculate estimated usage for this entry and channel
      const estimated = estimateChannelUsage(entry, channel, { 
        channelScalingFactor: factors.channelScalingFactors[channel]
      });
      
      // Calculate absolute error
      const error = Math.abs(estimated - actual);
      
      // Accumulate error
      if (!channelErrors[channel]) {
        channelErrors[channel] = 0;
        channelSamples[channel] = 0;
      }
      
      channelErrors[channel] += error;
      channelSamples[channel]++;
      totalError += error;
      totalSamples++;
    });
  });
  
  // Return MAE if we have samples, otherwise 0
  return totalSamples > 0 ? totalError / totalSamples : 0;
}