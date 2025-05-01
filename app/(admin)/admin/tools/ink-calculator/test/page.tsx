"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { standardTestCases, runStandardTests, TestResult } from "@/app/tools/ink-calculator/services/test-utils";

export default function InkCalculatorTestPage() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    averageDifference: number;
  } | null>(null);

  useEffect(() => {
    // Run tests on initial load
    runTests();
  }, []);

  const runTests = async () => {
    try {
      setLoading(true);
      const results = await runStandardTests();
      setTestResults(results.results);
      setSummary(results.summary);
      
      if (results.summary.failed === 0) {
        toast.success("All calculator tests passed!");
      } else {
        toast.error(`${results.summary.failed} tests failed. The calculator needs fixes.`);
      }
    } catch (error: any) {
      console.error("Test error:", error);
      toast.error(error.message || "Failed to run tests");
    } finally {
      setLoading(false);
    }
  };

  // Format mL value with proper precision
  const formatMl = (value: number): string => {
    if (value < 0.001) {
      return "< 0.001";
    }
    return value.toFixed(4);
  };

  // Get CSS class for difference value
  const getDifferenceClass = (difference: number): string => {
    if (difference === 0) return "text-green-500";
    if (difference < 0.001) return "text-green-600";
    if (difference < 0.01) return "text-amber-500";
    return "text-red-500 font-medium";
  };

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ink Calculator Tests</h1>
          <p className="text-muted-foreground">
            Verify that the ink calculator matches validator results exactly
          </p>
        </div>
        <Button
          onClick={runTests}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle>Test Results Summary</CardTitle>
            <CardDescription>
              {summary.passed === summary.total
                ? "All tests passed - calculator matches validator exactly!"
                : `${summary.failed} of ${summary.total} tests failed - calculator results don't match validator`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold">
                    {summary.total > 0
                      ? `${Math.round((summary.passed / summary.total) * 100)}%`
                      : "0%"}
                  </p>
                  {summary.passed === summary.total && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <Progress 
                  value={summary.total > 0 ? (summary.passed / summary.total) * 100 : 0} 
                  className="h-2"
                />
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tests Run</p>
                <p className="text-2xl font-semibold">{summary.total}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average Difference</p>
                <p className="text-2xl font-semibold">
                  {summary.averageDifference < 0.0001
                    ? "< 0.0001 mL"
                    : `${summary.averageDifference.toFixed(4)} mL`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results Table */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle>Detailed Test Results</CardTitle>
          <CardDescription>
            Shows differences between calculator and validator for each test case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Case</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Validator</TableHead>
                <TableHead className="text-right">Calculator</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {loading ? "Running tests..." : "No test results yet. Run tests to see results."}
                  </TableCell>
                </TableRow>
              ) : (
                testResults.flatMap((result, testIndex) => 
                  Object.keys(result.validatorResults).flatMap((channel, channelIndex) => {
                    const validatorValue = result.validatorResults[channel] || 0;
                    const calculatorValue = result.calculatorResults[channel] || 0;
                    const difference = result.differences[channel] || 0;
                    
                    return (
                      <TableRow key={`${testIndex}-${channel}`}>
                        {channelIndex === 0 && (
                          <TableCell rowSpan={Object.keys(result.validatorResults).length} className="align-top">
                            <div className="font-medium mb-1">{result.testCase.description || `Test #${testIndex + 1}`}</div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {result.testCase.inkMode}, {result.testCase.quality}, {result.testCase.width}×{result.testCase.height} {result.testCase.unit}
                            </div>
                            <Badge 
                              variant={result.passed ? "outline" : "destructive"}
                              className={result.passed ? "bg-green-50" : undefined}
                            >
                              {result.passed ? "PASSED" : "FAILED"}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="capitalize font-medium">{channel}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatMl(validatorValue)} mL</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatMl(calculatorValue)} mL</TableCell>
                        <TableCell className={`text-right font-mono text-sm ${getDifferenceClass(difference)}`}>
                          {difference === 0 ? "0.0000" : formatMl(difference)} mL
                        </TableCell>
                        <TableCell className="text-center">
                          {difference < 0.0001 ? (
                            <CheckCircle className="h-4 w-4 text-green-500 inline" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500 inline" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 