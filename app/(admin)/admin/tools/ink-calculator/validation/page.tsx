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
import { BarChart, RefreshCw, Settings } from "lucide-react";
import { validateTestBatch, calculateMAEStats } from "@/app/tools/ink-calculator/services/validation";
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

export default function ValidationPage() {
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [testData, setTestData] = useState<TestDataEntry[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [latestCalibration, setLatestCalibration] = useState<string | null>(null);

  useEffect(() => {
    // Fetch test data on mount
    fetchTestData();
    fetchLatestCalibration();
  }, []);

  const fetchLatestCalibration = async () => {
    try {
      const response = await fetch(`/api/admin/ink-calculator/calibration`);
      if (!response.ok) {
        console.warn("Failed to fetch calibration data");
        return;
      }

      const data = await response.json();
      if (data.created_at) {
        setLatestCalibration(data.created_at);
      }
    } catch (error) {
      console.error("Error fetching calibration data:", error);
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
      
      // Run validation on all test entries using the static factors
      const validationResults = await validateTestBatch(data);
      setResults(validationResults);
      
      // Calculate overall stats using MAE
      const accuracyStats = calculateMAEStats(validationResults);
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
  
  const runAutoTuning = async () => {
    try {
      setOptimizing(true);
      const response = await fetch(`/api/admin/ink-calculator/optimize-factors`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Optimization failed');
      }
      
      const result = await response.json();
      
      // Show improvement in accuracy
      const beforeError = result.accuracy?.before?.averageError || 0;
      const afterError = result.accuracy?.after?.averageError || 0;
      
      toast.success(`Auto-tuning complete! MAE improved from ${beforeError.toFixed(4)} to ${afterError.toFixed(4)} mL`);
      
      // Refresh calibration timestamp
      fetchLatestCalibration();
      
      // Re-validate with new factors
      await fetchTestData();
    } catch (error: any) {
      toast.error(error.message || "Auto-tuning failed");
    } finally {
      setOptimizing(false);
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
            onClick={() => validateData()} 
            disabled={loading || testData.length === 0}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            onClick={runAutoTuning} 
            disabled={optimizing || testData.length === 0}
            variant="default"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${optimizing ? "animate-spin" : ""}`} />
            Auto-Tune Factors
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Summary Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Validation Summary</span>
              <Button variant="outline" size="sm" onClick={() => fetchTestData()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
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
                <div>
                  <h3 className="text-xl font-semibold mb-2">Overall MAE: {stats.overallMAE.toFixed(4)} mL</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Based on {stats.sampleCount} test data points across all ink channels.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">MAE by Channel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(stats.channelMAE).map(([channel, mae]) => (
                      <div key={channel} className="flex items-center justify-between gap-2 p-2 rounded border">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: getChannelColor(channel) }}
                          ></div>
                          <span className="font-medium capitalize">{channel}</span>
                        </div>
                        <div className={getDifferenceClass(mae as number)}>
                          {(mae as number).toFixed(4)} mL
                          <span className="text-xs ml-1 text-muted-foreground">
                            ({stats.channelSampleCounts[channel]} samples)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mt-4">
                  <p><strong>Interpretation:</strong></p>
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
        
        {/* Auto-tuning Card */}
        <Card>
          <CardHeader>
            <CardTitle>Auto-Tuning</CardTitle>
            <CardDescription>
              Optimize calibration factors to minimize mean absolute error
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              The auto-tuning process applies a systematic optimization to find the best set of 
              calibration factors that minimize the overall error across all available test data.
            </p>
            
            {latestCalibration && (
              <div className="text-sm mb-4">
                <p><span className="font-medium">Last optimization:</span> {formatDate(latestCalibration)}</p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mb-6">
              This process may take several seconds to complete depending on the amount of test data.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={runAutoTuning} 
              disabled={optimizing || testData.length < 5}
            >
              <Settings className={`mr-2 h-4 w-4 ${optimizing ? "animate-spin" : ""}`} />
              {optimizing ? "Optimizing..." : "Run Auto-Tuning"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
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