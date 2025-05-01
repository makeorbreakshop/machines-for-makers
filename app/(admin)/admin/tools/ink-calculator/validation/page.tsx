"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { BarChart, RefreshCw, Settings, Download } from "lucide-react";
import { validateTestBatch, calculateMAE } from "@/app/tools/ink-calculator/services/validation";
import { Badge } from "@/components/ui/badge";

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

interface ValidationResult {
  testId: string;
  inkMode: string;
  quality: string;
  channelDifferences: Record<string, number>;
  predictedValues: Record<string, number>;
  actualValues: Record<string, number>;
}

interface ValidationStats {
  overall: number;
  channelMAE: Record<string, number>;
  channelSampleCounts: Record<string, number>;
  sampleCount: number;
  standardChannelsMAE: number;
  specialLayersMAE: number;
  standardChannelsSampleCount: number;
  specialLayersSampleCount: number;
  sizeMetrics?: {
    small: { overall: number; standardChannels: number; specialLayers: number; sampleCount: number; };
    medium: { overall: number; standardChannels: number; specialLayers: number; sampleCount: number; };
    large: { overall: number; standardChannels: number; specialLayers: number; sampleCount: number; };
  };
}

export default function ValidationPage() {
  const [loading, setLoading] = useState(false);
  const [optimizingCmyk, setOptimizingCmyk] = useState(false);
  const [optimizingSpecialLayers, setOptimizingSpecialLayers] = useState(false);
  const [testData, setTestData] = useState<TestDataEntry[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [latestCalibration, setLatestCalibration] = useState<string | null>(null);
  const [latestCmykCalibration, setLatestCmykCalibration] = useState<string | null>(null);
  const [latestSpecialLayerCalibration, setLatestSpecialLayerCalibration] = useState<string | null>(null);

  useEffect(() => {
    // Fetch test data on mount
    fetchTestData();
    fetchLatestCalibration();
  }, []);

  const fetchLatestCalibration = async () => {
    try {
      // Fetch combined calibration (legacy)
      const response = await fetch(`/api/admin/ink-calculator/calibration`);
      if (response.ok) {
        const data = await response.json();
        if (data.created_at) {
          setLatestCalibration(data.created_at);
          console.log("[VALIDATION-DEBUG] Latest combined calibration:", data.created_at);
        }
      }
      
      // Fetch CMYK calibration
      const cmykResponse = await fetch(`/api/admin/ink-calculator/calibration?type=cmyk`);
      if (cmykResponse.ok) {
        const cmykData = await cmykResponse.json();
        if (cmykData.created_at) {
          setLatestCmykCalibration(cmykData.created_at);
          console.log("[VALIDATION-DEBUG] Latest CMYK calibration:", cmykData.created_at);
        }
      }
      
      // Fetch special layer calibration
      const specialLayerResponse = await fetch(`/api/admin/ink-calculator/calibration?type=special_layer`);
      if (specialLayerResponse.ok) {
        const specialLayerData = await specialLayerResponse.json();
        if (specialLayerData.created_at) {
          setLatestSpecialLayerCalibration(specialLayerData.created_at);
          console.log("[VALIDATION-DEBUG] Latest special layer calibration:", specialLayerData.created_at);
        }
      }
    } catch (error) {
      console.error("[VALIDATION-DEBUG] Error fetching calibration data:", error);
    }
  };

  const fetchTestData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/ink-test-data`);
      if (!response.ok) {
        throw new Error("Failed to fetch test data");
      }

      const { data } = await response.json();
      console.log("[VALIDATION-DEBUG] Fetched test data count:", data?.length || 0);
      
      // Filter out entries that don't have image analysis data
      const validData = (data || []).filter((entry: TestDataEntry) => 
        entry.image_analysis && 
        entry.image_analysis.channelCoverage && 
        Object.keys(entry.image_analysis.channelCoverage).length > 0
      );
      
      console.log("[VALIDATION-DEBUG] Valid test data count:", validData.length);
      setTestData(validData);
      
      // Run validation automatically if we have data
      if (validData.length > 0) {
        validateData(validData);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const validateData = async (data = testData) => {
    console.log("[VALIDATION-DEBUG] Starting validation with", data.length, "test entries");
    
    try {
      setLoading(true);
      
      // IMPORTANT: Force reload the calibration from the database before validating
      // This ensures we're using the latest calibration factors
      const { refreshCalibrationFromDatabase } = await import('@/app/tools/ink-calculator/services/calibration-loader');
      await refreshCalibrationFromDatabase();
      
      // Run validation on all test entries using the freshly loaded factors
      const validationResults = await validateTestBatch(data);
      setResults(validationResults);
      
      // Extract predicted and actual values
      const predictedValues: Record<string, number[]> = {};
      const actualValues: Record<string, number[]> = {};
      const areas: number[] = [];
      
      // Collect all channels and prepare data arrays
      const allChannels = new Set<string>();
      validationResults.forEach(result => {
        Object.keys(result.actualValues).forEach(channel => {
          allChannels.add(channel);
        });
      });
      
      // Initialize arrays for each channel
      allChannels.forEach(channel => {
        predictedValues[channel] = [];
        actualValues[channel] = [];
      });
      
      // Populate data arrays and calculate areas
      validationResults.forEach((result, index) => {
        const testEntry = data[index];
        if (testEntry) {
          // Calculate area in square inches
          const { width, height, unit } = testEntry.dimensions;
          const area = unit === 'mm' 
            ? (width / 25.4) * (height / 25.4)  // Convert mm² to in²
            : width * height;
          
          Object.entries(result.actualValues).forEach(([channel, actual]) => {
            const predicted = result.predictedValues[channel] || 0;
            predictedValues[channel].push(predicted);
            actualValues[channel].push(actual);
            areas.push(area);
          });
        }
      });
      
      // Calculate enhanced statistics using the new calculateMAE function
      const accuracyStats = calculateMAE(predictedValues, actualValues, areas);
      setStats(accuracyStats);
      console.log("[VALIDATION-DEBUG] Validation stats:", accuracyStats);
      
      toast.success(`Validation complete for ${validationResults.length} test entries`);
    } catch (error: any) {
      console.error("[VALIDATION-DEBUG] Validation error:", error);
      toast.error(error.message || "Validation failed");
    } finally {
      setLoading(false);
    }
  };
  
  const runCmykAutoTuning = async () => {
    try {
      setOptimizingCmyk(true);
      const response = await fetch(`/api/admin/ink-calculator/optimize-cmyk-factors`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'CMYK optimization failed');
      }
      
      const result = await response.json();
      
      // Show improvement in accuracy
      const beforeError = result.accuracy?.before?.averageError || 0;
      const afterError = result.accuracy?.after?.averageError || 0;
      
      toast.success(`CMYK auto-tuning complete! MAE improved from ${beforeError.toFixed(4)} to ${afterError.toFixed(4)} mL`);
      
      // Refresh calibration timestamp
      await fetchLatestCalibration();
      
      // IMPORTANT: Force reload the calibration from the database before re-validating
      const { refreshCalibrationFromDatabase } = await import('@/app/tools/ink-calculator/services/calibration-loader');
      await refreshCalibrationFromDatabase();
      
      // Now re-validate with the new factors
      await fetchTestData();
    } catch (error: any) {
      toast.error(error.message || "CMYK auto-tuning failed");
    } finally {
      setOptimizingCmyk(false);
    }
  };

  const runSpecialLayerAutoTuning = async () => {
    try {
      setOptimizingSpecialLayers(true);
      const response = await fetch(`/api/admin/ink-calculator/optimize-special-layer-factors`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Special layer optimization failed');
      }
      
      const result = await response.json();
      
      // Show improvement in accuracy
      const beforeError = result.accuracy?.before?.averageError || 0;
      const afterError = result.accuracy?.after?.averageError || 0;
      
      toast.success(`Special layer auto-tuning complete! MAE improved from ${beforeError.toFixed(4)} to ${afterError.toFixed(4)} mL`);
      
      // Refresh calibration timestamp
      await fetchLatestCalibration();
      
      // IMPORTANT: Force reload the calibration from the database before re-validating
      const { refreshCalibrationFromDatabase } = await import('@/app/tools/ink-calculator/services/calibration-loader');
      await refreshCalibrationFromDatabase();
      
      // Now re-validate with the new factors
      await fetchTestData();
    } catch (error: any) {
      toast.error(error.message || "Special layer auto-tuning failed");
    } finally {
      setOptimizingSpecialLayers(false);
    }
  };

  const exportTestResults = () => {
    if (results.length > 0) {
      const exportData = {
        testData: testData,
        validationResults: results,
        stats: stats,
        timestamp: new Date().toISOString(),
        calibrationDate: latestCalibration
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `ink-calculator-results-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Results exported successfully');
    } else {
      toast.error('No results available to export');
    }
  };

  // Function to determine CSS class based on absolute difference
  const getDifferenceClass = (difference: number) => {
    if (difference <= 0.01) return "text-green-600"; // Very good: within 0.01 mL
    if (difference <= 0.05) return "text-amber-600"; // Acceptable: within 0.05 mL
    return "text-red-600";                            // Poor: more than 0.05 mL difference
  };

  // Function to get color for channel visualization
  const getChannelColor = (channel: string): string => {
    const colors: Record<string, string> = {
      cyan: "#00BFFF",
      magenta: "#FF00FF",
      yellow: "#FFFF00",
      black: "#000000",
      white: "#DDDDDD",
      clear: "#CCFFFF",
      gloss: "#AAAAAA",
      primer: "#FFDDAA"
    };
    
    return colors[channel.toLowerCase()] || "#666666";
  };

  // Function to format ml values
  const formatMl = (value: number) => {
    return value.toFixed(4) + " mL";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ink Calculator Validation</h1>
          <p className="text-muted-foreground">
            Validate calculator accuracy against test data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={exportTestResults} 
            disabled={loading || results.length === 0}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button>
          <Button 
            onClick={() => validateData()} 
            disabled={loading || testData.length === 0}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Auto-tuning Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CMYK Channels Calibration</CardTitle>
            <CardDescription>
              Last optimized: {latestCmykCalibration ? new Date(latestCmykCalibration).toLocaleString() : "Never"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="default" 
              onClick={runCmykAutoTuning} 
              disabled={optimizingCmyk || loading || optimizingSpecialLayers}
              className="w-full flex items-center justify-center gap-2">
              {optimizingCmyk ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Optimizing CMYK...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  Auto-Tune CMYK Factors
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Special Layers Calibration</CardTitle>
            <CardDescription>
              Last optimized: {latestSpecialLayerCalibration ? new Date(latestSpecialLayerCalibration).toLocaleString() : "Never"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="default" 
              onClick={runSpecialLayerAutoTuning} 
              disabled={optimizingSpecialLayers || loading || optimizingCmyk}
              className="w-full flex items-center justify-center gap-2">
              {optimizingSpecialLayers ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Optimizing Special Layers...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  Auto-Tune Special Layer Factors
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Summary Card - Now full width */}
      <Card className="mb-8 mt-6">
        <CardHeader>
          <CardTitle>Validation Summary</CardTitle>
          <CardDescription>
            Mean Absolute Error (MAE) measures the average absolute difference between predicted and actual values in mL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestCalibration && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <span className="font-medium">Latest calibration:</span> {formatDate(latestCalibration)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                Auto-tuning optimizes factors to minimize MAE across all test data
              </p>
            </div>
          )}
          
          {stats ? (
            <div className="space-y-6">
              {/* Overall Stats */}
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-2xl font-semibold">Overall MAE: {stats.overall.toFixed(4)} mL</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on {stats.sampleCount} test data points across all ink channels
                  </p>
                </div>
                {optimizingCmyk || optimizingSpecialLayers ? (
                  <div className="flex items-center">
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin text-blue-500" />
                    <span className="text-blue-500">Optimizing factors...</span>
                  </div>
                ) : null}
              </div>
              
              {/* Channel Type Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                {/* Standard Channels */}
                <div className="border p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-3">Standard CMYK Channels</h4>
                  <div className={`text-xl font-semibold ${getDifferenceClass(stats.standardChannelsMAE)}`}>
                    MAE: {stats.standardChannelsMAE.toFixed(4)} mL
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {stats.standardChannelsSampleCount} samples
                  </div>
                </div>
                
                {/* Special Layers */}
                <div className="border p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-3">Special Layers</h4>
                  <div className={`text-xl font-semibold ${getDifferenceClass(stats.specialLayersMAE)}`}>
                    MAE: {stats.specialLayersMAE.toFixed(4)} mL
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {stats.specialLayersSampleCount} samples
                  </div>
                </div>
              </div>
              
              {/* Size-Based Stats */}
              {stats.sizeMetrics && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Size-Based Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Small Prints */}
                    <div className="border p-4 rounded-lg">
                      <h4 className="text-lg font-medium">Small Prints</h4>
                      <p className="text-sm text-muted-foreground mb-3">{"<4 sq inches"}</p>
                      <div className={`text-lg font-medium ${getDifferenceClass(stats.sizeMetrics.small.overall)}`}>
                        Overall: {stats.sizeMetrics.small.overall.toFixed(4)} mL
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <div className="text-sm font-medium">CMYK:</div>
                          <div className={`${getDifferenceClass(stats.sizeMetrics.small.standardChannels)}`}>
                            {stats.sizeMetrics.small.standardChannels.toFixed(4)} mL
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Special:</div>
                          <div className={`${getDifferenceClass(stats.sizeMetrics.small.specialLayers)}`}>
                            {stats.sizeMetrics.small.specialLayers.toFixed(4)} mL
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-3 text-right">
                        {stats.sizeMetrics.small.sampleCount} samples
                      </div>
                    </div>
                    
                    {/* Medium Prints */}
                    <div className="border p-4 rounded-lg">
                      <h4 className="text-lg font-medium">Medium Prints</h4>
                      <p className="text-sm text-muted-foreground mb-3">4-100 sq inches</p>
                      <div className={`text-lg font-medium ${getDifferenceClass(stats.sizeMetrics.medium.overall)}`}>
                        Overall: {stats.sizeMetrics.medium.overall.toFixed(4)} mL
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <div className="text-sm font-medium">CMYK:</div>
                          <div className={`${getDifferenceClass(stats.sizeMetrics.medium.standardChannels)}`}>
                            {stats.sizeMetrics.medium.standardChannels.toFixed(4)} mL
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Special:</div>
                          <div className={`${getDifferenceClass(stats.sizeMetrics.medium.specialLayers)}`}>
                            {stats.sizeMetrics.medium.specialLayers.toFixed(4)} mL
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-3 text-right">
                        {stats.sizeMetrics.medium.sampleCount} samples
                      </div>
                    </div>
                    
                    {/* Large Prints */}
                    <div className="border p-4 rounded-lg">
                      <h4 className="text-lg font-medium">Large Prints</h4>
                      <p className="text-sm text-muted-foreground mb-3">{">100 sq inches"}</p>
                      <div className={`text-lg font-medium ${getDifferenceClass(stats.sizeMetrics.large.overall)}`}>
                        Overall: {stats.sizeMetrics.large.overall.toFixed(4)} mL
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <div className="text-sm font-medium">CMYK:</div>
                          <div className={`${getDifferenceClass(stats.sizeMetrics.large.standardChannels)}`}>
                            {stats.sizeMetrics.large.standardChannels.toFixed(4)} mL
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Special:</div>
                          <div className={`${getDifferenceClass(stats.sizeMetrics.large.specialLayers)}`}>
                            {stats.sizeMetrics.large.specialLayers.toFixed(4)} mL
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-3 text-right">
                        {stats.sizeMetrics.large.sampleCount} samples
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Channel-Specific Stats */}
              <div>
                <h3 className="text-xl font-semibold mb-4">MAE by Channel</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(stats.channelMAE).map(([channel, mae]) => (
                    <div key={channel} className="flex items-center justify-between gap-2 p-3 rounded-lg border">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: getChannelColor(channel) }}
                        ></div>
                        <span className="font-medium capitalize">{channel}</span>
                      </div>
                      <div className={getDifferenceClass(mae)}>
                        <span className="font-medium">{mae.toFixed(4)} mL</span>
                        <div className="text-xs text-muted-foreground">
                          ({stats.channelSampleCounts[channel]} samples)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="font-medium mb-2">Interpretation:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><span className="text-green-600 font-medium">Good:</span> MAE &lt;= 0.01 mL</li>
                  <li><span className="text-amber-600 font-medium">Acceptable:</span> MAE &lt;= 0.05 mL</li>
                  <li><span className="text-red-600 font-medium">Poor:</span> MAE &gt; 0.05 mL</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No validation data available</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="summary">
            <BarChart className="w-4 h-4 mr-2" /> Results Summary
          </TabsTrigger>
          <TabsTrigger value="details">
            Detailed Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="space-y-4">
          {results.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Results Overview</CardTitle>
                <CardDescription>
                  Summary of validation results across all test entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ink Mode</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Channels</TableHead>
                        <TableHead className="text-right">Avg. Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(
                        results.reduce((acc, result) => {
                          const key = `${result.inkMode}_${result.quality}`;
                          if (!acc[key]) {
                            acc[key] = {
                              inkMode: result.inkMode,
                              quality: result.quality,
                              count: 0,
                              totalDifference: 0,
                              channels: new Set()
                            };
                          }
                          
                          acc[key].count++;
                          
                          // Sum of all channel differences
                          const sumDifference = Object.values(result.channelDifferences).reduce((sum, diff) => sum + diff, 0);
                          const channelCount = Object.keys(result.channelDifferences).length;
                          acc[key].totalDifference += sumDifference / (channelCount || 1);
                          
                          // Track all channels
                          Object.keys(result.channelDifferences).forEach(channel => {
                            acc[key].channels.add(channel);
                          });
                          
                          return acc;
                        }, {} as Record<string, any>)
                      ).map(([key, data]) => (
                        <TableRow key={key}>
                          <TableCell>
                            <Badge variant="outline">{data.inkMode}</Badge>
                          </TableCell>
                          <TableCell>{data.quality}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(data.channels as Set<string>).map((channel) => (
                                <div
                                  key={channel}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: getChannelColor(channel) }}
                                  title={channel}
                                ></div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getDifferenceClass(data.totalDifference / data.count)}>
                              {(data.totalDifference / data.count).toFixed(4)} mL
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">({data.count} entries)</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No validation results available</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="details">
          {results.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Test Results</CardTitle>
                <CardDescription>
                  Individual validation results for each test entry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Ink Mode</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead className="text-right">Predicted</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.flatMap(result => 
                        Object.entries(result.channelDifferences).map(([channel, difference]) => (
                          <TableRow key={`${result.testId}_${channel}`}>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                              {result.testId.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{result.inkMode}</Badge>
                            </TableCell>
                            <TableCell>{result.quality}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: getChannelColor(channel) }}
                                ></div>
                                <span>{channel}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatMl(result.predictedValues[channel] || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatMl(result.actualValues[channel])}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={getDifferenceClass(difference)}>
                                {difference.toFixed(4)} mL
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No validation results available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 