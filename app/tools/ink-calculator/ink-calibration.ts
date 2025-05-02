/**
 * Ink Calibration Data
 * 
 * This file contains calibration data for the UV printer ink calculator based on
 * analysis of test prints. The values are derived from comparing image analysis
 * with actual UVMake preview mL values.
 */

import { ChannelMlValues, PrintQuality } from "./types";

/**
 * Base consumption values per channel regardless of coverage
 * These values represent the minimum amount of ink used even with minimal coverage
 * Special layers use substantially higher base consumption (0.05-0.1 mL range)
 */
export const BASE_CONSUMPTION: Record<string, number> = {
  cyan: 0.020,    // Base cyan consumption in mL
  magenta: 0.018, // Base magenta consumption in mL
  yellow: 0.022,  // Base yellow consumption in mL
  black: 0.015,   // Base black consumption in mL
  white: 0.20,   // Base white consumption in mL - Increased from 0.075
  gloss: 0.22,    // Base gloss consumption in mL - Increased from 0.08
  clear: 0.065,   // Base clear consumption in mL - Increased to 0.065
  primer: 0.05,   // Base primer consumption in mL - Increased to 0.05
};

/**
 * Channel-specific scaling factors
 * These values adjust how coverage percentage translates to mL
 * Special layers use scaling factors at least 100× larger than CMYK
 */
export const CHANNEL_SCALING_FACTORS: Record<string, number> = {
  cyan: 0.002,    // mL per % coverage per square inch - Optimized value from auto-calibration
  magenta: 0.003, // mL per % coverage per square inch - Optimized value from auto-calibration
  yellow: 0.004,  // mL per % coverage per square inch - Optimized value from auto-calibration
  black: 0.0015,   // mL per % coverage per square inch - Optimized value from auto-calibration
  white: 0.20,     // mL per % coverage per square inch - Increased from 0.08
  gloss: 0.25,     // mL per % coverage per square inch - Increased from 0.12
  clear: 0.05,     // mL per % coverage per square inch - Increased to 0.05 (250x higher than CMYK average)
  primer: 0.04,    // mL per % coverage per square inch - Increased to 0.04 (200x higher than CMYK average)
};

/**
 * Area exponents for non-linear area scaling
 * Values less than 1 indicate diminishing returns as area increases
 * Special layers use area exponents very close to 1.0 for more linear behavior
 */
export const AREA_EXPONENTS: Record<string, number> = {
  cyan: 0.7,
  magenta: 0.8,
  yellow: 0.75,
  black: 0.6,
  white: 0.98,   // Even closer to linear (1.0) for white
  gloss: 0.99,   // Even closer to linear (1.0) for gloss
  clear: 0.95,   // Closer to linear (1.0) for clear
  primer: 0.95,  // Closer to linear (1.0) for primer
};

/**
 * Coverage exponents for non-linear coverage scaling
 * Values greater than 1 indicate accelerating ink usage as coverage increases
 * Values less than 1 indicate diminishing returns as coverage increases
 * Note: These have minimal effect on special layers since they use a primarily area-based formula
 */
export const COVERAGE_EXPONENTS: Record<string, number> = {
  cyan: 0.6,
  magenta: 0.9,
  yellow: 1.2,
  black: 0.8,
  white: 1.0,    // Linear coverage for white (though less relevant with area-based formula)
  gloss: 1.0,    // Linear coverage for gloss (though less relevant with area-based formula)
  clear: 1.0,    // Linear coverage for clear (though less relevant with area-based formula)
  primer: 1.0,   // Linear coverage for primer (though less relevant with area-based formula)
};

/**
 * Ink mode adjustment factors
 * These values adjust channel calculations based on ink mode
 * For special layers, these differences are now much more significant between modes (3-5x difference)
 */
export const INK_MODE_ADJUSTMENTS: Record<string, Record<string, number>> = {
  "CMYK": {
    cyan: 1.0,
    magenta: 1.0,
    yellow: 1.0,
    black: 1.0
  },
  "WHITE_CMYK": {
    cyan: 0.9,
    magenta: 0.9,
    yellow: 0.9,
    black: 0.9,
    white: 6.0      // Increased from 4.0
  },
  "WHITE_CMYK_GLOSS": {
    cyan: 0.85,
    magenta: 0.85,
    yellow: 0.85,
    black: 0.85,
    white: 7.0,     // Increased from 4.5
    gloss: 7.5      // Increased from 5.0
  },
  "CMYK_GLOSS": {
    cyan: 1.0,
    magenta: 1.0,
    yellow: 1.0,
    black: 1.0,
    gloss: 7.0      // Increased from 4.5
  },
  "SELECTIVE_WHITE_CMYK": { // Added specific mode for selective white
    cyan: 0.9,
    magenta: 0.9,
    yellow: 0.9,
    black: 0.9,
    white: 4.0      // Increased from 2.5 proportionally
  },
  "SELECTIVE_CMYK_GLOSS": { // Added specific mode for selective gloss
    cyan: 1.0,
    magenta: 1.0, 
    yellow: 1.0,
    black: 1.0,
    gloss: 3.5      // Increased from 2.0 proportionally
  }
};

