"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalibrationFactors } from '@/app/tools/ink-calculator/services/calibration-loader';

interface CalibrationDebugPanelProps {
  onRefreshCalibration?: () => Promise<void>;
}

export default function CalibrationDebugPanel({ onRefreshCalibration }: CalibrationDebugPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("database");
  const [loading, setLoading] = useState(false);
  const [dbCalibration, setDbCalibration] = useState<CalibrationFactors | null>(null);
  const [dbTimestamp, setDbTimestamp] = useState<string | null>(null);
  const [localStorageCalibration, setLocalStorageCalibration] = useState<CalibrationFactors | null>(null);
  const [localStorageTimestamp, setLocalStorageTimestamp] = useState<string | null>(null);
  const [memoryCalibration, setMemoryCalibration] = useState<CalibrationFactors | null>(null);
  const [hasScalingIssue, setHasScalingIssue] = useState(false);
  
  useEffect(() => {
    loadCalibrationData();
  }, []);
  
  const loadCalibrationData = async () => {
    setLoading(true);
    try {
      // Load from database via API
      await loadDatabaseCalibration();
      
      // Load from localStorage (client-side only)
      if (typeof window !== 'undefined') {
        loadLocalStorageCalibration();
      }
      
      // Load current in-memory calibration
      await loadMemoryCalibration();
      
      // Check for scaling issue
      checkForScalingIssue();
    } catch (error) {
      console.error("Error loading calibration data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadDatabaseCalibration = async () => {
    try {
      // Load CMYK calibration
      const response = await fetch('/api/admin/ink-calculator/calibration?type=cmyk');
      if (response.ok) {
        const data = await response.json();
        setDbCalibration(data.factors);
        setDbTimestamp(data.created_at);
      }
    } catch (error) {
      console.error("Error loading calibration from database:", error);
    }
  };
  
  const loadLocalStorageCalibration = () => {
    try {
      const storedData = localStorage.getItem('uvPrinterInkCalibration_cmyk');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setLocalStorageCalibration(parsedData);
        setLocalStorageTimestamp(parsedData.lastUpdated);
      }
    } catch (error) {
      console.error("Error loading calibration from localStorage:", error);
    }
  };
  
  const loadMemoryCalibration = async () => {
    try {
      // Import and use the getCurrentCalibration function
      const { getCurrentCalibration } = await import('@/app/tools/ink-calculator/services/calibration-loader');
      const currentCalibration = getCurrentCalibration();
      setMemoryCalibration(currentCalibration);
    } catch (error) {
      console.error("Error loading calibration from memory:", error);
    }
  };
  
  const checkForScalingIssue = () => {
    // Check if CMYK values are approximately 100× too small (around 0.0003-0.0004)
    const hasIssue = dbCalibration?.channelScalingFactors && (
      (dbCalibration.channelScalingFactors.cyan < 0.001) ||
      (dbCalibration.channelScalingFactors.magenta < 0.001) ||
      (dbCalibration.channelScalingFactors.yellow < 0.001) ||
      (dbCalibration.channelScalingFactors.black < 0.001)
    );
    
    setHasScalingIssue(!!hasIssue);
  };
  
  const handleRefresh = async () => {
    setLoading(true);
    
    // Call the parent's refresh function if available
    if (onRefreshCalibration) {
      await onRefreshCalibration();
    }
    
    // Reload all calibration data
    await loadCalibrationData();
    
    setLoading(false);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const renderCalibrationDetails = (calibration: CalibrationFactors | null, source: string) => {
    if (!calibration) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No calibration data</AlertTitle>
          <AlertDescription>
            No calibration data available from {source}
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">CMYK Channel Scaling Factors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(calibration.channelScalingFactors)
              .filter(([channel]) => ['cyan', 'magenta', 'yellow', 'black'].includes(channel))
              .map(([channel, value]) => (
                <div key={channel} className="p-3 rounded-lg border">
                  <div className="flex items-center mb-1">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ 
                        backgroundColor: 
                          channel === 'cyan' ? '#00FFFF' : 
                          channel === 'magenta' ? '#FF00FF' : 
                          channel === 'yellow' ? '#FFFF00' : 
                          channel === 'black' ? '#000000' : '#CCCCCC'
                      }}
                    ></div>
                    <span className="font-medium capitalize">{channel}</span>
                  </div>
                  <div className="text-xl font-bold">
                    {value.toFixed(8)}
                  </div>
                  {value < 0.001 && (
                    <Badge variant="destructive" className="mt-1">
                      100× too small
                    </Badge>
                  )}
                </div>
              ))
            }
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Special Layer Scaling Factors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(calibration.channelScalingFactors)
              .filter(([channel]) => ['white', 'gloss', 'clear', 'primer'].includes(channel))
              .map(([channel, value]) => (
                <div key={channel} className="p-3 rounded-lg border">
                  <div className="flex items-center mb-1">
                    <div
                      className="w-3 h-3 rounded-full mr-2 border"
                      style={{ 
                        backgroundColor: 
                          channel === 'white' ? '#FFFFFF' : 
                          channel === 'gloss' ? '#AAAAFF' : 
                          channel === 'clear' ? '#EEEEEE' : 
                          channel === 'primer' ? '#FFCCAA' : '#CCCCCC'
                      }}
                    ></div>
                    <span className="font-medium capitalize">{channel}</span>
                  </div>
                  <div className="text-xl font-bold">
                    {value.toFixed(4)}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Other Calibration Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border">
              <h4 className="font-medium">Base Consumption</h4>
              <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-40">
                {JSON.stringify(calibration.baseConsumption, null, 2)}
              </pre>
            </div>
            <div className="p-3 rounded-lg border">
              <h4 className="font-medium">Quality Multipliers</h4>
              <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-40">
                {JSON.stringify(calibration.qualityChannelMultipliers, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="mb-6 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-amber-800 dark:text-amber-400">Calibration Debug Panel</CardTitle>
            <CardDescription>
              Displays raw calibration values from database, localStorage, and in-memory cache
            </CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="expand-panel"
                checked={expanded}
                onCheckedChange={setExpanded}
              />
              <Label htmlFor="expand-panel" className="cursor-pointer">
                {expanded ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="ml-1 sr-only md:not-sr-only">{expanded ? 'Hide Details' : 'Show Details'}</span>
              </Label>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          {hasScalingIssue && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Scaling Issue Detected</AlertTitle>
              <AlertDescription>
                CMYK channel scaling factors are approximately 100× smaller than expected.
                Expected values are ~0.03-0.04, but current values are ~0.0003-0.0004.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="database">
                Database
                {dbTimestamp && <span className="ml-2 text-xs opacity-70">{formatDate(dbTimestamp)}</span>}
              </TabsTrigger>
              <TabsTrigger value="localStorage">
                localStorage
                {localStorageTimestamp && <span className="ml-2 text-xs opacity-70">{formatDate(localStorageTimestamp)}</span>}
              </TabsTrigger>
              <TabsTrigger value="memory">In-Memory Cache</TabsTrigger>
            </TabsList>
            
            <TabsContent value="database">
              {renderCalibrationDetails(dbCalibration, 'database')}
            </TabsContent>
            
            <TabsContent value="localStorage">
              {renderCalibrationDetails(localStorageCalibration, 'localStorage')}
            </TabsContent>
            
            <TabsContent value="memory">
              {renderCalibrationDetails(memoryCalibration, 'in-memory cache')}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
} 