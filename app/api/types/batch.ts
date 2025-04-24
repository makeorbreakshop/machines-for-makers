export type BatchStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface BatchSummary {
  id: string;
  status: BatchStatus;
  startTime: string;
  endTime: string | null;
  totalMachines: number;
  completedMachines: number;
  successfulMachines: number;
  failedMachines: number;
  needsReviewMachines: number;
  updatedMachines: number;
  unchangedMachines: number;
  daysThreshold: number;
  createdBy: string;
  batchType: string;
  metadata: Record<string, any>;
  estimatedCost?: number;
}

export interface BatchResultItem {
  id: string;
  batchId: string;
  machineId: string;
  machineName: string;
  url: string;
  success: boolean;
  oldPrice: number | null;
  newPrice: number | null;
  priceChange: number | null;
  percentageChange: number | null;
  error: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  extractionMethod: string | null;
  httpStatus: number | null;
  htmlSize: number | null;
  extractionAttempts: any[] | null;
  
  // New V3 fields
  variantAttribute: string | null;
  tier: string | null;
  extractedConfidence: number | null;
  validationConfidence: number | null;
  needsReview: boolean;
  reviewReason: string | null;
  confidence: number | null;
}

export interface BatchResultsResponse {
  summary: BatchSummary;
  results: BatchResultItem[];
} 