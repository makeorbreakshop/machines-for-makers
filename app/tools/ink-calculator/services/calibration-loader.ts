/**
 * Calibration Loader
 * 
 * This utility loads the current calibration factors, either from:
 * 1. The database (if available)
 * 2. Local storage (as fallback)
 * 3. Default values from ink-calibration.ts (as final fallback)
 */

import { ChannelMlValues, PrintQuality } from "../types";
import { 
  BASE_CONSUMPTION as DEFAULT_BASE_CONSUMPTION,
  CHANNEL_SCALING_FACTORS as DEFAULT_CHANNEL_SCALING_FACTORS,
  QUALITY_CHANNEL_MULTIPLIERS as DEFAULT_QUALITY_MULTIPLIERS,
  AREA_SCALING_MULTIPLIERS as DEFAULT_AREA_SCALING_MULTIPLIERS,
  AREA_EXPONENTS as DEFAULT_AREA_EXPONENTS,
  COVERAGE_EXPONENTS as DEFAULT_COVERAGE_EXPONENTS,
  INK_MODE_ADJUSTMENTS as DEFAULT_INK_MODE_ADJUSTMENTS,
  calculateAreaScalingMultiplier
} from "../ink-calibration";

// Local storage key for calibrated factors
const CALIBRATION_STORAGE_KEY = 'uvPrinterInkCalibration';

// Validation ranges for different calibration factors
export const EXPECTED_RANGES = {
  cmyk: {
    channelScalingFactors: { 
      min: 0.01, 
      max: 0.1,
      channels: ['cyan', 'magenta', 'yellow', 'black']
    } // Most CMYK ~0.03-0.04
  },
  special: {
    channelScalingFactors: { 
      min: 0.1, 
      max: 1.0,
      channels: ['white', 'gloss', 'clear', 'primer']
    } // Most special ~0.2-0.5
  }
};

// Type definitions
export interface CalibrationFactors {
  baseConsumption: Record<string, number>;
  channelScalingFactors: Record<string, number>;
  qualityChannelMultipliers: Record<PrintQuality, ChannelMlValues>;
  areaScalingMultipliers: Record<string, number>;
  areaExponents: Record<string, number>;
  coverageExponents: Record<string, number>;
  inkModeAdjustments: Record<string, Record<string, number>>;
  lastUpdated?: string;
  source?: string; // Added to track where calibration came from
}

// Keep track of the current calibration factors
let currentCalibration: CalibrationFactors | null = null;

// UI update callback - this can be set by components that need refresh notifications
type RefreshCallback = () => void;
let refreshCallbacks: RefreshCallback[] = [];

/**
 * Register a callback to be notified when calibration is refreshed
 * @param callback Function to call when calibration is refreshed
 * @returns Function to unregister the callback
 */
