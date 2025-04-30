/**
 * Enhanced color analysis service for the UV Printer Ink Calculator
 * Provides RGB to CMYK conversion and channel-specific coverage analysis
 */

import { ChannelCoverageValues } from '../types';

/**
 * RGB to CMYK conversion constants
 */
const RGB_MAX = 255;
const CMY_MAX = 100;
const K_MAX = 100;

/**
 * Converts RGB to CMYK color space
 * @param r Red channel (0-255)
 * @param g Green channel (0-255)
 * @param b Blue channel (0-255)
 * @returns CMYK values as [C, M, Y, K] (0-100 percentage values)
 */
export function rgbToCmyk(r: number, g: number, b: number): [number, number, number, number] {
  // Normalize RGB values
  const normalizedR = r / RGB_MAX;
  const normalizedG = g / RGB_MAX;
  const normalizedB = b / RGB_MAX;
  
  // Calculate K (black)
  const k = 1 - Math.max(normalizedR, normalizedG, normalizedB);
  
  // Handle pure black case
  if (k === 1) {
    return [0, 0, 0, K_MAX];
  }
  
  // Calculate C, M, Y
  const c = ((1 - normalizedR - k) / (1 - k)) * CMY_MAX;
  const m = ((1 - normalizedG - k) / (1 - k)) * CMY_MAX;
  const y = ((1 - normalizedB - k) / (1 - k)) * CMY_MAX;
  const kPercentage = k * K_MAX;
  
  return [
    Math.round(c),
    Math.round(m),
    Math.round(y),
    Math.round(kPercentage)
  ];
}

/**
 * Analyzes an image to determine channel-specific coverage
 * @param imageData Canvas image data
 * @param activeChannels List of active channels to analyze
 * @returns Channel coverage values as percentages (0-100)
 */
export function analyzeImageChannels(
  imageData: ImageData,
  activeChannels: string[]
): ChannelCoverageValues {
  console.log('DEBUG: analyzeImageChannels called with', imageData.width, 'x', imageData.height, 'image and channels:', activeChannels);
  
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  
  // Initialize coverage tracking
  const channelSum: Record<string, number> = {};
  activeChannels.forEach(channel => {
    channelSum[channel] = 0;
  });
  
  // Track transparent pixels for accurate coverage calculation
  let nonTransparentPixels = 0;
  
  // Sample rate - analyze every Nth pixel for performance optimization
  // For high-res images, we don't need to analyze every pixel
  const sampleRate = Math.max(1, Math.floor(Math.sqrt(pixelCount) / 100));
  console.log('DEBUG: Using sample rate:', sampleRate, 'for', pixelCount, 'pixels');
  
  // Process each pixel with sampling
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const i = (y * width + x) * 4;
      
      // Skip if outside data bounds
      if (i >= data.length) continue;
      
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      nonTransparentPixels++;
      
      // Convert RGB to CMYK
      const [c, m, y_value, k] = rgbToCmyk(r, g, b);
      
      // Sum values for each active channel
      if (activeChannels.includes('cyan')) channelSum.cyan += c;
      if (activeChannels.includes('magenta')) channelSum.magenta += m;
      if (activeChannels.includes('yellow')) channelSum.yellow += y_value;
      if (activeChannels.includes('black')) channelSum.black += k;
      
      // Handle other special channels if needed
      if (activeChannels.includes('white')) {
        // For white ink, we use a special calculation based on darkness and transparency
        const darkness = (r + g + b) / (3 * RGB_MAX);
        const whiteCoverage = 100 - (darkness * 100);
        channelSum.white += whiteCoverage;
      }
    }
  }
  
  console.log('DEBUG: Sampled', nonTransparentPixels, 'non-transparent pixels out of', pixelCount);
  console.log('DEBUG: Raw channel sums:', channelSum);
  
  // Calculate average coverage for each channel (as percentage)
  const effectivePixelCount = nonTransparentPixels || 1; // Avoid division by zero
  const channelCoverage: ChannelCoverageValues = {};
  
  activeChannels.forEach(channel => {
    // Convert sum to average percentage (0-100)
    const rawCoverage = channelSum[channel] / effectivePixelCount;
    
    // Apply channel-specific adjustments based on test data
    let adjustedCoverage = rawCoverage;
    
    // Correction factors derived from test data analysis
    // These multipliers help align our estimates with actual UVMake preview values
    const channelAdjustmentFactors: Record<string, number> = {
      'cyan': 1.15,     // Cyan tends to use 15% more ink than raw coverage suggests
      'magenta': 1.20,  // Magenta uses around 20% more
      'yellow': 1.08,   // Yellow uses around 8% more
      'black': 1.25,    // Black uses around 25% more (tends to be underestimated)
      'white': 1.50     // White ink typically uses significantly more than estimated
    };
    
    // Apply the channel-specific adjustment
    if (channelAdjustmentFactors[channel]) {
      adjustedCoverage *= channelAdjustmentFactors[channel];
    }
    
    // Additional correction for low coverage values
    // Test data shows that even low coverage images use a minimum amount of ink
    const minCoverageThreshold = 5; // Minimum coverage percentage
    if (adjustedCoverage > 0 && adjustedCoverage < minCoverageThreshold) {
      adjustedCoverage = minCoverageThreshold;
    }
    
    // Absolute minimum - ensure we never have zero values that break calculations
    // Even if a channel isn't visibly used, printers still use a tiny amount
    if (adjustedCoverage <= 0) {
      adjustedCoverage = 0.1; // Minimal non-zero value
    }
    
    // Store the final coverage percentage (0-100)
    channelCoverage[channel] = Math.min(100, Math.max(0, adjustedCoverage));
    
    console.log('DEBUG: Channel', channel, 'coverage calculation:', {
      rawCoverage,
      adjustmentFactor: channelAdjustmentFactors[channel] || 1.0,
      adjustedCoverage,
      finalCoverage: channelCoverage[channel]
    });
  });
  
  return channelCoverage;
}

