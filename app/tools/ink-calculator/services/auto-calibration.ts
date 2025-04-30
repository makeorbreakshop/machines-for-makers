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
  AREA_SCALING_MULTIPLIERS
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
}

interface CalibrationResult {
  factors: CalibrationFactors;
  accuracy: {
    before: {
      averageError: number;
      channelErrors: Record<string, number>;
    };
    after: {
      averageError: number;
      channelErrors: Record<string, number>;
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
 * Find the optimal value for a calibration factor using binary search
 * with volume-specific optimization strategies
 */
function optimizeFactor(
  testEntries: TestDataEntry[],
  channel: string,
  currentValue: number,
  evaluateError: (factor: number) => number,
  min = currentValue * 0.1,
  max = currentValue * 10,
  iterations = 10
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
  
  // Prioritize volume categories based on availability and importance
  let optimizationPriority = 'balanced';
  
  if (hasLargeVolumes && !hasSmallVolumes) {
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
      
      // Apply volume-specific adjustments to the error evaluation
      if (optimizationPriority === 'large') {
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
        
        // Weight distribution depends on what data we have
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
    
    // Calculate the predicted value using the current factor
    const predicted = estimateChannelUsage(entry, channel, { channelScalingFactor: factor });
    
    // Calculate error using absolute difference (MAE) instead of percentage error
    // This provides more consistent optimization across different volume scales
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
  
  const dimensions = entry.dimensions;
  const quality = entry.quality as PrintQuality;
  
  // Normalize dimensions to get area in square inches
  const normalizedDimensions = normalizeSize(
    dimensions.width, 
    dimensions.height, 
    dimensions.unit as 'in' | 'mm'
  );
  const area = normalizedDimensions.width * normalizedDimensions.height;
  
  // Get channel coverage
  let channelCoverage = entry.image_analysis.totalCoverage / 100;
  if (entry.image_analysis.channelCoverage && 
      entry.image_analysis.channelCoverage[channel] !== undefined) {
    channelCoverage = entry.image_analysis.channelCoverage[channel] / 100;
  }
  
  // Get base consumption
  const baseValue = BASE_CONSUMPTION[channel] || 0;
  
  // Get scaling factors
  const channelFactor = options.channelScalingFactor !== undefined 
    ? options.channelScalingFactor 
    : CHANNEL_SCALING_FACTORS[channel] || 0.0001;
    
  const qualityFactor = QUALITY_CHANNEL_MULTIPLIERS[quality][channel] || 1.0;
  
  // Get area scaling
  let areaScalingMultiplier = 1.0;
  if (area < AREA_SCALING_THRESHOLDS.small) {
    areaScalingMultiplier = AREA_SCALING_MULTIPLIERS.small;
  } else if (area < AREA_SCALING_THRESHOLDS.medium) {
    areaScalingMultiplier = AREA_SCALING_MULTIPLIERS.medium;
  } else if (area < AREA_SCALING_THRESHOLDS.large) {
    areaScalingMultiplier = AREA_SCALING_MULTIPLIERS.large;
  } else {
    areaScalingMultiplier = AREA_SCALING_MULTIPLIERS.xlarge;
  }
  
  // Calculate ink usage using formula
  const coveragePercentage = channelCoverage * 100;
  const coverageComponent = coveragePercentage * area * channelFactor * qualityFactor * areaScalingMultiplier;
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
    
    const dimensions = entry.dimensions;
    const quality = entry.quality as PrintQuality;
    
    // Normalize channel coverage
    const normalizedChannelCoverage: Record<string, number> = {};
    if (entry.image_analysis.channelCoverage) {
      Object.entries(entry.image_analysis.channelCoverage).forEach(([ch, coverage]) => {
        normalizedChannelCoverage[ch] = coverage / 100;
      });
    }
    
    // Calculate predicted values with current factors
    const area = normalizeSize(dimensions.width, dimensions.height, dimensions.unit as 'in' | 'mm').width *
                normalizeSize(dimensions.width, dimensions.height, dimensions.unit as 'in' | 'mm').height;
    
    // Get base consumption and scaling factor
    const baseValue = factors.baseConsumption[channel] || 0;
    const channelFactor = factors.channelScalingFactors[channel] || 0.0001;
    const qualityFactor = factors.qualityChannelMultipliers[quality][channel] || 1.0;
    
    // Determine area scaling
    let areaScalingMultiplier = 1.0;
    if (area < AREA_SCALING_THRESHOLDS.small) {
      areaScalingMultiplier = factors.areaScalingMultipliers.small;
    } else if (area < AREA_SCALING_THRESHOLDS.medium) {
      areaScalingMultiplier = factors.areaScalingMultipliers.medium;
    } else if (area < AREA_SCALING_THRESHOLDS.large) {
      areaScalingMultiplier = factors.areaScalingMultipliers.large;
    } else {
      areaScalingMultiplier = factors.areaScalingMultipliers.xlarge;
    }
    
    // Calculate coverage
    let channelCoverageValue = entry.image_analysis.totalCoverage / 100;
    if (normalizedChannelCoverage[channel] !== undefined) {
      channelCoverageValue = normalizedChannelCoverage[channel];
    }
    
    // Calculate ml using formula
    const coveragePercentage = channelCoverageValue * 100;
    const coverageComponent = coveragePercentage * area * channelFactor * qualityFactor * areaScalingMultiplier;
    const predictedMl = baseValue + coverageComponent;
    
    // Calculate error using MAE instead of percentage
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
 * Calibrate all factors based on test data
 */
export function calibrateFactors(testEntries: TestDataEntry[]): CalibrationResult {
  console.log("[CALIBRATION-DEBUG] Starting calibration with", testEntries.length, "test entries");
  
  // Start with current factors
  const initialFactors: CalibrationFactors = {
    baseConsumption: { ...BASE_CONSUMPTION },
    channelScalingFactors: { ...CHANNEL_SCALING_FACTORS },
    qualityChannelMultipliers: { 
      draft: { ...QUALITY_CHANNEL_MULTIPLIERS.draft },
      standard: { ...QUALITY_CHANNEL_MULTIPLIERS.standard },
      high: { ...QUALITY_CHANNEL_MULTIPLIERS.high }
    },
    areaScalingMultipliers: { ...AREA_SCALING_MULTIPLIERS }
  };

  console.log("[CALIBRATION-DEBUG] Initial factors:", initialFactors);
  
  // Calculate initial error rates
  const initialChannelErrors: Record<string, number> = {};
  let initialTotalError = 0;
  let channelCount = 0;
  
  // Track all unique channels in test data
  const allChannels = new Set<string>();
  testEntries.forEach(entry => {
    Object.keys(entry.channel_ml).forEach(channel => allChannels.add(channel));
  });
  
  // Calculate initial errors
  allChannels.forEach(channel => {
    const error = calculateChannelError(testEntries, channel, initialFactors);
    if (error > 0) {
      initialChannelErrors[channel] = Number(error.toFixed(2));
      initialTotalError += error;
      channelCount++;
    }
  });
  
  const initialAverageError = channelCount > 0 
    ? Number((initialTotalError / channelCount).toFixed(2)) 
    : 0;
  
  // Clone the factors for optimization
  const optimizedFactors: CalibrationFactors = {
    baseConsumption: { ...initialFactors.baseConsumption },
    channelScalingFactors: { ...initialFactors.channelScalingFactors },
    qualityChannelMultipliers: {
      draft: { ...initialFactors.qualityChannelMultipliers.draft },
      standard: { ...initialFactors.qualityChannelMultipliers.standard },
      high: { ...initialFactors.qualityChannelMultipliers.high }
    },
    areaScalingMultipliers: { ...initialFactors.areaScalingMultipliers }
  };
  
  // Optimize base consumption values
  allChannels.forEach(channel => {
    const currentBase = optimizedFactors.baseConsumption[channel] || 0;
    
    // Skip if we don't have enough data or current value is 0
    if (currentBase === 0) return;
    
    const optimizedBase = optimizeFactor(
      testEntries,
      channel,
      currentBase,
      (factor) => evaluateBaseConsumptionError(testEntries, channel, optimizedFactors, factor),
      0.001, // min
      0.1,   // max
      8      // iterations
    );
    
    optimizedFactors.baseConsumption[channel] = optimizedBase;
  });
  
  // Optimize channel scaling factors
  allChannels.forEach(channel => {
    const currentFactor = optimizedFactors.channelScalingFactors[channel] || 0.0001;
    
    const optimizedFactor = optimizeFactor(
      testEntries,
      channel,
      currentFactor,
      (factor) => evaluateChannelScalingError(testEntries, channel, optimizedFactors, factor),
      0.00001, // min
      0.001,   // max
      8        // iterations
    );
    
    optimizedFactors.channelScalingFactors[channel] = optimizedFactor;
  });
  
  // Optimize quality multipliers
  const qualities: PrintQuality[] = ['draft', 'standard', 'high'];
  
  qualities.forEach(quality => {
    // Only process if we have test data for this quality
    const qualityEntries = testEntries.filter(entry => entry.quality === quality);
    if (qualityEntries.length < 2) return;
    
    allChannels.forEach(channel => {
      const currentMultiplier = optimizedFactors.qualityChannelMultipliers[quality][channel] || 1.0;
      
      const optimizedMultiplier = optimizeFactor(
        qualityEntries,
        channel,
        currentMultiplier,
        (factor) => evaluateQualityMultiplierError(testEntries, channel, quality, optimizedFactors, factor),
        0.5,  // min
        2.0,  // max
        6     // iterations
      );
      
      // Ensure quality multipliers exist for this channel
      if (!optimizedFactors.qualityChannelMultipliers[quality][channel]) {
        optimizedFactors.qualityChannelMultipliers[quality][channel] = 1.0;
      }
      
      optimizedFactors.qualityChannelMultipliers[quality][channel] = optimizedMultiplier;
    });
  });
  
  // Calculate final error rates
  const finalChannelErrors: Record<string, number> = {};
  let finalTotalError = 0;
  channelCount = 0;
  
  allChannels.forEach(channel => {
    const error = calculateChannelError(testEntries, channel, optimizedFactors);
    if (error > 0) {
      finalChannelErrors[channel] = Number(error.toFixed(2));
      finalTotalError += error;
      channelCount++;
    }
  });
  
  const finalAverageError = channelCount > 0 
    ? Number((finalTotalError / channelCount).toFixed(2)) 
    : 0;
  
  // When preparing final result
  console.log("[CALIBRATION-DEBUG] Calibration complete. Before MAE:", initialAverageError.toFixed(4), "mL, After MAE:", finalAverageError.toFixed(4), "mL");
  console.log("[CALIBRATION-DEBUG] Optimized factors:", optimizedFactors);
  
  return {
    factors: optimizedFactors,
    accuracy: {
      before: {
        averageError: initialAverageError,
        channelErrors: initialChannelErrors
      },
      after: {
        averageError: finalAverageError,
        channelErrors: finalChannelErrors
      }
    }
  };
}

/**
 * Save calibrated factors to database or local storage
 */
export async function saveCalibrationFactors(factors: CalibrationFactors): Promise<boolean> {
  console.log("[CALIBRATION-DEBUG] Saving calibration factors to API");
  try {
    // Save to API endpoint
    const response = await fetch('/api/admin/ink-calculator/calibration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(factors)
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