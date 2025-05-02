'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalibrationRefreshButton } from '@/app/tools/ink-calculator/components/CalibrationRefreshButton';
import { CalibrationFixButton } from '@/app/tools/ink-calculator/components/CalibrationFixButton';
import { CalibrationRefreshIndicator } from '@/app/tools/ink-calculator/components/CalibrationRefreshIndicator';
import { refreshCalibrationFromDatabase } from '@/app/tools/ink-calculator/services/calibration-loader';
import { hasCmykScalingIssue } from '@/app/tools/ink-calculator/services/calibration-fixer';

interface CalibrationControlsProps {
  onCalibrationChange?: () => void;
}

export function CalibrationControls({ onCalibrationChange }: CalibrationControlsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCalibrationFromDatabase();
      if (onCalibrationChange) onCalibrationChange();
    } catch (error) {
      console.error('Error refreshing calibration:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleFixStart = () => {
    setIsFixing(true);
  };
  
  const handleFixComplete = (fixed: boolean) => {
    setIsFixing(false);
    if (fixed && onCalibrationChange) {
      onCalibrationChange();
    }
  };
  
  return (
    <Card className="mb-6 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-blue-800 dark:text-blue-400">Calibration Controls</CardTitle>
            <CardDescription>
              Refresh and fix calibration factors
            </CardDescription>
          </div>
          <CalibrationRefreshIndicator />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <CalibrationRefreshButton 
            onRefreshStart={() => setIsRefreshing(true)}
            onRefreshComplete={() => {
              setIsRefreshing(false);
              if (onCalibrationChange) onCalibrationChange();
            }}
          />
          
          <CalibrationFixButton 
            onFixStart={handleFixStart}
            onFixComplete={handleFixComplete}
          />
        </div>
      </CardContent>
    </Card>
  );
} 