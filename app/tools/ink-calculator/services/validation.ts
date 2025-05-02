/**
 * Validation Service
 * 
 * This service is used to validate the ink calculator results against known test data.
 * It uses Mean Absolute Error (MAE) for accuracy measurement.
 */

import { ChannelMlValues, InkMode, PrintQuality } from "../types";
import { calculateInkUsage } from "../utils";
import { INK_MODES } from "../config";

interface ValidationResult {
  testId: string;
  inkMode: string;
  quality: PrintQuality;
  channelDifferences: Record<string, number>; // Absolute difference (in mL) per channel
  predictedValues: ChannelMlValues;           // Calculated mL values
  actualValues: ChannelMlValues;              // Test data mL values
}

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

/**
 * Calculate error percentage between predicted and actual values
 * This is used for historical compatibility, but MAE is preferred for accuracy assessment
 */
export function calculateErrorPercentage(predicted: number, actual: number): { 
  percentage: number; 
  capped: number;
  absoluteDifference: number;
} {
  // Calculate absolute difference first (this is what MAE uses)
  const absoluteDifference = Math.abs(predicted - actual);
  
  // Only calculate percentage if actual is non-zero to avoid division by zero
  if (actual === 0) {
    if (predicted === 0) {
      return { percentage: 0, capped: 0, absoluteDifference: 0 };
    }
    // If actual is 0 but predicted is not, use a high error value
    return { percentage: 100, capped: 100, absoluteDifference };
  }
  
  // Calculate percentage error
  const percentage = Math.abs((predicted - actual) / actual) * 100;
  
  // Cap the percentage error for optimization purposes
  // This prevents extreme values from dominating the optimization
  const capped = Math.min(percentage, 100);
  
  return { percentage, capped, absoluteDifference };
}

/**
 * Calculate Mean Absolute Error between predicted and actual values
 * This is simply |predicted - actual| in mL
 */
export function calculateAbsoluteDifference(predicted: number, actual: number): number {
  return Math.abs(predicted - actual);
}

/**
 * Validate test data against the calculator
 */
export async function validateTestEntry(
  testEntry: TestDataEntry, 
  calibrationFactors?: any
): Promise<ValidationResult> {
  console.log("[VALIDATION-DEBUG] Validating test entry:", testEntry.id);
  console.log("[VALIDATION-DEBUG] Using enhanced non-linear model for validation");
  
  const { id, ink_mode, quality, dimensions, channel_ml, image_analysis } = testEntry;
  
  // Calculate predicted values using the ink calculator
  const coverageValues: Record<string, number> = {};
  if (image_analysis?.channelCoverage) {
    Object.keys(image_analysis.channelCoverage).forEach(channel => {
      coverageValues[channel] = image_analysis.channelCoverage[channel];
    });
  }
  
  // Look up the proper ink mode object from INK_MODES using the ink_mode string
  const inkModeObj = INK_MODES[ink_mode];
  
  if (!inkModeObj) {
    console.error(`[VALIDATION-ERROR] Unknown ink mode: ${ink_mode}`);
    return {
      testId: id,
      inkMode: ink_mode,
      quality: quality as PrintQuality,
      channelDifferences: {},
      predictedValues: {},
      actualValues: channel_ml
    };
  }
  
  const calculationInput = {
    // Use raw coverage values - no conversion to 0-1 range needed
    coverage: image_analysis?.totalCoverage || 0,
    width: dimensions.width,
    height: dimensions.height, 
    unit: dimensions.unit as ('in' | 'mm'),
    inkMode: inkModeObj, // Use the actual InkMode object, not just the string
    quality: quality as PrintQuality,
    channelCoverage: coverageValues
  };
  
  console.log("[VALIDATION-DEBUG] Calculation input:", calculationInput);
  
  // NOTE: The calibration factors are expected to be already loaded by the time this function is called
  // We no longer try to reload them here, as it would cause timing/async issues
  
  // Calculate predicted values with the enhanced non-linear model
  // Pass all values directly without any normalization
  const predictedValues = await calculateInkUsage(
    calculationInput.coverage,
    calculationInput.width,
    calculationInput.height,
    calculationInput.unit,
    calculationInput.inkMode,
    calculationInput.quality,
    calibrationFactors,
    calculationInput.channelCoverage
  );
  
  // Extract the channelMl values which is what we need to compare
  const predictedChannelMl = predictedValues.channelMl;
  
  console.log("[VALIDATION-DEBUG] Predicted values:", predictedChannelMl);
  
  // Calculate differences between predicted and actual values
  // Using absolute difference (MAE) rather than percentage
  const channelDifferences: Record<string, number> = {};
  
  // Compare only channels that exist in both predicted and actual values
  Object.keys(channel_ml).forEach(channel => {
    if (predictedChannelMl[channel] !== undefined) {
      // Calculate MAE (absolute difference)
      channelDifferences[channel] = calculateAbsoluteDifference(
        predictedChannelMl[channel],
        channel_ml[channel]
      );
    }
  });
  
  return {
    testId: id,
    inkMode: ink_mode,
    quality: quality as PrintQuality,
    channelDifferences, // These are now absolute differences (MAE)
    predictedValues: predictedChannelMl,
    actualValues: channel_ml
  };
}

