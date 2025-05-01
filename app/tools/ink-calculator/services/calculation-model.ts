/**
 * DEPRECATED - This file is no longer used in the codebase.
 * 
 * The ink calculator now exclusively uses the calculateInkUsage() function from utils.ts
 * which pulls calibration data directly from the database.
 * 
 * This file is kept for reference purposes only and may be removed in a future cleanup.
 */

import { InkMode, PrintQuality, ImageType } from "../types";

// Types for test data
export interface InkTestData {
  id: string;
  ink_mode: string;
  quality: string;
  image_type: string;
  dimensions: {
    width: number;
    height: number;
    unit: 'in' | 'mm';
  };
  channel_ml: Record<string, number>;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalculationFactors {
  baseCoverageMl: Record<string, number>;
  qualityMultipliers: Record<string, number>;
  sizeFactor: number;
  lastUpdated: number; // Timestamp for cache invalidation
}

// Cache for the calculation model
let calculationModelCache: Record<string, CalculationFactors> = {};
let lastFetchTime = 0;

// Force refresh interval (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Fetches test data and builds a calculation model
 * @param forceRefresh Force refresh the model even if cache exists
 */
export async function buildCalculationModel(forceRefresh = false): Promise<Record<string, CalculationFactors>> {
  const now = Date.now();
  
  // Check if we have a valid cached model and aren't forcing refresh
  if (
    !forceRefresh && 
    Object.keys(calculationModelCache).length > 0 && 
    now - lastFetchTime < CACHE_TTL
  ) {
    console.log("DEBUG: Using cached calculation model");
    return calculationModelCache;
  }
  
  try {
    console.log("DEBUG: Fetching fresh test data for calculation model...");
    
    // Fetch all test data
    const response = await fetch('/api/ink-test-data?t=' + now); // Add timestamp to avoid caching
    if (!response.ok) {
      throw new Error('Failed to fetch test data');
    }
    
    const { data } = await response.json();
    console.log(`DEBUG: Received ${data?.length || 0} test data records from API`);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('DEBUG: No test data available, using fallback model');
      return getFallbackModel();
    }
    
    console.log(`DEBUG: Building model from ${data.length} test data points`);
    
    // Build calculation model
    const model = buildModelFromTestData(data);
    console.log('DEBUG: Built calculation model:', model);
    
    // Update cache and timestamp
    calculationModelCache = model;
    lastFetchTime = now;
    
    return model;
  } catch (error) {
    console.error('DEBUG: Error building calculation model:', error);
    // Return a fallback model
    console.log('DEBUG: Using fallback model due to error');
    return getFallbackModel();
  }
}

/**
 * Transforms test data into a calculation model
 */
