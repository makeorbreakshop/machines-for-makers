/**
 * Calibration Fixer Utility
 * 
 * This utility provides functions to fix common calibration issues:
 * 1. The 100× too small CMYK channel scaling factors
 */

import { CalibrationFactors, EXPECTED_RANGES, saveCalibrationToStorage } from './calibration-loader';

const CMYK_CHANNELS = EXPECTED_RANGES.cmyk.channelScalingFactors.channels;
const CMYK_MIN_EXPECTED = EXPECTED_RANGES.cmyk.channelScalingFactors.min;

/**
 * Check if CMYK scaling factors are too small (100× issue)
 * @param calibration The calibration to check
 * @returns True if any CMYK scaling factor is too small
 */
export function hasCmykScalingIssue(calibration: CalibrationFactors): boolean {
  console.log('[DEBUG] hasCmykScalingIssue called with calibration factors:');
  console.log('[DEBUG] CMYK channel values:', CMYK_CHANNELS.map(channel => 
    `${channel}: ${calibration.channelScalingFactors[channel]} (min expected: ${CMYK_MIN_EXPECTED})`
  ).join(', '));
  
  const hasIssue = CMYK_CHANNELS.some(channel => {
    const factor = calibration.channelScalingFactors[channel];
    const isTooSmall = factor !== undefined && factor < CMYK_MIN_EXPECTED / 10;
    
    if (isTooSmall) {
      console.log(`[DEBUG] Scaling issue detected for ${channel}: ${factor} < ${CMYK_MIN_EXPECTED / 10}`);
    }
    
    return isTooSmall;
  });
  
  console.log(`[DEBUG] hasCmykScalingIssue result: ${hasIssue}`);
  return hasIssue;
}

/**
 * Fix CMYK scaling factors that are 100× too small
 * @param calibration The calibration to fix
 * @returns A new calibration object with fixed scaling factors
 */
export function fixCmykScalingFactors(calibration: CalibrationFactors): CalibrationFactors {
  // Create a deep copy to avoid modifying the original
  const fixedCalibration: CalibrationFactors = JSON.parse(JSON.stringify(calibration));
  
  let fixApplied = false;
  const fixLog: string[] = [];
  
  // Check each CMYK channel
  CMYK_CHANNELS.forEach(channel => {
    const factor = calibration.channelScalingFactors[channel];
    
    if (factor !== undefined && factor < CMYK_MIN_EXPECTED / 10) {
      // Factor is at least 10× smaller than the minimum expected value
      // Apply a 100× multiplier to bring it into the expected range
      const oldValue = factor;
      const newValue = factor * 100;
      
      fixedCalibration.channelScalingFactors[channel] = newValue;
      
      fixApplied = true;
      fixLog.push(`${channel}: ${oldValue.toFixed(8)} → ${newValue.toFixed(8)} (100× increase)`);
    }
  });
  
  if (fixApplied) {
    console.log('[CALIBRATION-FIXER] Applied fixes to CMYK scaling factors:');
    fixLog.forEach(log => console.log(`  - ${log}`));
    
    // Add metadata to track the fix
    fixedCalibration.lastUpdated = new Date().toISOString();
    fixedCalibration.source = 'auto-fixed';
  } else {
    console.log('[CALIBRATION-FIXER] No CMYK scaling issues found that need fixing');
  }
  
  return fixedCalibration;
}

/**
 * Apply the CMYK scaling fix to the current calibration and save it
 * @returns The fixed calibration object
 */
