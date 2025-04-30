"use client";

import { CostResult, ChannelCoverageValues, InkUsageResult } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, InfoIcon, HelpCircle } from "lucide-react";
import { CHANNEL_COLORS } from "../config";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ResultsDisplayProps {
  costResults: CostResult | null;
  totalMl: number | null;
  imageUrl: string | null;
  channelCoverage?: ChannelCoverageValues | null;
  inkUsage?: InkUsageResult | null;
}

export default function ResultsDisplay({
  costResults,
  totalMl,
  imageUrl,
  channelCoverage,
  inkUsage,
}: ResultsDisplayProps) {
  if (!costResults) {
    return (
      <Card className="bg-card border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-semibold">Cost Results</CardTitle>
              <CardDescription>
                Based on your inputs and ink coverage
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[220px] text-sm">Upload an image and complete the Print Specifications to see cost results here.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="pb-6 pt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-8 w-8 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[220px] text-sm">This calculator requires an uploaded image to analyze ink coverage and calculate costs accurately.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-muted-foreground max-w-xs font-medium">
              Upload an image and enter specifications to see results
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the max value for scaling the bars
  const maxChannelValue = Math.max(
    ...Object.values(costResults.channelBreakdown)
  );
  
  // Safe function to get channel color
  const getChannelColor = (channel: string): string => {
    return (CHANNEL_COLORS as Record<string, string>)[channel] || "#AAAAAA";
  };

  // Function to format cost value with threshold
  const formatCost = (value: number): string => {
    // For very small values, ensure we show something meaningful
    if (value < 0.0001) {
      return "< $0.0001";
    }
    
    // Format with 4 decimal places for currency values
    return value.toFixed(4);
  };

  // Function to format ml value
  const formatMl = (value: number): string => {
    if (value < 0.001) {
      return "< 0.001";
    }
    return value.toFixed(4);
  };

  // Function to copy results to clipboard
  const copyResults = () => {
    const text = `
UV Print Cost Calculation Results:
------------------------
Cost per print: $${formatCost(costResults.costPerPrint)}
Prints per ink set: ${costResults.printsPerSet === Infinity ? "999,999+" : costResults.printsPerSet}
Total ink usage: ${totalMl?.toFixed(4) || "N/A"} mL

Channel Breakdown:
${Object.entries(costResults.channelBreakdown)
  .map(
    ([channel, cost]) => {
      const mlValue = inkUsage?.channelMl[channel] || 0;
      return `${channel.charAt(0).toUpperCase() + channel.slice(1)}: $${formatCost(cost)} (${formatMl(mlValue)} mL)${channelCoverage && channelCoverage[channel] ? ` (Coverage: ${(channelCoverage[channel] * 100).toFixed(1)}%)` : ''}`;
    }
  )
  .join("\n")}

Generated with the UV Printer Ink Cost Calculator
https://machinesformakers.com/tools/ink-calculator
    `.trim();

    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="pb-3 bg-card">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">Cost Results</CardTitle>
            <CardDescription>
              Based on your inputs and ink coverage
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyResults}
                  className="h-8 transition-all hover:shadow-sm"
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  <span>Copy</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy results to clipboard</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pt-5 pb-4">
        <div className="grid grid-cols-1 gap-8">
          {/* Primary Results */}
          <div className="flex flex-wrap justify-between items-start gap-6">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                Cost per Print
              </h4>
              <p className="text-4xl font-bold text-foreground">
                ${formatCost(costResults.costPerPrint)}
              </p>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                Prints per Ink Set
              </h4>
              <p className="text-2xl font-semibold text-foreground">
                {costResults.printsPerSet === Infinity ? "999,999+" : costResults.printsPerSet.toLocaleString()}
              </p>
            </div>
            
            {totalMl && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Total Ink Usage
                </h4>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-medium text-foreground">{totalMl.toFixed(3)} mL</p>
                  <Badge variant="outline" className="font-normal text-xs">per print</Badge>
                </div>
              </div>
            )}
          </div>
          
          {/* Channel Breakdown - Simplified */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-medium">Channel Breakdown</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[220px] text-sm">
                      Shows ink usage by color channel. Each bar represents the proportion of ink cost, with coverage percentage displayed when available.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="space-y-5">
              {Object.entries(costResults.channelBreakdown).map(
                ([channel, cost], index) => {
                  const mlValue = inkUsage?.channelMl[channel] || 0;
                  const coverage = channelCoverage && channelCoverage[channel] 
                    ? `${(channelCoverage[channel] * 100).toFixed(1)}%` 
                    : null;
                  
                  return (
                    <div key={channel} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                            style={{ backgroundColor: getChannelColor(channel) }}
                          />
                          <span className="capitalize font-medium">{channel}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {coverage && (
                            <Badge variant="secondary" className="font-normal text-xs">
                              {coverage} coverage
                            </Badge>
                          )}
                          <span className="font-medium">${formatCost(cost)}</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatMl(mlValue)} mL)
                          </span>
                        </div>
                      </div>
                      <div className="h-3 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            "animate-in slide-in-from-left"
                          )}
                          style={{
                            width: `${(cost / maxChannelValue) * 100}%`,
                            backgroundColor: getChannelColor(channel),
                            animationDelay: `${index * 75}ms`,
                            animationDuration: "400ms",
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/10 px-6 py-3 text-xs text-muted-foreground border-t">
        <p>
          <span className="font-medium">Note:</span> These calculations are estimates based on general ink usage
          patterns. Actual results may vary based on printer model, specific
          ink formulations, and substrate properties.
        </p>
      </CardFooter>
    </Card>
  );
} 