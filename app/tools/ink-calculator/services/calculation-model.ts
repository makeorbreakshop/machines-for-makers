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
}

// Cache for the calculation model
let calculationModelCache: Record<string, CalculationFactors> = {};

/**
 * Fetches test data and builds a calculation model
 */
export async function buildCalculationModel(): Promise<Record<string, CalculationFactors>> {
  // If we have a cached model, return it
  if (Object.keys(calculationModelCache).length > 0) {
    return calculationModelCache;
  }
  
  try {
    // Fetch all test data
    const response = await fetch('/api/ink-test-data');
    if (!response.ok) {
      throw new Error('Failed to fetch test data');
    }
    
    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid test data format');
    }
    
    // Build calculation model
    const model = buildModelFromTestData(data);
    
    // Cache the model
    calculationModelCache = model;
    
    return model;
  } catch (error) {
    console.error('Error building calculation model:', error);
    // Return a fallback model
    return getFallbackModel();
  }
}

/**
 * Transforms test data into a calculation model
 */
function buildModelFromTestData(testData: InkTestData[]): Record<string, CalculationFactors> {
  const model: Record<string, CalculationFactors> = {};
  
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
    // Get standard quality data for baseline
    const standardQualityData = items.filter(item => item.quality === 'standard');
    
    // Calculate base coverage mL values from photo type (mixed coverage)
    const photoTypeData = standardQualityData.find(item => item.image_type === 'photo');
    const baseChannelMl = photoTypeData ? photoTypeData.channel_ml : {};
    
    // Calculate quality multipliers
    const qualityMultipliers = calculateQualityMultipliers(items);
    
    // Calculate size factor (mL per square inch/mm)
    const sizeFactor = calculateSizeFactor(standardQualityData);
    
    model[inkMode] = {
      baseCoverageMl: baseChannelMl,
      qualityMultipliers,
      sizeFactor
    };
  });
  
  return model;
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
  
  // Find a consistent test image across qualities
  const photoTestData = testData.filter(item => item.image_type === 'photo');
  
  if (photoTestData.length > 0) {
    // Group by quality
    const byQuality = photoTestData.reduce((acc, item) => {
      acc[item.quality] = item;
      return acc;
    }, {} as Record<string, InkTestData>);
    
    // If we have data for multiple qualities, calculate real multipliers
    if (byQuality.standard && (byQuality.draft || byQuality.high)) {
      const standardTotal = Object.values(byQuality.standard.channel_ml).reduce((sum, val) => sum + val, 0);
      
      if (byQuality.draft) {
        const draftTotal = Object.values(byQuality.draft.channel_ml).reduce((sum, val) => sum + val, 0);
        multipliers.draft = standardTotal > 0 ? draftTotal / standardTotal : 0.5;
      }
      
      if (byQuality.high) {
        const highTotal = Object.values(byQuality.high.channel_ml).reduce((sum, val) => sum + val, 0);
        multipliers.high = standardTotal > 0 ? highTotal / standardTotal : 1.5;
      }
    }
  }
  
  return multipliers;
}

/**
 * Calculates size factor from test data (mL per square inch/mm)
 */
function calculateSizeFactor(testData: InkTestData[]): number {
  // Default size factor (conservative estimate)
  const defaultFactor = 0.01; // 0.01 mL per square inch
  
  // Find photo test data with standard quality
  const photoData = testData.filter(item => 
    item.image_type === 'photo' && item.quality === 'standard'
  );
  
  if (photoData.length === 0) {
    return defaultFactor;
  }
  
  // Calculate the average size factor across all available data points
  const factors = photoData.map(item => {
    const totalMl = Object.values(item.channel_ml).reduce((sum, val) => sum + val, 0);
    const width = item.dimensions.width;
    const height = item.dimensions.height;
    
    // Convert dimensions to square inches if needed
    const area = item.dimensions.unit === 'mm' 
      ? (width * height) / 645.16 // Convert from sq mm to sq in
      : width * height;
      
    return area > 0 ? totalMl / area : defaultFactor;
  });
  
  // Average the factors, filtering out zeros
  const validFactors = factors.filter(f => f > 0);
  const avgFactor = validFactors.length > 0 
    ? validFactors.reduce((sum, val) => sum + val, 0) / validFactors.length 
    : defaultFactor;
    
  return avgFactor;
}

/**
 * Get a fallback model if test data is unavailable
 */
function getFallbackModel(): Record<string, CalculationFactors> {
  return {
    "CMYK": {
      baseCoverageMl: {
        cyan: 0.07,
        magenta: 0.2,
        yellow: 0.07,
        black: 0.04
      },
      qualityMultipliers: {
        draft: 0.5,
        standard: 1.0,
        high: 1.5
      },
      sizeFactor: 0.01
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
  calculationModel: Record<string, CalculationFactors>
): Record<string, number> {
  // Get the calculation factors for the ink mode
  const factors = calculationModel[inkMode] || getFallbackModel().CMYK;
  
  // Calculate area in square inches
  const area = dimensions.unit === 'mm'
    ? (dimensions.width * dimensions.height) / 645.16 // Convert from sq mm to sq in
    : dimensions.width * dimensions.height;
  
  // Get quality multiplier
  const qualityMultiplier = factors.qualityMultipliers[quality] || 1.0;
  
  // Calculate base ink usage per channel
  const estimatedUsage: Record<string, number> = {};
  
  // Apply the calculation to each channel
  Object.entries(factors.baseCoverageMl).forEach(([channel, baseMl]) => {
    // Calculate using the formula: base_ml × area × quality_multiplier × coverage_factor
    const coverageFactor = coveragePercent / 50; // Normalize to 50% baseline
    estimatedUsage[channel] = baseMl * area * qualityMultiplier * coverageFactor;
    
    // Round to 2 decimal places
    estimatedUsage[channel] = Math.round(estimatedUsage[channel] * 100) / 100;
  });
  
  return estimatedUsage;
} 