/**
 * Validate a batch of test data
 */
export async function validateTestBatch(
  testEntries: TestDataEntry[],
  calibrationFactors?: any
): Promise<ValidationResult[]> {
  console.log("[VALIDATION-DEBUG] Validating batch of", testEntries.length, "test entries");
  
  // Pass calibrationFactors to each validateTestEntry call if provided
  const results = await Promise.all(
    testEntries.map(entry => validateTestEntry(entry, calibrationFactors))
  );
  console.log("[VALIDATION-DEBUG] Batch validation complete");
  
  return results;
}

/**
 * Calculate MAE (Mean Absolute Error) between predicted and actual values
 * This now separates standard CMYK channels from special layers for more accurate analysis
 * Also includes size-stratified metrics as specified in the PRD
 */
export function calculateMAE(
  predictions: Record<string, number[]>,
  actuals: Record<string, number[]>,
  areas?: number[] // Optional array of print areas corresponding to each test entry
): {
  overall: number;
  channelMAE: Record<string, number>;
  channelSampleCounts: Record<string, number>;
  sampleCount: number;
  standardChannelsMAE: number;
  specialLayersMAE: number;
  standardChannelsSampleCount: number;
  specialLayersSampleCount: number;
  // Add size-stratified metrics
  sizeMetrics?: {
    small: { overall: number; standardChannels: number; specialLayers: number; sampleCount: number; };
    medium: { overall: number; standardChannels: number; specialLayers: number; sampleCount: number; };
    large: { overall: number; standardChannels: number; specialLayers: number; sampleCount: number; };
  }
} {
  // Define which channels are special layers
  const specialLayers = new Set(['white', 'gloss', 'clear', 'primer']);
  
  let totalError = 0;
  let totalSamples = 0;
  let standardChannelsError = 0;
  let specialLayersError = 0;
  let standardChannelsSamples = 0;
  let specialLayersSamples = 0;
  
  const channelMAE: Record<string, number> = {};
  const channelSampleCounts: Record<string, number> = {};
  
  // Size-specific metrics
  const sizeErrors = {
    small: { error: 0, count: 0, standardError: 0, standardCount: 0, specialError: 0, specialCount: 0 },
    medium: { error: 0, count: 0, standardError: 0, standardCount: 0, specialError: 0, specialCount: 0 },
    large: { error: 0, count: 0, standardError: 0, standardCount: 0, specialError: 0, specialCount: 0 }
  };
  
  // Track index for matching areas to samples
  let sampleIndex = 0;
  
  // Calculate MAE for each channel
  Object.keys(actuals).forEach(channel => {
    const actualValues = actuals[channel];
    const predictedValues = predictions[channel] || [];
    
    // Only calculate if we have data for both
    if (actualValues.length > 0 && predictedValues.length > 0) {
      const samples = Math.min(actualValues.length, predictedValues.length);
      channelSampleCounts[channel] = samples;
      
      let channelError = 0;
      for (let i = 0; i < samples; i++) {
        // Calculate error
        const error = Math.abs(predictedValues[i] - actualValues[i]);
        channelError += error;
        totalError += error;
        
        // Get area category if available
        let sizeCategory: 'small' | 'medium' | 'large' | null = null;
        if (areas && areas[sampleIndex] !== undefined) {
          const area = areas[sampleIndex];
          if (area < 4) {
            sizeCategory = 'small';
          } else if (area <= 100) {
            sizeCategory = 'medium';
          } else {
            sizeCategory = 'large';
          }
        }
        
        // Categorize errors by channel type
        if (specialLayers.has(channel)) {
          specialLayersError += error;
          specialLayersSamples++;
          
          // Update size-specific metrics for special layers
          if (sizeCategory) {
            sizeErrors[sizeCategory].error += error;
            sizeErrors[sizeCategory].count++;
            sizeErrors[sizeCategory].specialError += error;
            sizeErrors[sizeCategory].specialCount++;
          }
        } else {
          standardChannelsError += error;
          standardChannelsSamples++;
          
          // Update size-specific metrics for standard channels
          if (sizeCategory) {
            sizeErrors[sizeCategory].error += error;
            sizeErrors[sizeCategory].count++;
            sizeErrors[sizeCategory].standardError += error;
            sizeErrors[sizeCategory].standardCount++;
          }
        }
        
        sampleIndex++;
      }
      
      totalSamples += samples;
      channelMAE[channel] = channelError / samples;
    }
  });
  
  // Calculate overall MAE
  const overallMAE = totalSamples > 0 ? totalError / totalSamples : 0;
  
  // Calculate separate MAE values for standard channels and special layers
  const standardChannelsMAE = standardChannelsSamples > 0 ? standardChannelsError / standardChannelsSamples : 0;
  const specialLayersMAE = specialLayersSamples > 0 ? specialLayersError / specialLayersSamples : 0;
  
  // Calculate size-specific metrics
  const sizeMetrics = {
    small: {
      overall: sizeErrors.small.count > 0 ? sizeErrors.small.error / sizeErrors.small.count : 0,
      standardChannels: sizeErrors.small.standardCount > 0 ? sizeErrors.small.standardError / sizeErrors.small.standardCount : 0,
      specialLayers: sizeErrors.small.specialCount > 0 ? sizeErrors.small.specialError / sizeErrors.small.specialCount : 0,
      sampleCount: sizeErrors.small.count
    },
    medium: {
      overall: sizeErrors.medium.count > 0 ? sizeErrors.medium.error / sizeErrors.medium.count : 0,
      standardChannels: sizeErrors.medium.standardCount > 0 ? sizeErrors.medium.standardError / sizeErrors.medium.standardCount : 0,
      specialLayers: sizeErrors.medium.specialCount > 0 ? sizeErrors.medium.specialError / sizeErrors.medium.specialCount : 0,
      sampleCount: sizeErrors.medium.count
    },
    large: {
      overall: sizeErrors.large.count > 0 ? sizeErrors.large.error / sizeErrors.large.count : 0,
      standardChannels: sizeErrors.large.standardCount > 0 ? sizeErrors.large.standardError / sizeErrors.large.standardCount : 0,
      specialLayers: sizeErrors.large.specialCount > 0 ? sizeErrors.large.specialError / sizeErrors.large.specialCount : 0,
      sampleCount: sizeErrors.large.count
    }
  };
  
  return {
    overall: overallMAE,
    channelMAE,
    channelSampleCounts,
    sampleCount: totalSamples,
    standardChannelsMAE,
    specialLayersMAE,
    standardChannelsSampleCount: standardChannelsSamples,
    specialLayersSampleCount: specialLayersSamples,
    sizeMetrics: areas ? sizeMetrics : undefined
  };
}

