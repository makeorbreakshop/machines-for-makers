export type PrintQuality = 'draft' | 'standard' | 'high';

export type ImageType = 'solid' | 'gradient' | 'photo' | 'line_art';

export interface InkMode {
  channels: string[];
  passes: number;
  label: string;
  group: string;
}

export interface ChannelMlValues {
  [channel: string]: number;
}

export interface DimensionValues {
  width: number;
  height: number;
  unit: 'in' | 'mm';
}

export interface InkUsageResult {
  channelMl: ChannelMlValues;
  totalMl: number;
  coverage: number;
  channelCoverage?: Record<string, number>;
}

export interface CostResult {
  costPerPrint: number;
  printsPerSet: number;
  channelBreakdown: ChannelMlValues;
  coverage: number;
  totalMl: number;
}

export type ChannelCoverageValues = {
  [key: string]: number;
};

export type ImageAnalysisResult = {
  coverage: number;
  channelCoverage: ChannelCoverageValues;
  imageUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}; 