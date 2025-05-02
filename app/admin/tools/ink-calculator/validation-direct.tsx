'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { DirectFixButton } from './components/DirectFixButton';
import { getCalibrationFactors } from '@/app/tools/ink-calculator/services/calibration-direct';
import { validateTestBatch, calculateMAE } from '@/app/tools/ink-calculator/services/validation';

interface TestDataEntry {
  id: string;
  ink_mode: string;
  quality: string;
  dimensions: {
    width: number;
    height: number;
    unit: string;
  };
  channel_ml: Record<string, number>;
  image_analysis: {
    totalCoverage: number;
    channelCoverage: Record<string, number>;
  };
  created_at: string;
  image_url: string;
}

export default function ValidationDirectPage() {
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState<TestDataEntry[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [currentScalingFactors, setCurrentScalingFactors] = useState<Record<string, number>>({});
  
  useEffect(() => {
    fetchTestData();
  }, []);
  
  const fetchTestData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ink-test-data');
      if (!response.ok) {
        throw new Error('Failed to fetch test data');
      }
      
      const { data } = await response.json();
      console.log('[DIRECT-VALIDATION] Fetched test data count:', data?.length || 0);
      
      // Filter out entries that don't have image analysis data
      const validData = (data || []).filter((entry: TestDataEntry) => 
        entry.image_analysis && 
        entry.image_analysis.channelCoverage && 
        Object.keys(entry.image_analysis.channelCoverage).length > 0
      );
      
      console.log('[DIRECT-VALIDATION] Valid test data count:', validData.length);
      setTestData(validData);
      
      // Run validation automatically if we have data
      if (validData.length > 0) {
        validateData(validData);
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const validateData = async (data = testData) => {
    console.log('[DIRECT-VALIDATION] Starting validation with', data.length, 'test entries');
    
    try {
      setLoading(true);
      
      // IMPORTANT: Get fresh calibration directly from API before validating
      // This ensures we're using the latest calibration factors with no caching
      console.log('[DIRECT-VALIDATION] Fetching latest calibration directly from API');
      const calibrationFactors = await getCalibrationFactors();
      
      // Store the current CMYK scaling factors for display
      setCurrentScalingFactors(calibrationFactors.channelScalingFactors || {});
      
      console.log('[DIRECT-VALIDATION] CMYK values from API:', 
        ['cyan', 'magenta', 'yellow', 'black'].map(channel => 
          `${channel}: ${calibrationFactors.channelScalingFactors[channel]}`
        ).join(', ')
      );
      
      // Run validation on all test entries using the freshly loaded factors
      const results = await validateTestBatch(data, calibrationFactors);
      setValidationResults(results);
      
      // Simplified calculation of stats for now
      const cmykChannels = ['cyan', 'magenta', 'yellow', 'black'];
      const cmykResults = results.filter(r => 
        cmykChannels.some(c => r.predictedValues[c] !== undefined)
      );
      
      // Calculate average error for CMYK channels
      let totalError = 0;
      let sampleCount = 0;
      
      cmykResults.forEach(result => {
        cmykChannels.forEach(channel => {
          if (result.predictedValues[channel] !== undefined && result.actualValues[channel] !== undefined) {
            const error = Math.abs(result.predictedValues[channel] - result.actualValues[channel]);
            totalError += error;
            sampleCount++;
          }
        });
      });
      
      const avgError = sampleCount > 0 ? totalError / sampleCount : 0;
      
      setStats({
        cmykAvgError: avgError,
        cmykSampleCount: sampleCount,
        totalEntries: results.length
      });
      
      toast.success(`Validation complete for ${results.length} test entries`);
    } catch (error: any) {
      console.error('[DIRECT-VALIDATION] Validation error:', error);
      toast.error(error.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };
  
  const formatNumber = (num: number) => {
    return num.toFixed(6);
  };
  
  // Determine if a number is in the expected range
  const isInExpectedRange = (channel: string, value: number) => {
    if (['cyan', 'magenta', 'yellow', 'black'].includes(channel)) {
      return value >= 0.03 && value <= 0.08;
    }
    return true;
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Direct Validation (Phase 2.4)</h1>
      
      <Card className="mb-6 border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-red-800 dark:text-red-400">Direct Calibration Approach</CardTitle>
          <CardDescription>
            Using direct API calls with no caching for calibration data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <DirectFixButton onFixComplete={(success) => {
                if (success) fetchTestData();
              }} />
              <Button 
                variant="outline" 
                onClick={fetchTestData} 
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Validation
              </Button>
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Current CMYK Scaling Factors:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['cyan', 'magenta', 'yellow', 'black'].map(channel => (
                  <div key={channel} className="border rounded-md p-2">
                    <div className="text-sm capitalize">{channel}:</div>
                    <div className={isInExpectedRange(channel, currentScalingFactors[channel]) 
                      ? "text-green-600 font-medium" 
                      : "text-red-600 font-medium"}>
                      {formatNumber(currentScalingFactors[channel] || 0)}
                      {!isInExpectedRange(channel, currentScalingFactors[channel]) && 
                        <span className="text-xs block"> (WRONG - should be 0.03-0.08)</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {stats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>
              CMYK channel validation against test data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-md p-4">
                <div className="text-sm text-muted-foreground">Average CMYK Error</div>
                <div className="text-2xl font-semibold">
                  {formatNumber(stats.cmykAvgError)} mL
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Based on {stats.cmykSampleCount} samples
                </div>
              </div>
              
              <div className="border rounded-md p-4">
                <div className="text-sm text-muted-foreground">Sample Count</div>
                <div className="text-2xl font-semibold">{stats.cmykSampleCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Individual CMYK channel measurements
                </div>
              </div>
              
              <div className="border rounded-md p-4">
                <div className="text-sm text-muted-foreground">Test Entries</div>
                <div className="text-2xl font-semibold">{stats.totalEntries}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total validation test entries
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 