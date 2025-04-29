"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DimensionUnit } from "../types";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DimensionInputsProps {
  width: number;
  height: number;
  unit: DimensionUnit;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onUnitChange: (unit: DimensionUnit) => void;
  imageDimensions?: { width: number; height: number } | null;
}

export default function DimensionInputs({
  width,
  height,
  unit,
  onWidthChange,
  onHeightChange,
  onUnitChange,
  imageDimensions,
}: DimensionInputsProps) {
  // Local state for input validation
  const [widthError, setWidthError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    
    if (isNaN(value)) {
      setWidthError("Please enter a valid number");
      return;
    }
    
    if (value <= 0) {
      setWidthError("Width must be greater than zero");
      return;
    }
    
    if (value > 1000) {
      setWidthError("Value is too large");
      return;
    }
    
    setWidthError(null);
    onWidthChange(value);
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    
    if (isNaN(value)) {
      setHeightError("Please enter a valid number");
      return;
    }
    
    if (value <= 0) {
      setHeightError("Height must be greater than zero");
      return;
    }
    
    if (value > 1000) {
      setHeightError("Value is too large");
      return;
    }
    
    setHeightError(null);
    onHeightChange(value);
  };

  // Original image dimension display text
  const imageDimensionsText = imageDimensions 
    ? `Original: ${imageDimensions.width}×${imageDimensions.height}px`
    : null;

  // Calculate aspect ratio if image dimensions exist
  const aspectRatio = imageDimensions
    ? (imageDimensions.width / imageDimensions.height).toFixed(2)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-medium text-foreground">Print Dimensions</h3>
        
        {imageDimensions && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center text-xs text-muted-foreground cursor-help">
                  <Info className="h-3.5 w-3.5 mr-1.5" />
                  <span>Original dimensions</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{imageDimensionsText}</p>
                <p className="mt-1">Aspect ratio: {aspectRatio}:1</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="width" className="text-sm">Width</Label>
          <div className="relative">
            <Input
              id="width"
              type="number"
              min="0.1"
              step="0.1"
              value={width || ""}
              onChange={handleWidthChange}
              className={cn(
                "pr-10 transition-all",
                widthError ? "border-destructive focus-visible:ring-destructive/25" : ""
              )}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-medium text-muted-foreground">
              {unit}
            </div>
          </div>
          {widthError && (
            <div className="flex items-center text-xs text-destructive mt-1.5">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              {widthError}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="height" className="text-sm">Height</Label>
          <div className="relative">
            <Input
              id="height"
              type="number"
              min="0.1"
              step="0.1"
              value={height || ""}
              onChange={handleHeightChange}
              className={cn(
                "pr-10 transition-all",
                heightError ? "border-destructive focus-visible:ring-destructive/25" : ""
              )}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-medium text-muted-foreground">
              {unit}
            </div>
          </div>
          {heightError && (
            <div className="flex items-center text-xs text-destructive mt-1.5">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              {heightError}
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-muted/30 rounded-md p-2">
        <RadioGroup
          value={unit}
          onValueChange={(value) => onUnitChange(value as DimensionUnit)}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="in" id="in" />
            <Label htmlFor="in" className="cursor-pointer text-sm">Inches</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mm" id="mm" />
            <Label htmlFor="mm" className="cursor-pointer text-sm">Millimeters</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
} 