export function onCalibrationRefresh(callback: RefreshCallback): () => void {
  refreshCallbacks.push(callback);
  return () => {
    refreshCallbacks = refreshCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Notify all registered callbacks about a calibration refresh
 */
function notifyCalibrationRefresh(): void {
  console.log(`[CALIBRATION-LOADER] Notifying ${refreshCallbacks.length} components about calibration refresh`);
  refreshCallbacks.forEach(callback => callback());
}

/**
 * Validate if a calibration factor is within expected ranges
 * @param factor The value to validate
 * @param range The min/max range to check against
 * @returns Object with isValid flag and an optional warning message
 */
export function validateCalibrationFactor(
  factor: number, 
  type: 'cmyk' | 'special', 
  channel: string,
  factorType: 'channelScalingFactors' = 'channelScalingFactors'
): { isValid: boolean; warning?: string } {
  // Skip validation if we don't have ranges for this factor type
  if (!EXPECTED_RANGES[type]?.[factorType]) {
    return { isValid: true };
  }

  const range = EXPECTED_RANGES[type][factorType];
  
  // Only validate for channels that belong to this type
  if (!range.channels.includes(channel)) {
    return { isValid: true };
  }
  
  if (factor < range.min || factor > range.max) {
    return { 
      isValid: false, 
      warning: `${channel} ${factorType} value ${factor} is outside expected range (${range.min}-${range.max})`
    };
  }
  
  return { isValid: true };
}

/**
 * Initialize calibration by trying to load from storage
 */
export function initCalibration(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storedData = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (storedData) {
      currentCalibration = JSON.parse(storedData);
      if (currentCalibration) {
        currentCalibration.source = 'localStorage';
        console.log('[CALIBRATION-LOADER] Loaded calibration from local storage');
      }
    }
  } catch (error) {
    console.error('[CALIBRATION-LOADER] Error loading calibration from storage:', error);
  }
}

/**
 * Save calibration factors to local storage
 */
export function saveCalibrationToStorage(factors: CalibrationFactors): void {
  console.log("[CALIBRATION-LOADER] Saving calibration to local storage");
  
  if (typeof window === 'undefined') {
    console.log("[CALIBRATION-LOADER] Not browser environment, skipping localStorage save");
    return;
  }
  
  try {
    // Add timestamp
    const factorsWithTimestamp = {
      ...factors,
      lastUpdated: new Date().toISOString(),
      source: 'localStorage'
    };
    
    // Validate CMYK channel scaling factors
    let hasWarnings = false;
    const warnings: string[] = [];
    
    // Check CMYK channels
    EXPECTED_RANGES.cmyk.channelScalingFactors.channels.forEach(channel => {
      if (factorsWithTimestamp.channelScalingFactors[channel] !== undefined) {
        const validation = validateCalibrationFactor(
          factorsWithTimestamp.channelScalingFactors[channel], 
          'cmyk', 
          channel
        );
        
        if (!validation.isValid && validation.warning) {
          hasWarnings = true;
          warnings.push(validation.warning);
        }
      }
    });
    
    // Check special layer channels
    EXPECTED_RANGES.special.channelScalingFactors.channels.forEach(channel => {
      if (factorsWithTimestamp.channelScalingFactors[channel] !== undefined) {
        const validation = validateCalibrationFactor(
          factorsWithTimestamp.channelScalingFactors[channel], 
          'special', 
          channel
        );
        
        if (!validation.isValid && validation.warning) {
          hasWarnings = true;
          warnings.push(validation.warning);
        }
      }
    });
    
    // Log warnings if any were found
    if (hasWarnings) {
      console.warn("[CALIBRATION-LOADER] Warning: Some calibration factors are outside expected ranges:");
      warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    // Save to local storage
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(factorsWithTimestamp));
    
    // Update current calibration
    currentCalibration = factorsWithTimestamp;
    
    // Notify components about the update
    notifyCalibrationRefresh();
    
    console.log("[CALIBRATION-LOADER] Calibration saved to local storage with timestamp:", factorsWithTimestamp.lastUpdated);
  } catch (error) {
    console.error("[CALIBRATION-LOADER] Error saving to localStorage:", error);
  }
}

/**
 * Clear current calibration from memory to force a reload from storage
 */
export function clearCalibrationCache(): void {
  console.log("[CALIBRATION-LOADER] Clearing calibration cache to force reload");
  currentCalibration = null;
  
  // Also clear localStorage variants to ensure complete refresh
  if (typeof window !== 'undefined') {
    try {
      // Clear all variant keys
      localStorage.removeItem(`${CALIBRATION_STORAGE_KEY}_cmyk`);
      localStorage.removeItem(`${CALIBRATION_STORAGE_KEY}_special_layer`);
      localStorage.removeItem(CALIBRATION_STORAGE_KEY);
      console.log("[CALIBRATION-LOADER] Cleared all localStorage calibration entries");
    } catch (error) {
      console.error("[CALIBRATION-LOADER] Error clearing localStorage:", error);
    }
  }
  
  // Notify components about the cache clear
  notifyCalibrationRefresh();
}

/**
 * Load calibration factors from API with type filtering
 */
export async function loadCalibrationFromApi(calibrationType?: 'cmyk' | 'special_layer'): Promise<CalibrationFactors | null> {
  console.log(`[CALIBRATION-LOADER] Loading ${calibrationType || 'combined'} calibration from API`);
  
  try {
    // Add the calibration type as a query parameter if specified
    const url = calibrationType 
      ? `/api/admin/ink-calculator/calibration?type=${calibrationType}`
      : '/api/admin/ink-calculator/calibration';
      
    const response = await fetch(url);
    console.log("[CALIBRATION-LOADER] API response status:", response.status);
    
    if (!response.ok) {
      console.error("[CALIBRATION-LOADER] API request failed:", response.status);
      throw new Error('Failed to load calibration factors');
    }
    
    const data = await response.json();
    console.log("[CALIBRATION-LOADER] API response data received:", !!data.factors);
    
    if (data.factors) {
      // Add source tracking
      const factorsWithSource = {
        ...data.factors,
        source: 'database',
        lastUpdated: data.created_at || new Date().toISOString()
      };
      
      // Validate calibration factors
      let hasWarnings = false;
      const warnings: string[] = [];
      
      // Check CMYK channels
      EXPECTED_RANGES.cmyk.channelScalingFactors.channels.forEach(channel => {
        if (factorsWithSource.channelScalingFactors[channel] !== undefined) {
          const validation = validateCalibrationFactor(
            factorsWithSource.channelScalingFactors[channel], 
            'cmyk', 
            channel
          );
          
          if (!validation.isValid && validation.warning) {
            hasWarnings = true;
            warnings.push(validation.warning);
          }
        }
      });
      
      // Check special layer channels
      EXPECTED_RANGES.special.channelScalingFactors.channels.forEach(channel => {
        if (factorsWithSource.channelScalingFactors[channel] !== undefined) {
          const validation = validateCalibrationFactor(
            factorsWithSource.channelScalingFactors[channel], 
            'special', 
            channel
          );
          
          if (!validation.isValid && validation.warning) {
            hasWarnings = true;
            warnings.push(validation.warning);
          }
        }
      });
      
      // Log warnings if any were found
      if (hasWarnings) {
        console.warn("[CALIBRATION-LOADER] Warning: Some calibration factors from database are outside expected ranges:");
        warnings.forEach(warning => console.warn(`  - ${warning}`));
      }
      
      console.log(`[CALIBRATION-LOADER] ${calibrationType || 'Combined'} calibration factors loaded from API`);
      
      // Also store in localStorage for offline use
      if (typeof window !== 'undefined') {
        const storageKey = calibrationType 
          ? `${CALIBRATION_STORAGE_KEY}_${calibrationType}`
          : CALIBRATION_STORAGE_KEY;
          
        localStorage.setItem(storageKey, JSON.stringify(factorsWithSource));
        console.log(`[CALIBRATION-LOADER] ${calibrationType || 'Combined'} calibration also saved to localStorage from API data`);
      }
      
      return factorsWithSource;
    }
    
    console.log(`[CALIBRATION-LOADER] No ${calibrationType || 'combined'} calibration factors found in API response`);
    return null;
  } catch (error) {
    console.error("[CALIBRATION-LOADER] Error loading from API:", error);
    return null;
  }
}

/**
 * Load calibration factors from local storage with type filtering
 */
export function loadCalibrationFromStorage(calibrationType?: 'cmyk' | 'special_layer'): CalibrationFactors | null {
  console.log(`[CALIBRATION-LOADER] Loading ${calibrationType || 'combined'} calibration from localStorage`);
  
  if (typeof window === 'undefined') {
    console.log("[CALIBRATION-LOADER] Not browser environment, skipping localStorage load");
    return null;
  }
  
  try {
    const storageKey = calibrationType 
      ? `${CALIBRATION_STORAGE_KEY}_${calibrationType}`
      : CALIBRATION_STORAGE_KEY;
      
    const storedData = localStorage.getItem(storageKey);
    
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      // Ensure source is tracked
      parsedData.source = 'localStorage';
      console.log(`[CALIBRATION-LOADER] ${calibrationType || 'Combined'} calibration loaded from localStorage, timestamp:`, parsedData.lastUpdated);
      return parsedData;
    }
  } catch (error) {
    console.error("[CALIBRATION-LOADER] Error loading from localStorage:", error);
  }
  
  console.log(`[CALIBRATION-LOADER] No ${calibrationType || 'combined'} calibration found in localStorage`);
  return null;
}

