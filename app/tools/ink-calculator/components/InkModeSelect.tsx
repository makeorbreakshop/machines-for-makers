"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { INK_MODES } from "../config";
import { InkMode } from "../types";

// Group ink modes by their group property
const groupedInkModes = Object.values(INK_MODES).reduce(
  (groups, mode) => {
    if (!groups[mode.group]) {
      groups[mode.group] = [];
    }
    groups[mode.group].push(mode);
    return groups;
  },
  {} as Record<string, InkMode[]>
);

interface InkModeSelectProps {
  selectedMode: string;
  onModeChange: (modeId: string) => void;
}

export default function InkModeSelect({
  selectedMode,
  onModeChange,
}: InkModeSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="ink-mode">Ink Mode</Label>
      <Select value={selectedMode} onValueChange={onModeChange}>
        <SelectTrigger id="ink-mode">
          <SelectValue placeholder="Select ink configuration" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedInkModes).map(([group, modes]) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {modes.map((mode) => (
                <SelectItem key={mode.id} value={mode.id}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 