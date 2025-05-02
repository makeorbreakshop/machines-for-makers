'use client';

import { useState } from 'react';
import { refreshCalibrationFromDatabase } from '../services/calibration-loader';

interface RefreshButtonProps {
  className?: string;
  onRefreshStart?: () => void;
  onRefreshComplete?: () => void;
  compact?: boolean;
}

export function CalibrationRefreshButton({ 
  className = '', 
  onRefreshStart, 
  onRefreshComplete,
  compact = false
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefreshStart) onRefreshStart();
    
    try {
      await refreshCalibrationFromDatabase();
      console.log('Calibration refreshed successfully');
    } catch (error) {
      console.error('Error refreshing calibration:', error);
    } finally {
      setIsRefreshing(false);
      if (onRefreshComplete) onRefreshComplete();
    }
  };
  
  if (compact) {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`p-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200 flex items-center ${className}`}
        title="Refresh calibration from database"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor" 
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <path 
            fillRule="evenodd" 
            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
    );
  }
  
  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200 flex items-center gap-2 ${className}`}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor" 
        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
      >
        <path 
          fillRule="evenodd" 
          d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" 
          clipRule="evenodd" 
        />
      </svg>
      {isRefreshing ? 'Refreshing...' : 'Refresh Calibration'}
    </button>
  );
} 