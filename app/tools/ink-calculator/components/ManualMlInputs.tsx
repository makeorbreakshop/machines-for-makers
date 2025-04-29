"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InkMode, ChannelMlValues } from "../types";
import { CHANNEL_COLORS, INK_MODES } from "../config";

interface ManualMlInputsProps {
  inkMode: string;
  values: ChannelMlValues;
  onChange: (values: ChannelMlValues) => void;
}

export default function ManualMlInputs({
  inkMode,
  values,
  onChange,
}: ManualMlInputsProps) {
  const [inputs, setInputs] = useState<ChannelMlValues>(values);
  const inkModeObj = INK_MODES[inkMode] as InkMode;

  // Update local state when ink mode changes
  useEffect(() => {
    // Initialize values for all channels in the current ink mode
    const initializedValues = { ...values };
    
    if (inkModeObj) {
      inkModeObj.channels.forEach((channel) => {
        if (initializedValues[channel] === undefined) {
          initializedValues[channel] = 0;
        }
      });
    }
    
    setInputs(initializedValues);
  }, [inkMode, values, inkModeObj]);

  const handleInputChange = (channel: string, value: string) => {
    const numValue = parseFloat(value);
    const updatedInputs = {
      ...inputs,
      [channel]: isNaN(numValue) ? 0 : Math.max(0, numValue),
    };
    
    setInputs(updatedInputs);
    onChange(updatedInputs);
  };

  // Function to get color safely with a fallback
  const getChannelColor = (channel: string): string => {
    return (CHANNEL_COLORS as Record<string, string>)[channel] || "#AAAAAA";
  };

  if (!inkModeObj) {
    return <div className="text-sm text-muted-foreground">Invalid ink mode selected</div>;
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Manual Ink Values</h3>
        <p className="text-xs text-muted-foreground">
          Enter actual mL values for more accurate calculations
        </p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {inkModeObj.channels.map((channel) => (
          <div key={channel} className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getChannelColor(channel) }}
              />
              <Label htmlFor={`ml-${channel}`} className="capitalize text-sm">
                {channel}
              </Label>
            </div>
            <Input
              id={`ml-${channel}`}
              type="number"
              min="0"
              step="0.001"
              value={inputs[channel] || ""}
              onChange={(e) => handleInputChange(channel, e.target.value)}
              placeholder="0.000"
              className="h-9"
            />
          </div>
        ))}
      </div>
    </div>
  );
} 