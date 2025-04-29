import { ChannelMlValues, InkMode, InkUsageResult, CostResult, PrintQuality, DimensionUnit, ImageAnalysisResult, ChannelCoverageValues } from "./types";
import { QUALITY_MULTIPLIERS, DEFAULT_ML_PER_SET } from "./config";
import colorConvert from 'color-convert';

/**
 * Convert dimensions from mm to inches if needed
 */
export function normalizeSize(
  width: number,
  height: number,
  unit: DimensionUnit
): { width: number; height: number } {
  if (unit === "mm") {
    return {
      width: width / 25.4,
      height: height / 25.4,
    };
  }
  return { width, height };
}

/**
 * Convert RGB to CMYK and calculate channel coverage
 */
function calculateChannelCoverage(r: number, g: number, b: number, a: number): ChannelCoverageValues {
  // Convert RGB to CMYK
  // The resulting array contains [C, M, Y, K] values from 0-100
  const cmyk = colorConvert.rgb.cmyk([r, g, b]);
  
  // Normalize to 0-1 range for coverage calculations
  const c = cmyk[0] / 100;
  const m = cmyk[1] / 100;
  const y = cmyk[2] / 100;
  const k = cmyk[3] / 100;
  
  // Apply alpha transparency factor
  return {
    cyan: c * a,
    magenta: m * a,
    yellow: y * a,
    black: k * a
  };
}

/**
 * Process an uploaded image to estimate ink coverage
 */
export async function processImage(
  file: File
): Promise<ImageAnalysisResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Extract original image dimensions
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        // Create a canvas to sample the image
        const canvas = document.createElement("canvas");
        // Scale down for performance if image is large
        const scaleFactor = Math.min(1, 1000 / Math.max(img.width, img.height));
        const width = Math.floor(img.width * scaleFactor);
        const height = Math.floor(img.height * scaleFactor);
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        const { data, width: imgWidth, height: imgHeight } = imageData;
        
        // Initialize coverage tracking
        let totalCoverage = 0;
        let totalPixels = imgWidth * imgHeight;
        const channelCoverage: ChannelCoverageValues = {
          cyan: 0,
          magenta: 0,
          yellow: 0,
          black: 0
        };
        
        // Sample rate - higher value means fewer samples for better performance
        // For a 1000x1000 image, sampling every 10th pixel gives 10,000 samples
        const sampleRate = 10;
        let sampledPixels = 0;
        
        // Sample pixels to determine coverage
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3] / 255; // Alpha is 0-255, normalize to 0-1
          
          // Skip transparent pixels
          if (a < 0.1) {
            totalPixels--;
            continue;
          }
          
          // Calculate coverage for each channel
          const pixelCoverage = calculateChannelCoverage(r, g, b, a);
          
          // Update channel coverage totals
          channelCoverage.cyan += pixelCoverage.cyan;
          channelCoverage.magenta += pixelCoverage.magenta;
          channelCoverage.yellow += pixelCoverage.yellow;
          channelCoverage.black += pixelCoverage.black;
          
          // Calculate overall coverage (using the standard formula for brightness)
          // Using the formula: (0.299*R + 0.587*G + 0.114*B)
          const pixelBrightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const pixelOverallCoverage = (1 - pixelBrightness) * a;
          totalCoverage += pixelOverallCoverage;
          
          sampledPixels++;
        }
        
        // Normalize coverage values
        const avgCoverage = totalPixels > 0 ? totalCoverage / sampledPixels : 0;
        
        // Normalize channel coverage
        if (sampledPixels > 0) {
          channelCoverage.cyan /= sampledPixels;
          channelCoverage.magenta /= sampledPixels;
          channelCoverage.yellow /= sampledPixels;
          channelCoverage.black /= sampledPixels;
        }
        
        resolve({
          coverage: avgCoverage,
          channelCoverage,
          imageUrl: URL.createObjectURL(file),
          dimensions: {
            width: originalWidth,
            height: originalHeight
          }
        });
      };
      
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      
      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate ink usage based on image coverage, dimensions, and settings
 */
export function calculateInkUsage(
  coverage: number,
  width: number,
  height: number,
  unit: DimensionUnit,
  inkMode: InkMode,
  quality: PrintQuality,
  manualValues?: ChannelMlValues,
  channelCoverage?: ChannelCoverageValues
): InkUsageResult {
  // If manual values are provided, use those directly
  if (manualValues) {
    const totalMl = Object.values(manualValues).reduce((sum, ml) => sum + ml, 0);
    return {
      totalMl,
      channelMl: manualValues,
      coverage,
      channelCoverage
    };
  }

  // Normalize dimensions to inches
  const dimensions = normalizeSize(width, height, unit);
  const area = dimensions.width * dimensions.height;
  
  // Apply quality setting multiplier
  const qualityMultiplier = QUALITY_MULTIPLIERS[quality];
  
  // Base values - these would be calibrated with actual test print data
  // These are placeholder values that would be refined with real data
  const baseInkPerSquareInch = 0.05; // ml per square inch at 100% coverage
  
  const channelMl: ChannelMlValues = {};
  
  // Calculate ink usage for each channel
  inkMode.channels.forEach((channel) => {
    let channelCoverageValue = coverage;
    
    // Use channel-specific coverage if available
    if (channelCoverage && channel in channelCoverage) {
      channelCoverageValue = channelCoverage[channel];
    } else {
      // Adjust coverage for white, clear and primer differently
      if (channel === "white") {
        // White is often used as an underbase or highlight
        channelCoverageValue = Math.min(0.85, coverage * 1.2);
      } else if (channel === "clear") {
        // Clear is typically a flat layer
        channelCoverageValue = 0.7;
      } else if (channel === "primer") {
        // Primer is typically a thin consistent layer
        channelCoverageValue = 0.5;
      }
    }
    
    // Calculate ml for this channel
    const ml = channelCoverageValue * area * baseInkPerSquareInch * qualityMultiplier;
    channelMl[channel] = Number(ml.toFixed(3));
  });
  
  const totalMl = Object.values(channelMl).reduce((sum, ml) => sum + ml, 0);
  
  return {
    totalMl: Number(totalMl.toFixed(3)),
    channelMl,
    coverage,
    channelCoverage
  };
}

/**
 * Calculate cost based on ink usage and pricing
 */
export function calculateCost(
  inkUsage: InkUsageResult,
  inkPackagePrice: number,
  totalMlPerSet: number = DEFAULT_ML_PER_SET
): CostResult {
  // Calculate cost per ml of ink
  const costPerMl = inkPackagePrice / totalMlPerSet;
  
  // Calculate cost for each channel
  const channelBreakdown: ChannelMlValues = {};
  Object.entries(inkUsage.channelMl).forEach(([channel, ml]) => {
    channelBreakdown[channel] = Number((ml * costPerMl).toFixed(2));
  });
  
  // Calculate total cost per print
  const costPerPrint = Object.values(channelBreakdown).reduce(
    (sum, cost) => sum + cost,
    0
  );
  
  // Calculate how many prints can be made with one set
  const printsPerSet = Math.floor(totalMlPerSet / inkUsage.totalMl);
  
  return {
    costPerPrint: Number(costPerPrint.toFixed(2)),
    printsPerSet,
    channelBreakdown,
  };
} 