function buildModelFromTestData(testData: InkTestData[]): Record<string, CalculationFactors> {
  const model: Record<string, CalculationFactors> = {};
  const now = Date.now();
  
  // Group test data by ink mode
  const testDataByInkMode = testData.reduce((acc, item) => {
    const key = item.ink_mode;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, InkTestData[]>);
  
  // Process each ink mode
  Object.entries(testDataByInkMode).forEach(([inkMode, items]) => {
    // Calculate the base ml per channel and per area for each image type
    const imageTypeChannelMl: Record<string, Record<string, number[]>> = {};
    
    // Initialize image type records
    ['photo', 'solid', 'gradient', 'line_art'].forEach(type => {
      imageTypeChannelMl[type] = {};
    });
    
    // Group data by image type and collect ml/area values for each channel
    items.forEach(item => {
      const imageType = item.image_type;
      if (!imageTypeChannelMl[imageType]) {
        imageTypeChannelMl[imageType] = {};
      }
      
      const area = calculateAreaInSqInches(item.dimensions);
      
      // Calculate ml per square inch for each channel
      Object.entries(item.channel_ml).forEach(([channel, ml]) => {
        if (!imageTypeChannelMl[imageType][channel]) {
          imageTypeChannelMl[imageType][channel] = [];
        }
        // Store ml per sq inch
        const mlPerSqInch = ml / area;
        imageTypeChannelMl[imageType][channel].push(mlPerSqInch);
      });
    });
    
    // Create base coverage values from the photo image type or fallback to any available type
    let baseChannelMl: Record<string, number> = {};
    const photoData = imageTypeChannelMl['photo'];
    
    if (Object.keys(photoData).length > 0) {
      // Calculate average ml/area for each channel from photo data
      Object.entries(photoData).forEach(([channel, mlValues]) => {
        if (mlValues.length > 0) {
          // Use median value to avoid outliers
          const sortedValues = [...mlValues].sort((a, b) => a - b);
          const median = sortedValues[Math.floor(sortedValues.length / 2)];
          baseChannelMl[channel] = median;
        }
      });
    } else {
      // If no photo data, use any available image type data
      for (const type of ['gradient', 'solid', 'line_art']) {
        if (Object.keys(imageTypeChannelMl[type]).length > 0) {
          Object.entries(imageTypeChannelMl[type]).forEach(([channel, mlValues]) => {
            if (mlValues.length > 0 && !baseChannelMl[channel]) {
              // Use median value
              const sortedValues = [...mlValues].sort((a, b) => a - b);
              const median = sortedValues[Math.floor(sortedValues.length / 2)];
              baseChannelMl[channel] = median;
            }
          });
        }
      }
    }
    
    // If we still don't have values, use fallback
    if (Object.keys(baseChannelMl).length === 0) {
      baseChannelMl = {
        cyan: 0.007,
        magenta: 0.02,
        yellow: 0.007,
        black: 0.004
      };
    }
    
    // Calculate quality multipliers
    const qualityMultipliers = calculateQualityMultipliers(items);
    
    // Calculate size scaling factor
    const sizeFactor = calculateSizeFactor(items);
    
    model[inkMode] = {
      baseCoverageMl: baseChannelMl,
      qualityMultipliers,
      sizeFactor,
      lastUpdated: now
    };
  });
  
  return model;
}

/**
 * Calculate area in square inches
 */
function calculateAreaInSqInches(dimensions: { width: number; height: number; unit: 'in' | 'mm' }): number {
  if (dimensions.unit === 'mm') {
    return (dimensions.width * dimensions.height) / 645.16; // Convert sq mm to sq in
  }
  return dimensions.width * dimensions.height;
}

/**
 * Calculates quality multipliers from test data
 */
function calculateQualityMultipliers(testData: InkTestData[]): Record<string, number> {
  const multipliers: Record<string, number> = {
    draft: 0.5,    // Default: 50% of standard
    standard: 1.0,  // Baseline
    high: 1.5      // Default: 150% of standard
  };
  
  // Group data by quality
  const byQuality: Record<string, InkTestData[]> = {
    draft: [],
    standard: [],
    high: []
  };
  
  testData.forEach(item => {
    if (byQuality[item.quality]) {
      byQuality[item.quality].push(item);
    }
  });
  
  // If we have standard quality data as baseline
  if (byQuality.standard.length > 0) {
    // Calculate average ml/area for standard quality
    const standardMlPerArea: Record<string, number[]> = {};
    
    byQuality.standard.forEach(item => {
      const area = calculateAreaInSqInches(item.dimensions);
      Object.entries(item.channel_ml).forEach(([channel, ml]) => {
        if (!standardMlPerArea[channel]) {
          standardMlPerArea[channel] = [];
        }
        standardMlPerArea[channel].push(ml / area);
      });
    });
    
    // Calculate average standard ml/area for each channel
    const standardAvg: Record<string, number> = {};
    Object.entries(standardMlPerArea).forEach(([channel, values]) => {
      if (values.length > 0) {
        standardAvg[channel] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });
    
    // If we have draft data, calculate multiplier
    if (byQuality.draft.length > 0) {
      const draftMlPerArea: Record<string, number[]> = {};
      
      byQuality.draft.forEach(item => {
        const area = calculateAreaInSqInches(item.dimensions);
        Object.entries(item.channel_ml).forEach(([channel, ml]) => {
          if (!draftMlPerArea[channel]) {
            draftMlPerArea[channel] = [];
          }
          draftMlPerArea[channel].push(ml / area);
        });
      });
      
      // Calculate draft multiplier for each channel
      const draftMultipliers: number[] = [];
      
      Object.entries(draftMlPerArea).forEach(([channel, values]) => {
        if (values.length > 0 && standardAvg[channel] > 0) {
          const draftAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
          draftMultipliers.push(draftAvg / standardAvg[channel]);
        }
      });
      
      // Use average of channel multipliers if we have data
      if (draftMultipliers.length > 0) {
        multipliers.draft = draftMultipliers.reduce((sum, val) => sum + val, 0) / draftMultipliers.length;
      }
    }
    
    // If we have high data, calculate multiplier
    if (byQuality.high.length > 0) {
      const highMlPerArea: Record<string, number[]> = {};
      
      byQuality.high.forEach(item => {
        const area = calculateAreaInSqInches(item.dimensions);
        Object.entries(item.channel_ml).forEach(([channel, ml]) => {
          if (!highMlPerArea[channel]) {
            highMlPerArea[channel] = [];
          }
          highMlPerArea[channel].push(ml / area);
        });
      });
      
      // Calculate high multiplier for each channel
      const highMultipliers: number[] = [];
      
      Object.entries(highMlPerArea).forEach(([channel, values]) => {
        if (values.length > 0 && standardAvg[channel] > 0) {
          const highAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
          highMultipliers.push(highAvg / standardAvg[channel]);
        }
      });
      
      // Use average of channel multipliers if we have data
      if (highMultipliers.length > 0) {
        multipliers.high = highMultipliers.reduce((sum, val) => sum + val, 0) / highMultipliers.length;
      }
    }
  }
  
  return multipliers;
}

/**
 * Calculates size scaling factor from test data
 */
function calculateSizeFactor(testData: InkTestData[]): number {
  // This is a base value, not really used directly anymore
  // since we're doing actual area-based calculations
  return 0.01;
}

/**
 * Get a fallback model if test data is unavailable
 */
function getFallbackModel(): Record<string, CalculationFactors> {
  return {
    "CMYK": {
      baseCoverageMl: {
        cyan: 0.007,
        magenta: 0.02,
        yellow: 0.007,
        black: 0.004
      },
      qualityMultipliers: {
        draft: 0.5,
        standard: 1.0,
        high: 1.5
      },
      sizeFactor: 0.01,
      lastUpdated: Date.now()
    }
  };
}

/**
 * Estimates ink usage based on the calculation model
 */
export function estimateInkUsage(
  inkMode: string,
  quality: PrintQuality,
  dimensions: { width: number, height: number, unit: 'in' | 'mm' },
  coveragePercent: number = 50, // Default to 50% coverage
  calculationModel: Record<string, CalculationFactors>,
  channelCoverageValues?: Record<string, number> // Optional channel-specific coverage values
): Record<string, number> {
  console.log('DEBUG: estimateInkUsage called with:', {
    inkMode,
    quality,
    dimensions,
    coveragePercent,
    channelCoverageValues
  });
  
  // Get the calculation factors for the ink mode
  const factors = calculationModel[inkMode] || getFallbackModel().CMYK;
  console.log('DEBUG: Using calculation factors:', factors);
  
  // Calculate area in square inches
  const area = calculateAreaInSqInches(dimensions);
  console.log('DEBUG: Calculated area in sq inches:', area);
  
  // Get quality multiplier
  const qualityMultiplier = factors.qualityMultipliers[quality] || 1.0;
  console.log('DEBUG: Quality multiplier for', quality, ':', qualityMultiplier);
  
  // Calculate base ink usage per channel
  const estimatedUsage: Record<string, number> = {};
  
  // Apply the direct calculation for each channel
  Object.entries(factors.baseCoverageMl).forEach(([channel, mlPerSqInch]) => {
    // Use channel-specific coverage if available, otherwise use the overall coverage
    const channelCoverage = channelCoverageValues?.[channel] ?? coveragePercent;
    
    // Coverage percent conversion: 0-100% to 0-1 scale
    // Adjusted to provide more accurate scaling based on test data
    const coverageFactor = Math.pow(channelCoverage / 100, 0.8); // Use a power curve for better fitting
    
    // Add a small base value to ensure minimum ink usage even with low coverage
    const baseValue = mlPerSqInch * 0.2; // Base value is 20% of the mlPerSqInch
    
    // Calculate ml based on the ml per sq inch from test data
    // Using improved formula that better matches test data patterns
    const calculatedMl = baseValue + ((mlPerSqInch - baseValue) * area * qualityMultiplier * coverageFactor);
    
    // Use full precision - no rounding
    estimatedUsage[channel] = calculatedMl;
    
    console.log('DEBUG: Channel', channel, 'calculation:', {
      mlPerSqInch,
      channelCoverage,
      coverageFactor,
      calculatedMl,
      finalMl: estimatedUsage[channel]
    });
  });
  
  console.log('DEBUG: Final estimated usage:', estimatedUsage);
  return estimatedUsage;
}

/**
 * Fetches test data from the API endpoint
 */
export async function fetchTestData(): Promise<InkTestData[]> {
  try {
    const response = await fetch('/api/ink-test-data?t=' + Date.now());
    if (!response.ok) {
      throw new Error('Failed to fetch test data');
    }
    
    const { data } = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching test data:', error);
    return [];
  }
}

/**
 * Updates the calculation model with the latest test data
 */
export async function refreshCalculationModel(): Promise<boolean> {
  try {
    // Clear the cache
    calculationModelCache = {};
    lastFetchTime = 0;
    
    // Rebuild the model with force refresh
    await buildCalculationModel(true);
    
    console.log('Calculation model refreshed with latest test data');
    return true;
  } catch (error) {
    console.error('Failed to refresh calculation model:', error);
    return false;
  }
} 