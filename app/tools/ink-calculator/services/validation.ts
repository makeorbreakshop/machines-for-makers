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
export async function validateTestEntry(testEntry: TestDataEntry): Promise<ValidationResult> {
  console.log("[VALIDATION-DEBUG] Validating test entry:", testEntry.id);
  
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
    coverage: image_analysis?.totalCoverage || 0,
    width: dimensions.width,
    height: dimensions.height, 
    unit: dimensions.unit as ('in' | 'mm'),
    inkMode: inkModeObj, // Use the actual InkMode object, not just the string
    quality: quality as PrintQuality,
    channelCoverage: coverageValues
  };
  
  console.log("[VALIDATION-DEBUG] Calculation input:", calculationInput);
  
  // Calculate predicted values
  const predictedValues = await calculateInkUsage(
    calculationInput.coverage,
    calculationInput.width,
    calculationInput.height,
    calculationInput.unit,
    calculationInput.inkMode,
    calculationInput.quality,
    undefined,
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
export async function validateTestBatch(testEntries: TestDataEntry[]): Promise<ValidationResult[]> {
  console.log("[VALIDATION-DEBUG] Validating batch of", testEntries.length, "test entries");
  
  const results = await Promise.all(testEntries.map(entry => validateTestEntry(entry)));
  console.log("[VALIDATION-DEBUG] Batch validation complete");
  
  return results;
}

/**
 * Calculate Mean Absolute Error (MAE) statistics from validation results
 */
export function calculateMAEStats(validationResults: ValidationResult[]): any {
  console.log("[VALIDATION-DEBUG] Calculating MAE stats from", validationResults.length, "results");
  
  if (!validationResults || validationResults.length === 0) {
    console.warn("[VALIDATION-WARNING] No validation results to calculate stats from");
    return {
      channelMAE: {},
      overallMAE: 0,
      sampleCount: 0
    };
  }
  
  // Group all absolute differences by channel
  const allDifferences: Record<string, number[]> = {};
  let totalValidResults = 0;
  
  // Collect all channel differences across all test entries
  validationResults.forEach(result => {
    Object.entries(result.channelDifferences).forEach(([channel, difference]) => {
      if (!allDifferences[channel]) {
        allDifferences[channel] = [];
      }
      
      allDifferences[channel].push(difference);
    });
    
    // Count valid test entries
    if (Object.keys(result.channelDifferences).length > 0) {
      totalValidResults++;
    }
  });
  
  // Calculate Mean Absolute Error (MAE) per channel
  const channelMAE: Record<string, number> = {};
  let totalMAE = 0;
  let totalChannelCount = 0;
  
  Object.entries(allDifferences).forEach(([channel, differences]) => {
    if (differences.length > 0) {
      // Calculate the mean of the absolute differences
      const sum = differences.reduce((acc, val) => acc + val, 0);
      const mae = sum / differences.length;
      
      channelMAE[channel] = parseFloat(mae.toFixed(4));
      totalMAE += mae;
      totalChannelCount++;
    }
  });
  
  // Calculate overall MAE across all channels
  const overallMAE = totalChannelCount > 0 ? parseFloat((totalMAE / totalChannelCount).toFixed(4)) : 0;
  
  return {
    channelMAE,        // MAE per channel
    overallMAE,        // Average MAE across all channels
    sampleCount: totalValidResults,   // Number of test entries used
    channelSampleCounts: Object.fromEntries(
      Object.entries(allDifferences).map(([channel, differences]) => [channel, differences.length])
    )
  };
}

// Legacy function name for backward compatibility
export const calculateAccuracyStats = calculateMAEStats; 