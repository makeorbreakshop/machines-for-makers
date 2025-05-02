/**
 * Direct Calibration Service
 * 
 * This utility provides calibration functions that always fetch directly from the API
 * with NO caching, to solve the persistent caching issues in the ink calculator.
 * 
 * This is part of Phase 2.4: Complete Elimination of Calibration Caching
 */

import { CalibrationFactors } from './calibration-loader';
import { 
  BASE_CONSUMPTION as DEFAULT_BASE_CONSUMPTION,
  CHANNEL_SCALING_FACTORS as DEFAULT_CHANNEL_SCALING_FACTORS,
  QUALITY_CHANNEL_MULTIPLIERS as DEFAULT_QUALITY_MULTIPLIERS,
  AREA_SCALING_MULTIPLIERS as DEFAULT_AREA_SCALING_MULTIPLIERS,
  AREA_EXPONENTS as DEFAULT_AREA_EXPONENTS,
  COVERAGE_EXPONENTS as DEFAULT_COVERAGE_EXPONENTS,
  INK_MODE_ADJUSTMENTS as DEFAULT_INK_MODE_ADJUSTMENTS,
} from "../ink-calibration";

/**
 * Get calibration factors directly from database, with NO caching
 * @param calibrationType Optional type of calibration to fetch ('cmyk' or 'special_layer')
 * @returns The calibration factors directly from the database
 */
export async function getCalibrationFactors(
  calibrationType?: 'cmyk' | 'special_layer'
): Promise<CalibrationFactors> {
  try {
    console.log(`[DIRECT-CALIBRATION] Fetching ${calibrationType || 'combined'} calibration directly from API`);
    
    // Build URL with cache busting and optional type parameter
    const url = calibrationType 
      ? `/api/admin/ink-calculator/calibration?type=${calibrationType}&t=${Date.now()}`
      : `/api/admin/ink-calculator/calibration?t=${Date.now()}`;
    
    // Always fetch from API with cache busting
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      credentials: 'include', // Include credentials for auth
      cache: 'no-store'       // Explicitly disable fetch caching
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.factors) {
      throw new Error('No calibration factors found in API response');
    }
    
    // Add tracking for debugging
    const factorsWithSource = {
      ...data.factors,
      source: 'api-direct',
      lastUpdated: data.created_at || new Date().toISOString()
    };
    
    console.log(`[DIRECT-CALIBRATION] Successfully fetched ${calibrationType || 'combined'} calibration from API`);
    
    // Return the factors directly without any caching
    return factorsWithSource;
  } catch (error) {
    console.error('[DIRECT-CALIBRATION] Error fetching calibration factors:', error);
    
    // Fallback to default values if API fails
    return {
      baseConsumption: DEFAULT_BASE_CONSUMPTION,
      channelScalingFactors: DEFAULT_CHANNEL_SCALING_FACTORS,
      qualityChannelMultipliers: DEFAULT_QUALITY_MULTIPLIERS,
      areaScalingMultipliers: DEFAULT_AREA_SCALING_MULTIPLIERS,
      areaExponents: DEFAULT_AREA_EXPONENTS,
      coverageExponents: DEFAULT_COVERAGE_EXPONENTS,
      inkModeAdjustments: DEFAULT_INK_MODE_ADJUSTMENTS,
      source: 'default-direct',
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Save calibration factors directly to database only
 * @param factors The calibration factors to save
 * @param calibrationType The type of calibration ('cmyk' or 'special_layer')
 * @returns True if save was successful, false otherwise
 */
export async function saveCalibrationFactors(
  factors: CalibrationFactors, 
  calibrationType: 'cmyk' | 'special_layer' = 'cmyk'
): Promise<boolean> {
  try {
    console.log(`[DIRECT-CALIBRATION] Saving ${calibrationType} calibration directly to API`);
    
    // Log CMYK channel values for debugging
    if (calibrationType === 'cmyk') {
      console.log('[DIRECT-CALIBRATION] CMYK values being saved:',
        ['cyan', 'magenta', 'yellow', 'black'].map(channel => 
          `${channel}: ${factors.channelScalingFactors[channel]}`
        ).join(', ')
      );
    }
    
    const response = await fetch('/api/admin/ink-calculator/calibration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      credentials: 'include',
      body: JSON.stringify({
        factors,
        calibration_type: calibrationType
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[DIRECT-CALIBRATION] Save response:', result);
    
    console.log(`[DIRECT-CALIBRATION] Successfully saved ${calibrationType} calibration to API`);
    return true;
  } catch (error) {
    console.error('[DIRECT-CALIBRATION] Error saving calibration factors:', error);
    return false;
  }
}

/**
 * Fix the CMYK scaling factors by applying the correct values directly
 * This function provides a one-step fix for the 100× scaling issue
 */
export async function applyDirectCmykFix(): Promise<boolean> {
  try {
    console.log('[DIRECT-CALIBRATION] Applying direct CMYK scaling fix');
    
    // Get current calibration to preserve other values
    const currentCalibration = await getCalibrationFactors('cmyk');
    
    // Create fixed calibration with correct CMYK values
    const fixedCalibration = {
      ...currentCalibration,
      channelScalingFactors: {
        ...currentCalibration.channelScalingFactors,
        // Fixed CMYK values
        cyan: 0.039296,
        magenta: 0.03,
        yellow: 0.04,
        black: 0.076529
      },
      source: 'direct-fix'
    };
    
    // Save directly to database
    const success = await saveCalibrationFactors(fixedCalibration, 'cmyk');
    
    console.log('[DIRECT-CALIBRATION] CMYK fix applied:', success);
    return success;
  } catch (error) {
    console.error('[DIRECT-CALIBRATION] Error applying CMYK fix:', error);
    return false;
  }
} 