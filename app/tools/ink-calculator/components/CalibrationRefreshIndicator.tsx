'use client';

import { useEffect, useState } from 'react';
import { onCalibrationRefresh } from '../services/calibration-loader';

interface CalibrationRefreshIndicatorProps {
  className?: string;
}

export function CalibrationRefreshIndicator({ className = '' }: CalibrationRefreshIndicatorProps) {
  const [refreshCount, setRefreshCount] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  
  useEffect(() => {
    // Set up the calibration refresh listener
    const unsubscribe = onCalibrationRefresh(() => {
      setRefreshCount(prev => prev + 1);
      setShowIndicator(true);
      setLastRefreshTime(new Date());
      
      // Hide the indicator after 3 seconds
      setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
    });
    
    // Clean up on unmount
    return unsubscribe;
  }, []);
  
  if (!showIndicator && refreshCount === 0) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {showIndicator && (
        <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded border border-green-300 animate-pulse">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Calibration refreshed</span>
        </div>
      )}
      
      {!showIndicator && refreshCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <span>
            Last refresh: {lastRefreshTime?.toLocaleTimeString()}
            {refreshCount > 1 && ` (${refreshCount} refreshes)`}
          </span>
        </div>
      )}
    </div>
  );
} 