/**
 * Get the current calibration factors
 */
export function getCurrentCalibration(): CalibrationFactors {
  console.log("[DEBUG] getCurrentCalibration called");
  
  // First check if we have an in-memory currentCalibration
  if (currentCalibration) {
    console.log("[DEBUG] getCurrentCalibration returning in-memory cache");
    try {
      console.log("[DEBUG] CMYK channels in cache:", 
        ['cyan', 'magenta', 'yellow', 'black'].map(channel => 
          `${channel}: ${currentCalibration.channelScalingFactors[channel]}`
        ).join(', ')
      );
    } catch (error) {
      console.error("[DEBUG] Error logging calibration values:", error);
    }
    return currentCalibration;
  }
  
  // For server-side rendering, return defaults
  if (typeof window === 'undefined') {
    console.log("[DEBUG] getCurrentCalibration returning default values for server-side rendering");
    return {
      baseConsumption: DEFAULT_BASE_CONSUMPTION,
      channelScalingFactors: DEFAULT_CHANNEL_SCALING_FACTORS,
      qualityChannelMultipliers: DEFAULT_QUALITY_MULTIPLIERS,
      areaScalingMultipliers: DEFAULT_AREA_SCALING_MULTIPLIERS,
      areaExponents: DEFAULT_AREA_EXPONENTS,
      coverageExponents: DEFAULT_COVERAGE_EXPONENTS,
      inkModeAdjustments: DEFAULT_INK_MODE_ADJUSTMENTS,
      source: 'default'
    };
  }
  
  // Try to load from local storage (which should be synced with DB)
  const storedCalibration = loadCalibrationFromStorage();
  if (storedCalibration) {
    console.log("[DEBUG] getCurrentCalibration loaded from localStorage");
    console.log("[DEBUG] CMYK channels from localStorage:", 
      ['cyan', 'magenta', 'yellow', 'black'].map(channel => 
        `${channel}: ${storedCalibration.channelScalingFactors[channel]}`
      ).join(', ')
    );
    currentCalibration = storedCalibration;
    return storedCalibration;
  }
  
  // If no stored calibration, use defaults
  console.log("[DEBUG] getCurrentCalibration using default calibration values");
  const defaultCalibration = {
    baseConsumption: DEFAULT_BASE_CONSUMPTION,
    channelScalingFactors: DEFAULT_CHANNEL_SCALING_FACTORS,
    qualityChannelMultipliers: DEFAULT_QUALITY_MULTIPLIERS,
    areaScalingMultipliers: DEFAULT_AREA_SCALING_MULTIPLIERS,
    areaExponents: DEFAULT_AREA_EXPONENTS,
    coverageExponents: DEFAULT_COVERAGE_EXPONENTS,
    inkModeAdjustments: DEFAULT_INK_MODE_ADJUSTMENTS,
    source: 'default'
  };
  
  // Cache the default values
  currentCalibration = defaultCalibration;
  return defaultCalibration;
}

