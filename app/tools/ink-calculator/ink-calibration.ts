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
 */
export const BASE_CONSUMPTION: Record<string, number> = {
  cyan: 0.01,    // Base cyan consumption in mL
  magenta: 0.01, // Base magenta consumption in mL
  yellow: 0.01,  // Base yellow consumption in mL
  black: 0.01,   // Base black consumption in mL
  white: 0.05,   // Base white consumption in mL
  gloss: 0.02,   // Base gloss consumption in mL
  clear: 0.02,   // Base clear consumption in mL
  primer: 0.01,  // Base primer consumption in mL
};

/**
 * Channel-specific scaling factors
 * These values adjust how coverage percentage translates to mL
 * Based on test data analysis showing different consumption rates per channel
 */
export const CHANNEL_SCALING_FACTORS: Record<string, number> = {
  cyan: 0.00016,    // mL per % coverage per square inch
  magenta: 0.00024, // mL per % coverage per square inch
  yellow: 0.00032, // mL per % coverage per square inch
  black: 0.00012,   // mL per % coverage per square inch
  white: 0.00040,   // mL per % coverage per square inch
  gloss: 0.00020,   // mL per % coverage per square inch
  clear: 0.00010,   // mL per % coverage per square inch
  primer: 0.00008,  // mL per % coverage per square inch
};

/**
 * Quality-specific multipliers per channel
 * These values adjust ink consumption based on print quality settings
 */
export const QUALITY_CHANNEL_MULTIPLIERS: Record<PrintQuality, ChannelMlValues> = {
  draft: {
    cyan: 0.6,
    magenta: 0.6,
    yellow: 0.6,
    black: 0.5,
    white: 0.6,
    gloss: 0.6,
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
    cyan: 1.5,
    magenta: 1.5,
    yellow: 1.5,
    black: 1.8, // Black ink uses proportionally more at high quality
    white: 1.6,
    gloss: 1.5,
    clear: 1.5,
    primer: 1.5,
  },
};

/**
 * Area scaling thresholds
 * Non-linear scaling adjustments for different print sizes
 */
export const AREA_SCALING_THRESHOLDS: Record<string, number> = {
  small: 10,    // Less than 10 sq inches
  medium: 50,   // Between 10-50 sq inches
  large: 100,   // Between 50-100 sq inches
  xlarge: 101,  // Over 100 sq inches
};

/**
 * Area scaling multipliers
 * Different scaling factors for different area ranges
 */
export const AREA_SCALING_MULTIPLIERS: Record<string, number> = {
  small: 1.2,   // Small prints use proportionally more ink per unit area
  medium: 1.0,  // Baseline
  large: 0.9,   // Larger prints use proportionally less ink per unit area
  xlarge: 0.85, // Very large prints use even less ink per unit area
}; 