// Legacy function name for backward compatibility
export const calculateAccuracyStats = calculateMAE;

/**
 * Calculate MAE statistics from validation results
 * This is for backward compatibility with the admin validation page
 */
export function calculateMAEStats(validationResults: ValidationResult[]): any {
  // Extract the predicted and actual values from the validation results
  const predictedValues: Record<string, number[]> = {};
  const actualValues: Record<string, number[]> = {};
  
  // Collect all channels for separate analysis
  const allChannels = new Set<string>();
  validationResults.forEach(result => {
    Object.keys(result.actualValues).forEach(channel => {
      allChannels.add(channel);
    });
  });
  
  // Initialize arrays for each channel
  allChannels.forEach(channel => {
    predictedValues[channel] = [];
    actualValues[channel] = [];
  });
  
  // Populate with data
  validationResults.forEach(result => {
    Object.entries(result.actualValues).forEach(([channel, actual]) => {
      const predicted = result.predictedValues[channel] || 0;
      predictedValues[channel].push(predicted);
      actualValues[channel].push(actual);
    });
  });
  
  // Calculate statistics using our existing MAE function
  return calculateMAE(predictedValues, actualValues);
}

/**
 * Format validation results as JSON with detailed statistics
 * Enhanced with size-stratified metrics and separate special layer statistics
 */