/**
 * Load merged calibration factors combining CMYK and special layer optimizations
 * This is the main function that should be used by the calculator to get the best of both worlds
 */
export async function loadMergedCalibrationFactors(): Promise<CalibrationFactors> {
  console.log("[CALIBRATION-LOADER] Loading merged calibration factors");
  
  // Default calibration as fallback
  const defaultCalibration = {
    baseConsumption: DEFAULT_BASE_CONSUMPTION,
    channelScalingFactors: DEFAULT_CHANNEL_SCALING_FACTORS,
    qualityChannelMultipliers: DEFAULT_QUALITY_MULTIPLIERS,
    areaScalingMultipliers: DEFAULT_AREA_SCALING_MULTIPLIERS,
    areaExponents: DEFAULT_AREA_EXPONENTS,
    coverageExponents: DEFAULT_COVERAGE_EXPONENTS,
    inkModeAdjustments: DEFAULT_INK_MODE_ADJUSTMENTS,
    source: 'default'
  };
  
  // Step 1: Try to load CMYK calibration
  const cmykCalibration = await loadCalibrationFromApi('cmyk') || 
                          loadCalibrationFromStorage('cmyk');
  
  // Step 2: Try to load special layer calibration
  const specialLayerCalibration = await loadCalibrationFromApi('special_layer') || 
                                  loadCalibrationFromStorage('special_layer');
  
  // Step 3: Fall back to combined calibration if either is missing
  let combinedCalibration = null;
  if (!cmykCalibration || !specialLayerCalibration) {
    combinedCalibration = await loadCalibrationFromApi() || 
                          loadCalibrationFromStorage();
  }
  
  // Step 4: Start with default calibration
  const mergedCalibration = { ...defaultCalibration, source: 'merged' };
  
  // Step 5: Apply combined calibration if available
  if (combinedCalibration) {
    Object.assign(mergedCalibration, combinedCalibration);
  }
  
  // Track calibration sources for logging
  const sourcesUsed: string[] = [];
  if (combinedCalibration) sourcesUsed.push('combined');
  
  // Step 6: Apply CMYK calibration for CMYK channels if available
  if (cmykCalibration) {
    sourcesUsed.push('cmyk');
    const cmykChannels = EXPECTED_RANGES.cmyk.channelScalingFactors.channels;
    
    // CMYK base consumption
    cmykChannels.forEach(channel => {
      if (cmykCalibration.baseConsumption?.[channel] !== undefined) {
        mergedCalibration.baseConsumption[channel] = cmykCalibration.baseConsumption[channel];
      }
      
      if (cmykCalibration.channelScalingFactors?.[channel] !== undefined) {
        // Validate scaling factor
        const validation = validateCalibrationFactor(
          cmykCalibration.channelScalingFactors[channel],
          'cmyk',
          channel
        );
        
        if (!validation.isValid) {
          console.warn(`[CALIBRATION-LOADER] Warning when merging: ${validation.warning}`);
        }
        
        mergedCalibration.channelScalingFactors[channel] = cmykCalibration.channelScalingFactors[channel];
      }
      
      if (cmykCalibration.areaExponents?.[channel] !== undefined) {
        mergedCalibration.areaExponents[channel] = cmykCalibration.areaExponents[channel];
      }
      
      if (cmykCalibration.coverageExponents?.[channel] !== undefined) {
        mergedCalibration.coverageExponents[channel] = cmykCalibration.coverageExponents[channel];
      }
    });
    
    // CMYK quality multipliers
    Object.keys(cmykCalibration.qualityChannelMultipliers || {}).forEach(quality => {
      const qualityKey = quality as PrintQuality;
      cmykChannels.forEach(channel => {
        if (cmykCalibration.qualityChannelMultipliers?.[qualityKey]?.[channel] !== undefined) {
          mergedCalibration.qualityChannelMultipliers[qualityKey][channel] = 
            cmykCalibration.qualityChannelMultipliers[qualityKey][channel];
        }
      });
    });
    
    // CMYK ink mode adjustments
    Object.keys(cmykCalibration.inkModeAdjustments || {}).forEach(mode => {
      if (!mergedCalibration.inkModeAdjustments[mode]) {
        mergedCalibration.inkModeAdjustments[mode] = {};
      }
      
      cmykChannels.forEach(channel => {
        if (cmykCalibration.inkModeAdjustments?.[mode]?.[channel] !== undefined) {
          mergedCalibration.inkModeAdjustments[mode][channel] = 
            cmykCalibration.inkModeAdjustments[mode][channel];
        }
      });
    });
  }
  
  // Step 7: Apply special layer calibration for special layers if available
  if (specialLayerCalibration) {
    sourcesUsed.push('special_layer');
    const specialChannels = EXPECTED_RANGES.special.channelScalingFactors.channels;
    
    // Special layer base consumption
    specialChannels.forEach(channel => {
      if (specialLayerCalibration.baseConsumption?.[channel] !== undefined) {
        mergedCalibration.baseConsumption[channel] = specialLayerCalibration.baseConsumption[channel];
      }
      
      if (specialLayerCalibration.channelScalingFactors?.[channel] !== undefined) {
        // Validate scaling factor
        const validation = validateCalibrationFactor(
          specialLayerCalibration.channelScalingFactors[channel],
          'special',
          channel
        );
        
        if (!validation.isValid) {
          console.warn(`[CALIBRATION-LOADER] Warning when merging: ${validation.warning}`);
        }
        
        mergedCalibration.channelScalingFactors[channel] = specialLayerCalibration.channelScalingFactors[channel];
      }
      
      if (specialLayerCalibration.areaExponents?.[channel] !== undefined) {
        mergedCalibration.areaExponents[channel] = specialLayerCalibration.areaExponents[channel];
      }
      
      if (specialLayerCalibration.coverageExponents?.[channel] !== undefined) {
        mergedCalibration.coverageExponents[channel] = specialLayerCalibration.coverageExponents[channel];
      }
    });
    
    // Special layer quality multipliers
    Object.keys(specialLayerCalibration.qualityChannelMultipliers || {}).forEach(quality => {
      const qualityKey = quality as PrintQuality;
      specialChannels.forEach(channel => {
        if (specialLayerCalibration.qualityChannelMultipliers?.[qualityKey]?.[channel] !== undefined) {
          mergedCalibration.qualityChannelMultipliers[qualityKey][channel] = 
            specialLayerCalibration.qualityChannelMultipliers[qualityKey][channel];
        }
      });
    });
    
    // Special layer ink mode adjustments
    Object.keys(specialLayerCalibration.inkModeAdjustments || {}).forEach(mode => {
      if (!mergedCalibration.inkModeAdjustments[mode]) {
        mergedCalibration.inkModeAdjustments[mode] = {};
      }
      
      specialChannels.forEach(channel => {
        if (specialLayerCalibration.inkModeAdjustments?.[mode]?.[channel] !== undefined) {
          mergedCalibration.inkModeAdjustments[mode][channel] = 
            specialLayerCalibration.inkModeAdjustments[mode][channel];
        }
      });
    });
  }
  
  console.log(`[CALIBRATION-LOADER] Merged calibration factors complete. Sources used: ${sourcesUsed.join(', ')}`);
  return mergedCalibration;
}