/**
 * Special layer mode identification
 * Identifies which ink modes use white and gloss layers
 * Enhanced with selective vs. full coverage identification
 */
export const SPECIAL_LAYER_MODES = {
  WHITE_MODES: ["WHITE_CMYK", "WHITE_CMYK_GLOSS", "SELECTIVE_WHITE_CMYK"],
  GLOSS_MODES: ["CMYK_GLOSS", "WHITE_CMYK_GLOSS", "SELECTIVE_CMYK_GLOSS"],
  SELECTIVE_MODES: ["SELECTIVE_WHITE_CMYK", "SELECTIVE_CMYK_GLOSS"],
  FULL_COVERAGE_MODES: ["WHITE_CMYK", "WHITE_CMYK_GLOSS", "CMYK_GLOSS"]
};

/**
 * Quality-specific multipliers per channel
 * These values adjust ink consumption based on print quality settings
 */
export const QUALITY_CHANNEL_MULTIPLIERS: Record<PrintQuality, ChannelMlValues> = {
  draft: {
    cyan: 0.6,
    magenta: 0.65,
    yellow: 0.7,
    black: 0.55,
    white: 0.6,
    gloss: 0.65,
    clear: 0.6,
    primer: 0.6,
  },
  standard: {
    cyan: 1.0,
    magenta: 1.0,
    yellow: 1.0,
    black: 1.0,
    white: 1.0,
    gloss: 1.0,
    clear: 1.0,
    primer: 1.0,
  },
  high: {
    cyan: 1.4,
    magenta: 1.25,
    yellow: 1.2,
    black: 1.5,
    white: 1.3,
    gloss: 1.25,
    clear: 1.3,
    primer: 1.3,
  },
};

/**
 * Continuous area scaling function
 * Calculates area scaling multiplier based on logarithmic curve
 * Used primarily for CMYK channels - special layers use a more linear approach
 * @param area Area in square inches
 * @returns Scaling multiplier for the given area
 */
export function calculateAreaScalingMultiplier(area: number): number {
  // Updated to ensure small jobs have higher multiplier and large jobs scale properly
  return 1.05 + (0.35 * Math.log10(1 + area/50));
}

/**
 * Size classification for special layer calculations
 * Used to apply different calculation branches based on print size
 */
export const SIZE_CLASSIFICATIONS = {
  small: 4,       // Less than 4 sq inches (~50mm square)
  medium: 100,    // Between 4-100 sq inches (~50-250mm square)
  large: 100.1    // Over 100 sq inches (>250mm square)
};

/**
 * Fixed minimum thresholds based on printer mechanics
 * These represent the minimum amount of ink used regardless of calculation
 */
export const MINIMUM_LAYER_USAGE = {
  white: 0.03,    // Minimum white usage in mL
  gloss: 0.04,    // Minimum gloss usage in mL
  clear: 0.03,    // Minimum clear usage in mL
  primer: 0.02    // Minimum primer usage in mL
};

/**
 * Legacy area scaling thresholds and multipliers
 * Kept for backwards compatibility but no longer used in the enhanced model
 */
export const AREA_SCALING_THRESHOLDS: Record<string, number> = {
  small: 10,    // Less than 10 sq inches
  medium: 50,   // Between 10-50 sq inches
  large: 100,   // Between 50-100 sq inches
  xlarge: 101,  // Over 100 sq inches
};

export const AREA_SCALING_MULTIPLIERS: Record<string, number> = {
  small: 1.2,   // Small prints use proportionally more ink per unit area
  medium: 1.0,  // Baseline
  large: 0.9,   // Larger prints use proportionally less ink per unit area
  xlarge: 0.85, // Very large prints use even less ink per unit area
};

/**
 * Linear model intercepts for special layers
 * These are used in the y = mx + b formula for special layer calculations
 * where y is ink usage in mL, m is the slope, and b is the intercept
 */
export const LAYER_INTERCEPTS: Record<string, number> = {
  white: 0.15,   // White base intercept in mL
  gloss: 0.18,   // Gloss base intercept in mL
  clear: 0.05,   // Clear base intercept in mL
  primer: 0.03   // Primer base intercept in mL
};

/**
 * Linear model slopes for special layers
 * These determine how quickly ink usage increases with area
 */
export const LAYER_SLOPES: Record<string, number> = {
  white: 0.15,   // White ink usage per square inch
  gloss: 0.20,   // Gloss ink usage per square inch
  clear: 0.04,   // Clear ink usage per square inch
  primer: 0.03   // Primer ink usage per square inch
}; 