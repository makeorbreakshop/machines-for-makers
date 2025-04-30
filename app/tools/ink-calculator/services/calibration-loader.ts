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
  AREA_SCALING_MULTIPLIERS as DEFAULT_AREA_SCALING_MULTIPLIERS
} from "../ink-calibration";

// Local storage key for calibrated factors
const CALIBRATION_STORAGE_KEY = 'uvPrinterInkCalibration';

// Type definitions
export interface CalibrationFactors {
  baseConsumption: Record<string, number>;
  channelScalingFactors: Record<string, number>;
  qualityChannelMultipliers: Record<PrintQuality, ChannelMlValues>;
  areaScalingMultipliers: Record<string, number>;
  lastUpdated?: string;
}

// Keep track of the current calibration factors
let currentCalibration: CalibrationFactors | null = null;

/**
 * Initialize calibration by trying to load from storage
 */
export function initCalibration(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storedData = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (storedData) {
      currentCalibration = JSON.parse(storedData);
      console.log('Loaded calibration from local storage');
    }
  } catch (error) {
    console.error('Error loading calibration from storage:', error);
  }
}

/**
 * Save calibration factors to local storage
 */
export function saveCalibrationToStorage(factors: CalibrationFactors): void {
  console.log("[CALIBRATION-LOADER-DEBUG] Saving calibration to local storage");
  
  if (typeof window === 'undefined') {
    console.log("[CALIBRATION-LOADER-DEBUG] Not browser environment, skipping localStorage save");
    return;
  }
  
  try {
    // Add timestamp
    const factorsWithTimestamp = {
      ...factors,
      lastUpdated: new Date().toISOString()
    };
    
    // Save to local storage
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(factorsWithTimestamp));
    
    // Update current calibration
    currentCalibration = factorsWithTimestamp;
    
    console.log("[CALIBRATION-LOADER-DEBUG] Calibration saved to local storage with timestamp:", factorsWithTimestamp.lastUpdated);
  } catch (error) {
    console.error("[CALIBRATION-LOADER-DEBUG] Error saving to localStorage:", error);
  }
}

/**
 * Clear current calibration from memory to force a reload from storage
 */
export function clearCalibrationCache(): void {
  console.log("[CALIBRATION-LOADER-DEBUG] Clearing calibration cache to force reload");
  currentCalibration = null;
}

/**
 * Load calibration factors from API
 */
export async function loadCalibrationFromApi(): Promise<CalibrationFactors | null> {
  console.log("[CALIBRATION-LOADER-DEBUG] Loading calibration from API");
  
  try {
    const response = await fetch('/api/admin/ink-calculator/calibration');
    console.log("[CALIBRATION-LOADER-DEBUG] API response status:", response.status);
    
    if (!response.ok) {
      console.error("[CALIBRATION-LOADER-DEBUG] API request failed:", response.status);
      throw new Error('Failed to load calibration factors');
    }
    
    const data = await response.json();
    console.log("[CALIBRATION-LOADER-DEBUG] API response data received:", !!data.factors);
    
    if (data.factors) {
      currentCalibration = data.factors;
      console.log("[CALIBRATION-LOADER-DEBUG] Calibration factors loaded from API");
      
      // Also store in localStorage for offline use
      if (typeof window !== 'undefined') {
        localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify({
          ...data.factors,
          lastUpdated: data.created_at || new Date().toISOString()
        }));
        console.log("[CALIBRATION-LOADER-DEBUG] Calibration also saved to localStorage from API data");
      }
      
      return data.factors;
    }
    
    console.log("[CALIBRATION-LOADER-DEBUG] No calibration factors found in API response");
    return null;
  } catch (error) {
    console.error("[CALIBRATION-LOADER-DEBUG] Error loading from API:", error);
    return null;
  }
}

/**
 * Load calibration factors from local storage
 */
export function loadCalibrationFromStorage(): CalibrationFactors | null {
  console.log("[CALIBRATION-LOADER-DEBUG] Loading calibration from localStorage");
  
  if (typeof window === 'undefined') {
    console.log("[CALIBRATION-LOADER-DEBUG] Not browser environment, skipping localStorage load");
    return null;
  }
  
  try {
    const storedData = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      console.log("[CALIBRATION-LOADER-DEBUG] Calibration loaded from localStorage, timestamp:", parsedData.lastUpdated);
      return parsedData;
    }
  } catch (error) {
    console.error("[CALIBRATION-LOADER-DEBUG] Error loading from localStorage:", error);
  }
  
  console.log("[CALIBRATION-LOADER-DEBUG] No calibration found in localStorage");
  return null;
}

/**
 * Get the current calibration factors
 */
