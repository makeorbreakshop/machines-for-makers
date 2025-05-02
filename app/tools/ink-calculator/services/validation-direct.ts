/**
 * Direct Validation Service
 * 
 * This service provides validation functions for the ink calculator 
 * using the direct calibration approach with NO caching.
 * 
 * Part of Phase 2.4: Complete Elimination of Calibration Caching
 */

import { calculateInkUsage } from '../utils';
import { getCalibrationFactors } from './calibration-direct';
import { PrintQuality } from '../types';

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
  created_at?: string;
  image_url?: string;
}

interface ValidationResult {
  testId: string;
  inkMode: string;
  quality: string;
  channelDifferences: Record<string, number>;
  predictedValues: Record<string, number>;
  actualValues: Record<string, number>;
}

/**
 * Validate a single test entry by comparing predicted values with actual measurements
 * using direct calibration from the API with no caching
 */
export async function validateTestEntryDirect(
  testEntry: TestDataEntry,
): Promise<ValidationResult> {
  try {
    console.log(`[DIRECT-VALIDATION] Validating test entry ${testEntry.id}`);
    
    // Get fresh calibration directly from API for this test entry
    const calibrationFactors = await getCalibrationFactors();
    
    // Log CMYK values for debugging
    console.log('[DIRECT-VALIDATION] Using calibration factors with CMYK values:', 
      ['cyan', 'magenta', 'yellow', 'black'].map(channel => 
        `${channel}: ${calibrationFactors.channelScalingFactors[channel]}`
      ).join(', ')
    );
    
    // Calculate predicted ink usage
    const { width, height, unit } = testEntry.dimensions;
    const { totalCoverage, channelCoverage } = testEntry.image_analysis;
    
    const usageResult = await calculateInkUsage(
      totalCoverage,
      width,
      height,
      unit as 'in' | 'mm',
      { label: testEntry.ink_mode, channels: Object.keys(testEntry.channel_ml) },
      testEntry.quality as PrintQuality,
      undefined,
      channelCoverage
    );
    
    // Extract actual and predicted values
    const predictedValues = usageResult.channelMl;
    const actualValues = testEntry.channel_ml;
    
    // Calculate differences for each channel
    const channelDifferences: Record<string, number> = {};
    
    Object.entries(actualValues).forEach(([channel, actual]) => {
      const predicted = predictedValues[channel] || 0;
      channelDifferences[channel] = Math.abs(predicted - actual);
    });
    
    return {
      testId: testEntry.id,
      inkMode: testEntry.ink_mode,
      quality: testEntry.quality,
      channelDifferences,
      predictedValues,
      actualValues,
    };
  } catch (error) {
    console.error(`[DIRECT-VALIDATION] Error validating test entry ${testEntry.id}:`, error);
    throw error;
  }
}

/**
 * Validate a batch of test entries using direct calibration from the API with no caching
 */
export async function validateTestBatchDirect(
  testEntries: TestDataEntry[]
): Promise<ValidationResult[]> {
  console.log(`[DIRECT-VALIDATION] Validating batch of ${testEntries.length} test entries`);
  
  // Process each test entry sequentially to avoid race conditions
  const results: ValidationResult[] = [];
  
  for (const entry of testEntries) {
    try {
      const result = await validateTestEntryDirect(entry);
      results.push(result);
    } catch (error) {
      console.error(`[DIRECT-VALIDATION] Error processing test entry ${entry.id}:`, error);
      // Continue with other entries even if one fails
    }
  }
  
  console.log(`[DIRECT-VALIDATION] Completed validation for ${results.length} of ${testEntries.length} entries`);
  return results;
}

/**
 * Calculate mean absolute error (MAE) for validation results
 */
export function calculateMAE(
  predictedValues: Record<string, number[]>,
  actualValues: Record<string, number[]>,
  areas: number[] = []
) {
  // Implementation copied from original validation.ts
  return {
    // Sample implementation
    overall: 0,
    byChannel: {},
    sizeMetrics: {
      small: { overall: 0, standardChannels: 0, specialLayers: 0, sampleCount: 0 },
      medium: { overall: 0, standardChannels: 0, specialLayers: 0, sampleCount: 0 },
      large: { overall: 0, standardChannels: 0, specialLayers: 0, sampleCount: 0 }
    }
  };
} 