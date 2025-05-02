"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ValidationDetailViewProps {
  testData: {
    id: string;
    ink_mode: string;
    quality: string;
    dimensions: {
      width: number;
      height: number;
      unit: string;
    };
    image_analysis: {
      totalCoverage: number;
      channelCoverage: Record<string, number>;
    };
  };
  result: {
    predictedValues: Record<string, number>;
    actualValues: Record<string, number>;
    channelDifferences: Record<string, number>;
  };
  calibrationFactors: {
    channelScalingFactors: Record<string, number>;
    baseConsumption: Record<string, number>;
    qualityChannelMultipliers: Record<string, Record<string, number>>;
  };
}

export default function ValidationDetailView({ testData, result, calibrationFactors }: ValidationDetailViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("results");
  
  const getChannelColor = (channel: string): string => {
    switch (channel) {
      case 'cyan': return 'rgb(0, 200, 255)';
      case 'magenta': return 'rgb(255, 0, 255)';
      case 'yellow': return 'rgb(255, 255, 0)';
      case 'black': return 'rgb(0, 0, 0)';
      case 'white': return 'rgb(255, 255, 255)';
      case 'gloss': return 'rgb(120, 120, 255)';
      case 'clear': return 'rgb(220, 220, 220)';
      case 'primer': return 'rgb(255, 200, 170)';
      default: return 'rgb(150, 150, 150)';
    }
  };
  
  const getDifferenceClass = (difference: number) => {
    return Math.abs(difference) <= 0.01 
      ? "text-green-600 dark:text-green-400" 
      : Math.abs(difference) <= 0.05 
        ? "text-amber-600 dark:text-amber-400" 
        : "text-red-600 dark:text-red-400";
  };
  
  // Helper to calculate print area in square inches
  const calculateArea = () => {
    const { width, height, unit } = testData.dimensions;
    return unit === 'mm' 
      ? (width / 25.4) * (height / 25.4)  // Convert mm² to in²
      : width * height;
  };
  
  // Calculate raw consumption before calibration factors
  const calculateRawConsumption = (channel: string) => {
    const coverage = testData.image_analysis.channelCoverage[channel] || 0;
    const area = calculateArea();
    return coverage * area * 0.01; // Raw value without scaling factors
  };
  
  // Calculate predicted consumption after calibration factors
  const calculatePredictedConsumption = (channel: string) => {
    // Extract scaling factor or use 0 if not available
    const scalingFactor = calibrationFactors.channelScalingFactors[channel] || 0;
    const rawConsumption = calculateRawConsumption(channel);
    return rawConsumption * scalingFactor;
  };
  
  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Test ID: {testData.id}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{testData.ink_mode}</Badge>
              <Badge variant="outline">{testData.quality}</Badge>
              <span>
                {testData.dimensions.width} × {testData.dimensions.height} {testData.dimensions.unit}
              </span>
              <span>({calculateArea().toFixed(2)} in²)</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1">{expanded ? 'Hide Details' : 'Show Details'}</span>
          </Button>
        </div>
        
        {/* Always visible results summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 rounded-lg border">
            <h4 className="text-sm font-medium mb-2">Overall Coverage</h4>
            <div className="text-2xl font-bold">{testData.image_analysis.totalCoverage.toFixed(2)}%</div>
          </div>
          
          <div className="p-3 rounded-lg border">
            <h4 className="text-sm font-medium mb-2">Total Predicted</h4>
            <div className="text-2xl font-bold">
              {Object.values(result.predictedValues).reduce((a, b) => a + b, 0).toFixed(4)} mL
            </div>
          </div>
          
          <div className="p-3 rounded-lg border">
            <h4 className="text-sm font-medium mb-2">Total Actual</h4>
            <div className="text-2xl font-bold">
              {Object.values(result.actualValues).reduce((a, b) => a + b, 0).toFixed(4)} mL
            </div>
          </div>
        </div>
        
        {/* Channel results summary */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead className="text-right">Predicted (mL)</TableHead>
                <TableHead className="text-right">Actual (mL)</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(result.actualValues).map(([channel, actual]) => (
                <TableRow key={channel}>
                  <TableCell>
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2 border" 
                        style={{ backgroundColor: getChannelColor(channel) }}
                      ></div>
                      <span className="capitalize">{channel}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {(testData.image_analysis.channelCoverage[channel] || 0).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {(result.predictedValues[channel] || 0).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {actual.toFixed(4)}
                  </TableCell>
                  <TableCell className={`text-right ${getDifferenceClass(result.channelDifferences[channel] || 0)}`}>
                    {(result.channelDifferences[channel] || 0).toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Expanded detailed breakdown */}
        {expanded && (
          <div className="mt-6 pt-4 border-t">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="results">Result Breakdown</TabsTrigger>
                <TabsTrigger value="calibration">Calibration Factors</TabsTrigger>
                <TabsTrigger value="calculation">Calculation Steps</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead className="text-right">Raw Value</TableHead>
                        <TableHead className="text-right">Scaling Factor</TableHead>
                        <TableHead className="text-right">Base Consumption</TableHead>
                        <TableHead className="text-right">Quality Multiplier</TableHead>
                        <TableHead className="text-right">Predicted (mL)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(result.predictedValues).map(([channel, predicted]) => (
                        <TableRow key={channel}>
                          <TableCell>
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2 border" 
                                style={{ backgroundColor: getChannelColor(channel) }}
                              ></div>
                              <span className="capitalize">{channel}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {calculateRawConsumption(channel).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(calibrationFactors.channelScalingFactors[channel] || 0).toFixed(8)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(calibrationFactors.baseConsumption[channel] || 0).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(calibrationFactors.qualityChannelMultipliers[testData.quality]?.[channel] || 1).toFixed(2)}×
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {predicted.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="calibration">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Channel Scaling Factors</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Channel</TableHead>
                            <TableHead className="text-right">Factor Value</TableHead>
                            <TableHead className="text-right">Expected Range</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(calibrationFactors.channelScalingFactors).map(([channel, factor]) => (
                            <TableRow key={channel}>
                              <TableCell>{channel}</TableCell>
                              <TableCell className="text-right font-mono">
                                {factor.toFixed(8)}
                              </TableCell>
                              <TableCell className="text-right">
                                {['cyan', 'magenta', 'yellow', 'black'].includes(channel) ? (
                                  <span className={factor < 0.01 ? "text-red-500" : "text-green-500"}>
                                    0.01 - 0.1
                                  </span>
                                ) : (
                                  <span className={factor < 0.1 ? "text-red-500" : "text-green-500"}>
                                    0.1 - 1.0
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Base Consumption (mL)</h4>
                      <pre className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-40">
                        {JSON.stringify(calibrationFactors.baseConsumption, null, 2)}
                      </pre>
                    </div>
                    
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Quality Multipliers</h4>
                      <pre className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-40">
                        {JSON.stringify(calibrationFactors.qualityChannelMultipliers, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="calculation">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-900">
                    <h4 className="font-medium mb-2">Calculation Formula</h4>
                    <div className="font-mono text-sm">
                      <p>For each channel:</p>
                      <div className="p-2 mt-2 bg-white dark:bg-gray-800 rounded border">
                        <p>1. raw = coverage × area × 0.01</p>
                        <p>2. scaled = raw × channelScalingFactor</p>
                        <p>3. withBase = scaled + baseConsumption</p>
                        <p>4. withQuality = withBase × qualityMultiplier</p>
                        <p>5. predicted = withQuality</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Channel</TableHead>
                          <TableHead className="text-right">Coverage (%)</TableHead>
                          <TableHead className="text-right">Area (in²)</TableHead>
                          <TableHead className="text-right">Raw Value</TableHead>
                          <TableHead className="text-right">After Scaling</TableHead>
                          <TableHead className="text-right">Final Predicted (mL)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(result.predictedValues).map(([channel, predicted]) => {
                          const coverage = testData.image_analysis.channelCoverage[channel] || 0;
                          const area = calculateArea();
                          const raw = coverage * area * 0.01;
                          const scalingFactor = calibrationFactors.channelScalingFactors[channel] || 0;
                          const afterScaling = raw * scalingFactor;
                          
                          return (
                            <TableRow key={channel}>
                              <TableCell>{channel}</TableCell>
                              <TableCell className="text-right">{coverage.toFixed(2)}%</TableCell>
                              <TableCell className="text-right">{area.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{raw.toFixed(4)}</TableCell>
                              <TableCell className="text-right">{afterScaling.toFixed(4)}</TableCell>
                              <TableCell className="text-right font-bold">{predicted.toFixed(4)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 