export function getCurrentCalibration(): CalibrationFactors {
  console.log("[CALIBRATION-LOADER-DEBUG] Getting current calibration");
  
  // For server-side rendering, return defaults
  if (typeof window === 'undefined') {
    return {
      baseConsumption: DEFAULT_BASE_CONSUMPTION,
      channelScalingFactors: DEFAULT_CHANNEL_SCALING_FACTORS,
      qualityChannelMultipliers: DEFAULT_QUALITY_MULTIPLIERS,
      areaScalingMultipliers: DEFAULT_AREA_SCALING_MULTIPLIERS
    };
  }
  
  // Always try to load from local storage first (which should be synced with DB)
  const storedCalibration = loadCalibrationFromStorage();
  if (storedCalibration) {
    console.log("[CALIBRATION-LOADER-DEBUG] Using calibration from localStorage");
    currentCalibration = storedCalibration;
    return storedCalibration;
  }
  
  // If no stored calibration, use defaults
  console.log("[CALIBRATION-LOADER-DEBUG] Using default calibration values");
  const defaultCalibration = {
    baseConsumption: DEFAULT_BASE_CONSUMPTION,
    channelScalingFactors: DEFAULT_CHANNEL_SCALING_FACTORS,
    qualityChannelMultipliers: DEFAULT_QUALITY_MULTIPLIERS,
    areaScalingMultipliers: DEFAULT_AREA_SCALING_MULTIPLIERS
  };
  
  // Cache the default values
  currentCalibration = defaultCalibration;
  return defaultCalibration;
}

/**
 * Force refresh calibration from database
 * This should be called whenever we need to ensure we have the latest calibration
 */
export async function refreshCalibrationFromDatabase(): Promise<CalibrationFactors> {
  console.log("[CALIBRATION-LOADER-DEBUG] Forcing refresh of calibration from database");
  
  try {
    // Clear any cached values
    clearCalibrationCache();
    
    // Try to load from API (database)
    const apiData = await loadCalibrationFromApi();
    if (apiData) {
      console.log("[CALIBRATION-LOADER-DEBUG] Successfully refreshed calibration from database");
      return apiData;
    }
    
    // If API fails, fall back to localStorage
    const storedData = loadCalibrationFromStorage();
    if (storedData) {
      return storedData;
    }
    
    // Last resort - defaults
    return {
      baseConsumption: DEFAULT_BASE_CONSUMPTION,
      channelScalingFactors: DEFAULT_CHANNEL_SCALING_FACTORS,
      qualityChannelMultipliers: DEFAULT_QUALITY_MULTIPLIERS,
      areaScalingMultipliers: DEFAULT_AREA_SCALING_MULTIPLIERS
    };
  } catch (error) {
    console.error("[CALIBRATION-LOADER-DEBUG] Error refreshing calibration:", error);
    return getCurrentCalibration(); // Fall back to whatever we can get
  }
}

// Initialize calibration on module load (client-side only)
if (typeof window !== 'undefined') {
  initCalibration();
}

/**
 * Calibration Loader Service
 * 
 * Loads the latest calibration factors from the database with caching
 * to ensure good performance while keeping the calculator accurate.
 */

import { 
  BASE_CONSUMPTION,
  CHANNEL_SCALING_FACTORS,
  QUALITY_CHANNEL_MULTIPLIERS,
  AREA_SCALING_MULTIPLIERS
} from "../ink-calibration";

// Type definition for calibration factors
export interface CalibrationFactors {
  baseConsumption: Record<string, number>;
  channelScalingFactors: Record<string, number>;
  qualityChannelMultipliers: Record<string, Record<string, number>>;
  areaScalingMultipliers: Record<string, number>;
}

// Default static factors to use as fallback
export const DEFAULT_FACTORS: CalibrationFactors = {
  baseConsumption: BASE_CONSUMPTION,
  channelScalingFactors: CHANNEL_SCALING_FACTORS,
  qualityChannelMultipliers: QUALITY_CHANNEL_MULTIPLIERS,
  areaScalingMultipliers: AREA_SCALING_MULTIPLIERS
};

// Cache for calibration factors
let cachedFactors: CalibrationFactors | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Load calibration factors from the database with caching
 */
export async function loadCalibrationFactors(): Promise<CalibrationFactors> {
  // Check if cache is still valid
  const now = Date.now();
  if (cachedFactors && (now - cacheTimestamp < CACHE_TTL)) {
    console.log("[INK-CALCULATOR] Using cached calibration factors");
    return cachedFactors;
  }

  try {
    console.log("[INK-CALCULATOR] Fetching latest calibration factors from database");
    
    // Fetch latest calibration factors from the API
    const response = await fetch('/api/admin/ink-calculator/calibration');
    
    if (!response.ok) {
      throw new Error(`Failed to load calibration factors: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if we got valid factors
    if (!data.factors) {
      throw new Error('No calibration factors found in response');
    }
    
    // Update cache
    cachedFactors = data.factors;
    cacheTimestamp = now;
    
    console.log("[INK-CALCULATOR] Successfully loaded calibration factors, created at:", data.created_at);
    return cachedFactors;
  } catch (error) {
    console.warn("[INK-CALCULATOR] Error loading calibration factors, using defaults:", error);
    // Return default factors if loading fails
    return DEFAULT_FACTORS;
  }
}

/**
 * Get calibration factors - attempts to load from database but falls back to
 * static values if needed
 */
export async function getCalibrationFactors(): Promise<CalibrationFactors> {
  try {
    return await loadCalibrationFactors();
  } catch (error) {
    console.warn("[INK-CALCULATOR] Falling back to default calibration factors", error);
    return DEFAULT_FACTORS;
  }
} 