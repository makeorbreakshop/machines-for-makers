'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Types for calibration data
interface ChannelScalingFactors {
  cyan: number;
  magenta: number;
  yellow: number;
  black: number;
  clear?: number;
  gloss?: number;
  white?: number;
  primer?: number;
  [key: string]: number | undefined; // Allow string indexing
}

interface CalibrationFactors {
  channelScalingFactors: ChannelScalingFactors;
  baseConsumption: Record<string, number>;
  qualityChannelMultipliers: Record<string, Record<string, number>>;
  areaScalingMultipliers: Record<string, number>;
  lastUpdated?: string;
  source?: string;
}

export default function CalibrationDebug() {
  const [loading, setLoading] = useState(true);
  const [cmykFactors, setCmykFactors] = useState<CalibrationFactors | null>(null);
  const [localStorageFactors, setLocalStorageFactors] = useState<CalibrationFactors | null>(null);
  const [fixing, setFixing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    // Load data on mount and when refresh counter changes
    loadCalibrationData();
    checkLocalStorage();
  }, [refreshCounter]);

  async function loadCalibrationData() {
    setLoading(true);
    try {
      // Use cache-busting query parameter
      const response = await fetch(`/api/admin/ink-calculator/calibration?type=cmyk&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.factors) {
        setCmykFactors(data.factors);
      } else {
        console.error('No calibration factors found in API response');
        setCmykFactors(null);
      }
    } catch (error) {
      console.error('Error loading calibration data:', error);
      toast.error('Failed to load calibration data');
    } finally {
      setLoading(false);
    }
  }

  function checkLocalStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const cmykData = localStorage.getItem('uvPrinterInkCalibration_cmyk');
      if (cmykData) {
        const parsedData = JSON.parse(cmykData);
        setLocalStorageFactors(parsedData);
      } else {
        setLocalStorageFactors(null);
      }
    } catch (error) {
      console.error('Error checking localStorage:', error);
      setLocalStorageFactors(null);
    }
  }

  async function applyDirectFix() {
    setFixing(true);
    try {
      // Create calibration with correct values
      const fixedCalibration: CalibrationFactors = {
        ...(cmykFactors || {}),
        channelScalingFactors: {
          cyan: 0.039296,
          magenta: 0.03,
          yellow: 0.04,
          black: 0.076529,
          clear: cmykFactors?.channelScalingFactors.clear || 0.05,
          gloss: cmykFactors?.channelScalingFactors.gloss || 0.25,
          white: cmykFactors?.channelScalingFactors.white || 0.2,
          primer: cmykFactors?.channelScalingFactors.primer || 0.04,
        },
        baseConsumption: cmykFactors?.baseConsumption || {},
        qualityChannelMultipliers: cmykFactors?.qualityChannelMultipliers || {},
        areaScalingMultipliers: cmykFactors?.areaScalingMultipliers || {},
        source: 'direct-debug-fix',
        lastUpdated: new Date().toISOString()
      };
      
      // Save to database
      const response = await fetch('/api/admin/ink-calculator/calibration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          factors: fixedCalibration,
          calibration_type: 'cmyk'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Fix applied:', result);
      
      if (result.success) {
        // Wait for database to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update localStorage
        localStorage.setItem('uvPrinterInkCalibration_cmyk', JSON.stringify(fixedCalibration));
        localStorage.setItem('uvPrinterInkCalibration', JSON.stringify(fixedCalibration));
        
        toast.success('Fixed calibration values applied');
        setRefreshCounter(prev => prev + 1);
      } else {
        toast.error('Failed to apply fix');
      }
    } catch (error) {
      console.error('Error applying fix:', error);
      toast.error('Failed to apply fix');
    } finally {
      setFixing(false);
    }
  }

  function clearLocalStorage() {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('uvPrinterInkCalibration_cmyk');
    localStorage.removeItem('uvPrinterInkCalibration');
    toast.success('LocalStorage calibration data cleared');
    setRefreshCounter(prev => prev + 1);
  }
  
  function refreshData() {
    setRefreshCounter(prev => prev + 1);
    toast.success('Refreshing data...');
  }

  // Format a number for display
  function formatNumber(num: number | undefined) {
    if (num === undefined) return 'N/A';
    return num.toFixed(8);
  }

  // Check if number is within expected range (0.03-0.08 for CMYK)
  function isInExpectedRange(channel: string, value: number | undefined) {
    if (value === undefined) return false;
    
    // CMYK channels should be in 0.03-0.08 range
    if (['cyan', 'magenta', 'yellow', 'black'].includes(channel)) {
      return value >= 0.03 && value <= 0.08;
    }
    
    return true;
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Ink Calculator Calibration Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Calibration Values</CardTitle>
            <CardDescription>Current values from the database API</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : cmykFactors ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Last Updated: {cmykFactors.lastUpdated || 'Unknown'}<br />
                  Source: {cmykFactors.source || 'Unknown'}
                </p>
                <h3 className="font-medium mt-4 mb-2">CMYK Channel Scaling Factors:</h3>
                <div className="space-y-2">
                  {['cyan', 'magenta', 'yellow', 'black'].map(channel => (
                    <div key={channel} className="flex items-center justify-between">
                      <span className="capitalize">{channel}:</span>
                      <span className={isInExpectedRange(channel, cmykFactors.channelScalingFactors[channel]) 
                        ? "text-green-600 font-medium" 
                        : "text-red-600 font-medium"}>
                        {formatNumber(cmykFactors.channelScalingFactors[channel])}
                        {!isInExpectedRange(channel, cmykFactors.channelScalingFactors[channel]) && 
                          " (WRONG - should be 0.03-0.08)"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p>No calibration data found</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={refreshData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh from Database'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LocalStorage Calibration Values</CardTitle>
            <CardDescription>Values cached in browser localStorage</CardDescription>
          </CardHeader>
          <CardContent>
            {localStorageFactors ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Last Updated: {localStorageFactors.lastUpdated || 'Unknown'}<br />
                  Source: {localStorageFactors.source || 'Unknown'}
                </p>
                <h3 className="font-medium mt-4 mb-2">CMYK Channel Scaling Factors:</h3>
                <div className="space-y-2">
                  {['cyan', 'magenta', 'yellow', 'black'].map(channel => (
                    <div key={channel} className="flex items-center justify-between">
                      <span className="capitalize">{channel}:</span>
                      <span className={isInExpectedRange(channel, localStorageFactors.channelScalingFactors[channel]) 
                        ? "text-green-600 font-medium" 
                        : "text-red-600 font-medium"}>
                        {formatNumber(localStorageFactors.channelScalingFactors[channel])}
                        {!isInExpectedRange(channel, localStorageFactors.channelScalingFactors[channel]) && 
                          " (WRONG - should be 0.03-0.08)"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p>No localStorage calibration data found</p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={clearLocalStorage}>
              Clear LocalStorage
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Apply Direct Fix</CardTitle>
          <CardDescription>
            This will directly set the CMYK channel scaling factors to the correct values in both database and localStorage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Will apply these scaling factors:
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>Cyan: <span className="font-medium">0.039296</span></div>
            <div>Magenta: <span className="font-medium">0.03</span></div>
            <div>Yellow: <span className="font-medium">0.04</span></div>
            <div>Black: <span className="font-medium">0.076529</span></div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={applyDirectFix} disabled={fixing}>
            {fixing ? 'Applying...' : 'Apply Direct Fix Now'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 