/**
 * Force refresh merged calibration from database
 * This should be called whenever we need to ensure we have the latest calibration
 */
export async function refreshCalibrationFromDatabase(): Promise<CalibrationFactors> {
  console.log("[DEBUG] refreshCalibrationFromDatabase called");
  
  try {
    // Clear any cached values
    console.log("[DEBUG] Clearing cache with clearCalibrationCache()");
    clearCalibrationCache();
    
    // Get merged calibration
    console.log("[DEBUG] Loading merged calibration with loadMergedCalibrationFactors()");
    const mergedCalibration = await loadMergedCalibrationFactors();
    
    console.log("[DEBUG] Merged calibration loaded with CMYK factors:", 
      ['cyan', 'magenta', 'yellow', 'black'].map(channel => 
        `${channel}: ${mergedCalibration.channelScalingFactors[channel]}`
      ).join(', ')
    );
    
    // Save to current calibration
    console.log("[DEBUG] Updating currentCalibration in-memory cache");
    currentCalibration = mergedCalibration;
    
    // Also save to localStorage under the base key to ensure it's available to getCurrentCalibration
    if (typeof window !== 'undefined') {
      try {
        const calWithTimestamp = {
          ...mergedCalibration,
          lastRefreshed: new Date().toISOString()
        };
        localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(calWithTimestamp));
        console.log("[DEBUG] Saved merged calibration to localStorage");
      } catch (error) {
        console.error("[DEBUG] Error saving to localStorage:", error);
      }
    }
    
    // Notify components about the refresh
    console.log("[DEBUG] Calling notifyCalibrationRefresh()");
    notifyCalibrationRefresh();
    
    console.log("[DEBUG] refreshCalibrationFromDatabase completed successfully");
    return mergedCalibration;
  } catch (error) {
    console.error("[DEBUG] Error in refreshCalibrationFromDatabase:", error);
    const fallback = getCurrentCalibration();
    console.log("[DEBUG] Falling back to getCurrentCalibration with values:", 
      ['cyan', 'magenta', 'yellow', 'black'].map(channel => 
        `${channel}: ${fallback.channelScalingFactors[channel]}`
      ).join(', ')
    );
    return fallback; // Fall back to whatever we can get
  }
}

// Initialize calibration on module load (client-side only)
if (typeof window !== 'undefined') {
  initCalibration();
} 