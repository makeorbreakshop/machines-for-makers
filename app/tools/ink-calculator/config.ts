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
  gloss: "#DDDDDD",
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
    channels: ["cyan", "magenta", "yellow", "black"],
    passes: 1,
    label: "CMYK",
    group: "Standard",
  },
  WHITE_CMYK: {
    channels: ["white", "cyan", "magenta", "yellow", "black"],
    passes: 2,
    label: "White → CMYK",
    group: "Multi-Pass",
  },
  CMYK_GLOSS: {
    channels: ["cyan", "magenta", "yellow", "black", "gloss"],
    passes: 2,
    label: "CMYK → Gloss Varnish",
    group: "Multi-Pass",
  },
  WHITE_CMYK_GLOSS: {
    channels: ["white", "cyan", "magenta", "yellow", "black", "gloss"],
    passes: 3,
    label: "White → CMYK → Gloss Varnish",
    group: "Multi-Pass",
  },
  STICKER: {
    channels: ["cyan", "magenta", "yellow", "black"],
    passes: 1,
    label: "Sticker",
    group: "Special",
  },
};

// Quality setting multipliers (relative to standard quality)
export const QUALITY_MULTIPLIERS = {
  draft: 0.6,    // 60% of standard ink usage
  standard: 1.0, // Baseline
  high: 1.7,     // 170% of standard ink usage
}; 