/**
 * Calculates total coverage as a single value, 
 * accounting for channel overlaps
 */
export function calculateTotalCoverage(channelCoverage: ChannelCoverageValues): number {
  // Use a weighted approach to account for overlaps
  const channelValues = Object.values(channelCoverage);
  
  if (channelValues.length === 0) {
    return 0;
  }
  
  // Calculate total with overlap consideration
  // This formula adjusts for the fact that C+M+Y+K don't add linearly
  const max = Math.max(...channelValues);
  const sum = channelValues.reduce((acc, val) => acc + val, 0);
  const avgRest = (sum - max) / Math.max(1, channelValues.length - 1);
  
  // Blend max value with average of other channels to simulate overlap
  const totalCoverage = max * 0.6 + avgRest * 0.4;
  
  return Math.min(100, Math.max(0, totalCoverage));
}

/**
 * Process an image from a source and return coverage analysis
 */
export async function analyzeImage(
  imageSource: HTMLImageElement | string,
  activeChannels: string[]
): Promise<{
  channelCoverage: ChannelCoverageValues;
  totalCoverage: number;
}> {
  console.log('DEBUG: analyzeImage called with channels:', activeChannels);
  
  return new Promise((resolve, reject) => {
    try {
      const img = typeof imageSource === 'string' 
        ? new Image() 
        : imageSource;
      
      console.log('DEBUG: Image source type:', typeof imageSource);
      
      const processImage = () => {
        console.log('DEBUG: Processing image, dimensions:', img.width, 'x', img.height);
        
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log('DEBUG: Got image data:', imageData.width, 'x', imageData.height);
        
        // Analyze channels
        const channelCoverage = analyzeImageChannels(imageData, activeChannels);
        
        // Calculate total coverage
        const totalCoverage = calculateTotalCoverage(channelCoverage);
        console.log('DEBUG: Total coverage calculated:', totalCoverage);
        
        resolve({
          channelCoverage,
          totalCoverage
        });
      };
      
      // If imageSource is a string URL, load the image first
      if (typeof imageSource === 'string') {
        console.log('DEBUG: Loading image from URL');
        img.onload = processImage;
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageSource;
      } else {
        // If already an image element, process directly
        console.log('DEBUG: Processing pre-loaded image element');
        processImage();
      }
    } catch (error) {
      console.error('DEBUG: Error in analyzeImage:', error);
      reject(error);
    }
  });
} 