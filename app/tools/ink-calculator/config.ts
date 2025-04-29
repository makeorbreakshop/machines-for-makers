import { InkMode } from "./types";

// Ink channel colors for visualization
export const CHANNEL_COLORS = {
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  yellow: "#FFFF00",
  black: "#000000",
  white: "#FFFFFF",
  clear: "#AAAAAA",
  primer: "#555555",
};

// Default ink package price in USD
export const DEFAULT_INK_PACKAGE_PRICE = 300;

// Default total ML per ink set (standard CMYK set)
export const DEFAULT_ML_PER_SET = 600;

// File size limit in bytes (20 MB)
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Accepted file types
export const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"];

// Ink modes configuration
export const INK_MODES: Record<string, InkMode> = {
  CMYK: {
    id: "CMYK",
    channels: ["cyan", "magenta", "yellow", "black"],
    passes: 1,
    label: "CMYK",
    group: "Single-Pass",
  },
  WHITE_CMYK: {
    id: "WHITE_CMYK",
    channels: ["white", "cyan", "magenta", "yellow", "black"],
    passes: 2,
    label: "White + CMYK",
    group: "Multi-Pass",
  },
  CMYK_WHITE: {
    id: "CMYK_WHITE",
    channels: ["cyan", "magenta", "yellow", "black", "white"],
    passes: 2,
    label: "CMYK + White",
    group: "Multi-Pass",
  },
  CMYK_CLEAR: {
    id: "CMYK_CLEAR",
    channels: ["cyan", "magenta", "yellow", "black", "clear"],
    passes: 2,
    label: "CMYK + Clear",
    group: "Multi-Pass",
  },
  WHITE_CMYK_CLEAR: {
    id: "WHITE_CMYK_CLEAR",
    channels: ["white", "cyan", "magenta", "yellow", "black", "clear"],
    passes: 3,
    label: "White + CMYK + Clear",
    group: "Multi-Pass",
  },
  PRIMER_CMYK: {
    id: "PRIMER_CMYK",
    channels: ["primer", "cyan", "magenta", "yellow", "black"],
    passes: 2,
    label: "Primer + CMYK",
    group: "Multi-Pass",
  },
  CMYKW_DOUBLE: {
    id: "CMYKW_DOUBLE",
    channels: ["cyan", "magenta", "yellow", "black", "white"],
    passes: 2,
    label: "CMYK + White (Double Pass)",
    group: "Double-Pass",
  },
};

// Quality setting multipliers (relative to standard quality)
export const QUALITY_MULTIPLIERS = {
  draft: 0.6,    // 60% of standard ink usage
  standard: 1.0, // Baseline
  high: 1.7,     // 170% of standard ink usage
}; 