export function formatValidationResults(
  validationResults: ValidationResult[],
  testEntries: TestDataEntry[]
): any {
  // Convert validation results to the format needed for overall stats
  const predictedValues: Record<string, number[]> = {};
  const actualValues: Record<string, number[]> = {};
  const areas: number[] = [];
  
  // Collect all channels for separate analysis
  const allChannels = new Set<string>();
  validationResults.forEach(result => {
    Object.keys(result.actualValues).forEach(channel => {
      allChannels.add(channel);
    });
  });
  
  // Initialize arrays for each channel
  allChannels.forEach(channel => {
    predictedValues[channel] = [];
    actualValues[channel] = [];
  });
  
  // Populate with data
  validationResults.forEach((result, index) => {
    // Get the test entry to extract area information
    const testEntry = testEntries[index];
    if (testEntry) {
      const normalizedDimensions = normalizeSize(
        testEntry.dimensions.width, 
        testEntry.dimensions.height, 
        testEntry.dimensions.unit as 'in' | 'mm'
      );
      const area = normalizedDimensions.width * normalizedDimensions.height;
      
      Object.entries(result.actualValues).forEach(([channel, actual]) => {
        const predicted = result.predictedValues[channel] || 0;
        predictedValues[channel].push(predicted);
        actualValues[channel].push(actual);
        areas.push(area);
      });
    }
  });
  
  // Calculate statistics using improved MAE calculation with area information
  const stats = calculateMAE(predictedValues, actualValues, areas);
  
  // Enhanced format with separate special layer statistics and size-stratified metrics
  return {
    testData: testEntries,
    validationResults,
    stats: {
      overallMAE: stats.overall,
      channelMAE: stats.channelMAE,
      sampleCount: stats.sampleCount,
      channelSampleCounts: stats.channelSampleCounts,
      standardChannels: {
        MAE: stats.standardChannelsMAE,
        sampleCount: stats.standardChannelsSampleCount
      },
      specialLayers: {
        MAE: stats.specialLayersMAE,
        sampleCount: stats.specialLayersSampleCount
      },
      sizeStratified: stats.sizeMetrics ? {
        small: {
          overall: stats.sizeMetrics.small.overall,
          standardChannels: stats.sizeMetrics.small.standardChannels,
          specialLayers: stats.sizeMetrics.small.specialLayers,
          sampleCount: stats.sizeMetrics.small.sampleCount
        },
        medium: {
          overall: stats.sizeMetrics.medium.overall,
          standardChannels: stats.sizeMetrics.medium.standardChannels,
          specialLayers: stats.sizeMetrics.medium.specialLayers,
          sampleCount: stats.sizeMetrics.medium.sampleCount
        },
        large: {
          overall: stats.sizeMetrics.large.overall,
          standardChannels: stats.sizeMetrics.large.standardChannels,
          specialLayers: stats.sizeMetrics.large.specialLayers,
          sampleCount: stats.sizeMetrics.large.sampleCount
        }
      } : undefined
    },
    timestamp: new Date().toISOString(),
    calibrationDate: testEntries.length > 0 ? (testEntries[0] as any).updated_at : null
  };
}

/**
 * Helper function to normalize dimensions for area calculation
 */
function normalizeSize(
  width: number,
  height: number,
  unit: 'in' | 'mm'
): { width: number; height: number } {
  if (unit === "mm") {
    return {
      width: width / 25.4,
      height: height / 25.4,
    };
  }
  return { width, height };
} 