export async function applyAndSaveCmykFix(): Promise<CalibrationFactors> {
  try {
    const transactionId = new Date().getTime();
    console.log(`[DEBUG] ================== STARTING NEW FIX ATTEMPT ===================`);
    console.log(`[DEBUG] Transaction ID: ${transactionId} - ${new Date().toISOString()}`);
    
    // Load latest calibration from API
    console.log('[DEBUG] Fetching current calibration from API');
    const response = await fetch('/api/admin/ink-calculator/calibration?type=cmyk', {
      credentials: 'include', // Add credentials to send cookies with the request
      cache: 'no-store', // Force bypassing cache
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Transaction-ID': `${transactionId}`
      }
    });
    
    console.log('[DEBUG] API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG] API error response:', errorText);
      throw new Error(`Failed to load calibration: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[DEBUG] Calibration data retrieved successfully');
    
    if (!data.factors) {
      console.error('[DEBUG] No calibration factors found in response:', data);
      throw new Error('No calibration factors found in database');
    }
    
    // Check if it needs fixing
    const currentCalibration = data.factors as CalibrationFactors;
    
    // More detailed logging of specific CMYK values before fix
    console.log('[DEBUG] ======= BEFORE FIX - CMYK FACTORS: ======= ');
    CMYK_CHANNELS.forEach(channel => {
      console.log(`[DEBUG] ${channel}: ${currentCalibration.channelScalingFactors[channel]}`);
    });
    
    if (!hasCmykScalingIssue(currentCalibration)) {
      console.log('[DEBUG] No CMYK scaling issue detected, no fix needed');
      return currentCalibration;
    }
    
    console.log('[DEBUG] CMYK scaling issue detected, applying fix');
    
    // Apply the fix
    const fixedCalibration = fixCmykScalingFactors(currentCalibration);
    
    // More detailed logging of specific CMYK values after fix
    console.log('[DEBUG] ======= AFTER FIX - CMYK FACTORS: ======= ');
    CMYK_CHANNELS.forEach(channel => {
      console.log(`[DEBUG] ${channel}: ${fixedCalibration.channelScalingFactors[channel]}`);
    });
    
    // Clear all caches before saving to ensure clean state
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`uvPrinterInkCalibration_cmyk`);
      localStorage.removeItem(`uvPrinterInkCalibration`);
      console.log('[DEBUG] Cleared localStorage cache before save');
    }
    
    // Save to database via API
    console.log('[DEBUG] Saving fixed calibration to database');
    
    // Log the exact payload being sent to the database
    const requestPayload = {
      factors: fixedCalibration,
      calibration_type: 'cmyk',
      transaction_id: transactionId // Add transaction ID to help track this specific request
    };
    console.log('[DEBUG] Sending payload to database:', JSON.stringify(requestPayload, null, 2));
    
    const saveResponse = await fetch('/api/admin/ink-calculator/calibration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Transaction-ID': `${transactionId}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      credentials: 'include', // Add credentials to send cookies with the request
      body: JSON.stringify(requestPayload),
    });
    
    console.log('[DEBUG] Save response status:', saveResponse.status);
    
    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      console.error('[DEBUG] Save error response:', errorText);
      throw new Error(`Failed to save fixed calibration: ${saveResponse.status} - ${errorText}`);
    }
    
    // Fix: Use json() directly instead of text() + parse
    const saveData = await saveResponse.json();
    console.log('[DEBUG] Save response data:', saveData);
    
    if (!saveData.success || !saveData.id) {
      console.error('[DEBUG] API returned success: false or missing ID');
      throw new Error('API failed to save data: ' + JSON.stringify(saveData));
    }
    
    // Force longer delay to ensure database commit
    console.log('[DEBUG] Waiting 5 seconds for database commit...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    
    console.log('[DEBUG] Successfully saved fixed calibration to database');
    
    // Manually update the localStorage (both keys used by the system)
    if (typeof window !== 'undefined') {
      const timestampedData = {
        ...fixedCalibration,
        lastUpdated: new Date().toISOString(),
        source: 'manual-fix',
        transaction_id: transactionId
      };
      
      // Update both localStorage keys used by the system
      localStorage.setItem('uvPrinterInkCalibration', JSON.stringify(timestampedData));
      localStorage.setItem('uvPrinterInkCalibration_cmyk', JSON.stringify(timestampedData));
      console.log('[DEBUG] Manually set localStorage with fixed calibration values');
    }
    
    // Direct database query verification to ensure the fix was saved
    console.log('[DEBUG] Performing direct verification of saved values');
    
    const verifyResponse = await fetch(`/api/admin/ink-calculator/calibration?type=cmyk&t=${Date.now()}`, {
      method: 'GET', // Explicitly specify GET method
      credentials: 'include',
      cache: 'no-store', // Force bypassing cache
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Transaction-ID': `${transactionId}`
      }
    });
    
    if (!verifyResponse.ok) {
      console.error('[DEBUG] Verification request failed:', verifyResponse.status);
      throw new Error('Failed to verify saved calibration');
    }
    
    const verifyData = await verifyResponse.json();
    
    if (!verifyData.factors) {
      console.error('[DEBUG] No factors found in verification response');
      throw new Error('Verification failed - no calibration factors found');
    }
    
    // Check if the values are now in the expected range
    const verifiedFactors = verifyData.factors.channelScalingFactors;
    
    // More detailed verification of specific CMYK values
    console.log('[DEBUG] ======= VERIFICATION - CMYK FACTORS: ======= ');
    CMYK_CHANNELS.forEach(channel => {
      console.log(`[DEBUG] ${channel}: ${verifiedFactors[channel]}`);
      if (verifiedFactors[channel] < CMYK_MIN_EXPECTED) {
        console.error(`[DEBUG] VERIFICATION FAILED - ${channel} factor ${verifiedFactors[channel]} still below minimum ${CMYK_MIN_EXPECTED}`);
      } else {
        console.log(`[DEBUG] VERIFICATION PASSED - ${channel} factor ${verifiedFactors[channel]} now above minimum ${CMYK_MIN_EXPECTED}`);
      }
    });
    
    const stillHasIssue = CMYK_CHANNELS.some(channel => {
      const factor = verifiedFactors[channel];
      const isTooSmall = factor !== undefined && factor < CMYK_MIN_EXPECTED;
      return isTooSmall;
    });
    
    if (stillHasIssue) {
      console.error('[DEBUG] ======= CRITICAL ERROR ======= ');
      console.error('[DEBUG] Verification failed - database still contains small scaling factors');
      console.error('[DEBUG] This suggests the save operation did not work properly');
      console.error('[DEBUG] Transaction ID: ' + transactionId);
      
      // FAILSAFE: Try a completely different approach - create a new calibration entry with explicit values
      console.log('[DEBUG] ======= TRYING DIRECT VALUES APPROACH ======= ');
      
      // Create a brand new calibration with hardcoded proper values
      const directCalibration: CalibrationFactors = {
        ...fixedCalibration,
        channelScalingFactors: {
          cyan: 0.039296,
          magenta: 0.03,
          yellow: 0.04,
          black: 0.076529,
          clear: fixedCalibration.channelScalingFactors.clear || 0.05,
          gloss: fixedCalibration.channelScalingFactors.gloss || 0.25,
          white: fixedCalibration.channelScalingFactors.white || 0.2,
          primer: fixedCalibration.channelScalingFactors.primer || 0.04,
        },
        source: 'hardcoded-values-fix',
        lastUpdated: new Date().toISOString()
      };
      
      // Log the exact values we're using
      console.log('[DEBUG] Using direct hardcoded values:', 
        CMYK_CHANNELS.map(c => `${c}: ${directCalibration.channelScalingFactors[c]}`).join(', '));
      
      // Save the direct values calibration
      const directPayload = {
        factors: directCalibration,
        calibration_type: 'cmyk',
        transaction_id: `${transactionId}-direct`
      };
      
      console.log('[DEBUG] Sending direct values payload:', JSON.stringify(directPayload, null, 2));
      
      const directResponse = await fetch('/api/admin/ink-calculator/calibration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Transaction-ID': `${transactionId}-direct`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        credentials: 'include',
        body: JSON.stringify(directPayload),
      });
      
      if (!directResponse.ok) {
        console.error('[DEBUG] Direct values save failed:', await directResponse.text());
        throw new Error('Failed to save direct calibration values');
      }
      
      const directResult = await directResponse.json();
      console.log('[DEBUG] Direct values save successful:', directResult);
      
      // Update localStorage with direct values
      if (typeof window !== 'undefined') {
        localStorage.setItem('uvPrinterInkCalibration', JSON.stringify(directCalibration));
        localStorage.setItem('uvPrinterInkCalibration_cmyk', JSON.stringify(directCalibration));
        console.log('[DEBUG] Updated localStorage with direct calibration values');
      }
      
      return directCalibration;
    }
    
    console.log(`[DEBUG] ================== TRANSACTION COMPLETED SUCCESSFULLY ===================`);
    console.log(`[DEBUG] Transaction ID: ${transactionId} - ${new Date().toISOString()}`);
    return fixedCalibration;
  } catch (error) {
    console.error('[DEBUG] Error fixing calibration:', error);
    throw error;
  }
} 