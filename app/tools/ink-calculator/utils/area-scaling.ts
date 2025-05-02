/**
 * Area Scaling Utilities
 * 
 * This file contains shared area scaling functions used across the ink calculator.
 * All code that performs area scaling calculations should use these functions
 * to ensure consistency between the calculator and validation.
 */

/**
 * Calculate area scaling multiplier based on logarithmic curve
 * Uses an increasing function that scales properly for square inch calculations
 * 
 * @param area Area in square inches
 * @returns Scaling multiplier for the given area
 */
export function calculateAreaScalingMultiplier(area: number): number {
  // Increasing function to properly scale larger prints
  return 1.0 + (0.25 * Math.log10(1 + area/100));
}

/**
 * Get the appropriate size classification for the given area
 * Used for special layer calculations and reporting
 * 
 * @param area Area in square inches
 * @returns Size classification as 'small', 'medium', or 'large'
 */
export function getSizeClassification(area: number): 'small' | 'medium' | 'large' {
  if (area < 4) {
    return 'small';     // Less than 4 sq inches (~50mm square)
  } else if (area <= 100) {
    return 'medium';    // Between 4-100 sq inches (~50-250mm square)
  } else {
    return 'large';     // Over 100 sq inches (>250mm square)
  }
} 