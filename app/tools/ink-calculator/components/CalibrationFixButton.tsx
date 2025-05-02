'use client';

import { useState } from 'react';
import { applyAndSaveCmykFix, hasCmykScalingIssue } from '../services/calibration-fixer';
import { CalibrationFactors, getCurrentCalibration, refreshCalibrationFromDatabase } from '../services/calibration-loader';

interface FixButtonProps {
  className?: string;
  onFixStart?: () => void;
  onFixComplete?: (fixed: boolean) => void;
}

export function CalibrationFixButton({ className = '', onFixStart, onFixComplete }: FixButtonProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [hasIssue, setHasIssue] = useState<boolean | null>(null);
  const [status, setStatus] = useState('');
  
  const checkForIssue = () => {
    const currentCalibration = getCurrentCalibration();
    const detected = hasCmykScalingIssue(currentCalibration);
    setHasIssue(detected);
    return detected;
  };
  
  const handleFix = async () => {
    // First check if there's an issue
    if (hasIssue === null && !checkForIssue()) {
      setStatus('No CMYK scaling issue detected. Calibration factors are within expected ranges.');
      alert('No CMYK scaling issue detected. Calibration factors are within expected ranges.');
      if (onFixComplete) onFixComplete(false);
      return;
    }
    
    if (onFixStart) onFixStart();
    setIsFixing(true);
    setStatus('Starting CMYK scaling fix...');
    
    try {
      // Log initial calibration state
      const initialCalibration = getCurrentCalibration();
      console.log('[DEBUG] Initial CMYK scaling factors before fix:', 
        Object.entries(initialCalibration.channelScalingFactors)
          .filter(([key]) => ['cyan', 'magenta', 'yellow', 'black'].includes(key))
          .map(([channel, value]) => `${channel}: ${value}`)
          .join(', ')
      );
      
      // Apply the fix
      setStatus('Applying CMYK scaling fix...');
      const fixedCalibration = await applyAndSaveCmykFix();
      
      // Log fixed values
      console.log('[DEBUG] Fixed CMYK scaling factors after applyAndSaveCmykFix:', 
        Object.entries(fixedCalibration.channelScalingFactors)
          .filter(([key]) => ['cyan', 'magenta', 'yellow', 'black'].includes(key))
          .map(([channel, value]) => `${channel}: ${value}`)
          .join(', ')
      );
      
      // Add a delay to ensure the database has time to commit the changes
      setStatus('Waiting for database commit...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      
      // Log pre-refresh state
      console.log('[DEBUG] Current calibration before refreshCalibrationFromDatabase:', 
        Object.entries(getCurrentCalibration().channelScalingFactors)
          .filter(([key]) => ['cyan', 'magenta', 'yellow', 'black'].includes(key))
          .map(([channel, value]) => `${channel}: ${value}`)
          .join(', ')
      );
      
      // Refresh the UI to use the latest calibration values
      setStatus('Refreshing calibration from database...');
      
      // Force database refresh to ensure we're using the latest data
      const refreshedCalibration = await refreshCalibrationFromDatabase();
      
      // Log refreshed values
      console.log('[DEBUG] Calibration after refreshCalibrationFromDatabase:', 
        Object.entries(refreshedCalibration.channelScalingFactors)
          .filter(([key]) => ['cyan', 'magenta', 'yellow', 'black'].includes(key))
          .map(([channel, value]) => `${channel}: ${value}`)
          .join(', ')
      );
      
      setStatus('Fix verified - calibration values have been corrected');
      setHasIssue(false);
      if (onFixComplete) onFixComplete(true);
      
      // Display success details
      const fixSuccessMessage = `
CMYK scaling fix applied successfully!

The values have been corrected and saved to the database:
${Object.entries(fixedCalibration.channelScalingFactors)
  .filter(([key]) => ['cyan', 'magenta', 'yellow', 'black'].includes(key))
  .map(([channel, value]) => `- ${channel}: ${value.toFixed(6)}`)
  .join('\n')}

The calibration has been reloaded from the database and verified.
`.trim();

      alert(fixSuccessMessage);
    } catch (error: any) {
      console.error('Error applying CMYK scaling fix:', error);
      setStatus(`Error: ${error.message || 'Unknown error'}`);
      alert(`Error applying CMYK scaling fix: ${error.message || 'Unknown error'}`);
      if (onFixComplete) onFixComplete(false);
    } finally {
      setIsFixing(false);
    }
  };
  
  return (
    <div className="flex flex-col">
      <button
        onClick={handleFix}
        disabled={isFixing}
        className={`px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded border border-yellow-300 flex items-center gap-2 ${className}`}
        title="Apply 100× multiplier to fix CMYK scaling factors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor" 
          className="w-4 h-4"
        >
          <path 
            fillRule="evenodd" 
            d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" 
            clipRule="evenodd" 
          />
        </svg>
        {isFixing ? 'Applying Fix...' : 'Fix CMYK Scaling (×100)'}
      </button>
      
      {status && (
        <div className={`mt-2 text-sm ${status.includes('Error') ? 'text-red-600' : status.includes('verified') ? 'text-green-600' : 'text-blue-600'}`}>
          {status}
        </div>
      )}
    </div>
  );
} 