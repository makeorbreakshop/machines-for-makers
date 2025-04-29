"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PrintQuality } from "../types";
import { cn } from "@/lib/utils";
import { Zap, Check, Clock } from "lucide-react";

interface QualitySelectorProps {
  selectedQuality: PrintQuality;
  onQualityChange: (quality: PrintQuality) => void;
}

const qualityOptions: {
  value: PrintQuality;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "draft",
    label: "Draft",
    description: "360×360 dpi, fastest print, lowest ink usage",
    icon: <Zap className="h-4 w-4 text-amber-500" />,
  },
  {
    value: "standard",
    label: "Standard",
    description: "720×720 dpi, balanced quality and speed",
    icon: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    value: "high",
    label: "High",
    description: "1440×720 dpi, highest quality, most ink usage",
    icon: <Clock className="h-4 w-4 text-blue-500" />,
  },
];

export default function QualitySelector({
  selectedQuality,
  onQualityChange,
}: QualitySelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">Print Quality</Label>
      <RadioGroup
        value={selectedQuality}
        onValueChange={(value) => onQualityChange(value as PrintQuality)}
        className="space-y-2.5"
      >
        {qualityOptions.map((option) => (
          <label
            key={option.value}
            htmlFor={`quality-${option.value}`}
            className={cn(
              "flex items-center space-x-2 rounded-md border p-3 transition-colors cursor-pointer",
              selectedQuality === option.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "hover:bg-muted/50"
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`quality-${option.value}`}
              className={cn(
                "mt-0.5",
                selectedQuality === option.value ? "border-primary" : ""
              )}
            />
            <div className="grid gap-0.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground">
                  {option.label}
                </span>
                <span className="ml-2">{option.icon}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                {option.description}
              </p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
} 