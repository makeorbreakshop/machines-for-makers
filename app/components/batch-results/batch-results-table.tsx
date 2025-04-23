import { ArrowDown, ArrowUp, ChevronDown, Clock, ExternalLink, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDuration } from "date-fns";
import { BatchResultItem } from "@/app/api/types/batch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BatchResultsTableProps {
  results: BatchResultItem[];
}

export function BatchResultsTable({ results }: BatchResultsTableProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <p>No results found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead>Machine</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="text-right">Old Price</TableHead>
            <TableHead className="text-right">New Price</TableHead>
            <TableHead className="text-right">Extracted Price</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead className="text-center">Extraction</TableHead>
            <TableHead className="text-center">Confidence</TableHead>
            <TableHead className="text-center">Duration</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id}>
              <TableCell>
                <StatusBadge result={result} />
              </TableCell>
              <TableCell className="font-medium">{result.machineName}</TableCell>
              <TableCell>{result.variantAttribute || "Default"}</TableCell>
              <TableCell className="max-w-[180px] truncate">
                {result.url ? (
                  <a 
                    href={result.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <span className="truncate">{result.url}</span>
                    <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                  </a>
                ) : (
                  <span className="text-muted-foreground text-xs">No URL</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(result.oldPrice)}
              </TableCell>
              <TableCell className="text-right">
                {formatPrice(result.newPrice)}
              </TableCell>
              <TableCell className="text-right">
                <ExtractedPrice result={result} />
              </TableCell>
              <TableCell className="text-right">
                <PriceChange 
                  priceChange={result.priceChange} 
                  percentageChange={result.percentageChange} 
                />
              </TableCell>
              <TableCell className="text-center">
                <ExtractionTierBadge tier={result.tier} extractionMethod={result.extractionMethod} />
              </TableCell>
              <TableCell className="text-center">
                <ConfidenceIndicator confidence={result.confidence} />
              </TableCell>
              <TableCell className="text-center">
                <DurationDisplay durationSeconds={result.durationSeconds} />
              </TableCell>
              <TableCell className="text-right">
                <ActionsMenu result={result} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Status badge component
function StatusBadge({ result }: { result: BatchResultItem }) {
  if (result.needsReview) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800">Review</Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{result.reviewReason || "Needs manual review"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (result.success) {
    return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">Success</Badge>;
  }
  
  // Parse extraction attempts and find the extracted price
  let extractedPrice: string | null = null;
  let extractionAttempts = result.extractionAttempts;
  
  // Handle case where extractionAttempts might be a JSON string from Supabase
  if (typeof extractionAttempts === 'string') {
    try {
      extractionAttempts = JSON.parse(extractionAttempts);
    } catch (e) {
      console.error('Failed to parse extraction attempts:', e);
      extractionAttempts = null;
    }
  }
  
  if (extractionAttempts && Array.isArray(extractionAttempts)) {
    // Find the last successful extraction attempt
    const successfulAttempts = extractionAttempts.filter(attempt => attempt.success);
    if (successfulAttempts.length > 0) {
      const lastSuccessfulAttempt = successfulAttempts[successfulAttempts.length - 1];
      extractedPrice = lastSuccessfulAttempt.price !== null 
        ? `$${lastSuccessfulAttempt.price.toLocaleString()}` 
        : null;
    }
  }
  
  // Try to extract price directly from the error message for price_change_threshold_exceeded
  if (!extractedPrice && result.error && result.error.includes('price_change_threshold_exceeded')) {
    // Look for price validation failures
    const errorParts = result.error.split(':');
    if (errorParts.length > 1) {
      const details = errorParts[1].trim();
      // Add any available information
      extractedPrice = "See details";
    }
  }
  
  const failureReason = result.error || "Unknown error";
  const tooltipContent = extractedPrice 
    ? `Extracted price: ${extractedPrice}. Reason: ${failureReason}` 
    : failureReason;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="flex items-center gap-1">
            Failed
            {(extractedPrice || (extractionAttempts && Array.isArray(extractionAttempts) && extractionAttempts.length > 0)) && 
              <Info className="h-3 w-3" />
            }
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tooltipContent}</p>
          <p className="text-xs mt-1 text-muted-foreground">Click ⋮ for detailed information</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Format price as currency
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

// Price change display
function PriceChange({ 
  priceChange, 
  percentageChange 
}: { 
  priceChange: number | null; 
  percentageChange: number | null;
}) {
  if (!priceChange || !percentageChange) return <span>-</span>;
  
  const isPositive = priceChange > 0;
  const changeFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(priceChange));
  
  const percentFormatted = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(percentageChange) / 100);
  
  const colorClass = isPositive 
    ? "text-red-600 dark:text-red-400" 
    : "text-green-600 dark:text-green-400";
  
  const Icon = isPositive ? ArrowUp : ArrowDown;
  
  return (
    <div className={`flex justify-end items-center space-x-1 ${colorClass}`}>
      <Icon className="h-4 w-4" />
      <span>{changeFormatted}</span>
      <span className="text-xs opacity-70">({percentFormatted})</span>
    </div>
  );
}

// Extraction tier badge
function ExtractionTierBadge({ 
  tier, 
  extractionMethod 
}: { 
  tier: string | null; 
  extractionMethod: string | null;
}) {
  const displayTier = tier || extractionMethod || "Unknown";
  
  let bgColor = "";
  switch (displayTier) {
    case "STATIC":
      bgColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800";
      break;
    case "SLICE_FAST":
      bgColor = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800";
      break;
    case "SLICE_BALANCED":
      bgColor = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800";
      break;
    case "JS_INTERACTION":
      bgColor = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800";
      break;
    case "FULL_HTML":
      bgColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800";
      break;
    default:
      bgColor = "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
  
  return (
    <Badge variant="outline" className={`${bgColor}`}>
      {displayTier}
    </Badge>
  );
}

// Confidence indicator
function ConfidenceIndicator({ confidence }: { confidence: number | null }) {
  if (confidence === null) return <span>-</span>;
  
  let color = "";
  if (confidence >= 0.9) {
    color = "bg-green-500";
  } else if (confidence >= 0.7) {
    color = "bg-yellow-500";
  } else {
    color = "bg-red-500";
  }
  
  const percentage = Math.round(confidence * 100);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${color}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="ml-2 text-xs">{percentage}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Extraction confidence: {confidence.toFixed(2)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Duration display
function DurationDisplay({ durationSeconds }: { durationSeconds: number | null }) {
  if (!durationSeconds) return <span>-</span>;
  
  const seconds = Math.floor(durationSeconds % 60);
  const minutes = Math.floor((durationSeconds / 60) % 60);
  
  let durationText = "";
  if (minutes > 0) {
    durationText = `${minutes}m ${seconds}s`;
  } else {
    durationText = `${seconds}s`;
  }
  
  return (
    <div className="flex items-center justify-center text-sm">
      <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
      <span>{durationText}</span>
    </div>
  );
}

// Actions menu
function ActionsMenu({ result }: { result: BatchResultItem }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => window.open(result.url, '_blank')}
          className="cursor-pointer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View Source
        </DropdownMenuItem>
        
        {(!result.success || result.needsReview) && (
          <ValidationDetailsButton result={result} />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// New component for showing validation details
function ValidationDetailsButton({ result }: { result: BatchResultItem }) {
  // Get extracted price from attempts if available
  let extractionAttempts = result.extractionAttempts || [];
  
  // Handle case where extractionAttempts might be a JSON string from Supabase
  if (typeof extractionAttempts === 'string') {
    try {
      extractionAttempts = JSON.parse(extractionAttempts);
    } catch (e) {
      console.error('Failed to parse extraction attempts:', e);
      extractionAttempts = [];
    }
  }
  
  const successfulAttempts = Array.isArray(extractionAttempts) 
    ? extractionAttempts.filter(attempt => attempt.success)
    : [];
  
  const lastSuccessfulAttempt = successfulAttempts.length > 0 
    ? successfulAttempts[successfulAttempts.length - 1] 
    : null;
  
  const extractedPrice = lastSuccessfulAttempt?.price !== undefined 
    ? lastSuccessfulAttempt.price 
    : null;
  
  const extractionMethod = lastSuccessfulAttempt?.method || result.extractionMethod;
  const confidence = lastSuccessfulAttempt?.confidence || result.extractedConfidence;
  
  // Calculate price difference percentage if both prices exist
  let priceDifferencePercentage = null;
  if (extractedPrice !== null && result.oldPrice !== null && result.oldPrice > 0) {
    priceDifferencePercentage = ((extractedPrice - result.oldPrice) / result.oldPrice) * 100;
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <DropdownMenuItem 
          onSelect={(e) => e.preventDefault()}
          className="cursor-pointer"
        >
          <Info className="mr-2 h-4 w-4" />
          Validation Details
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Price Validation Details</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] rounded-md border p-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm">Machine</h3>
              <p>{result.machineName}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm">Old Price</h3>
                <p>{formatPrice(result.oldPrice)}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm">Extracted Price</h3>
                <p className={extractedPrice !== null ? "text-amber-600 font-medium" : ""}>
                  {extractedPrice !== null ? formatPrice(extractedPrice) : "Not available"}
                </p>
              </div>
            </div>
            
            {priceDifferencePercentage !== null && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                <h3 className="font-medium text-sm">Price Change</h3>
                <p className={Math.abs(priceDifferencePercentage) > 25 ? "text-red-600 font-medium" : ""}>
                  {priceDifferencePercentage > 0 ? "+" : ""}
                  {priceDifferencePercentage.toFixed(1)}% from previous price
                  {Math.abs(priceDifferencePercentage) > 25 && " (exceeds threshold)"}
                </p>
              </div>
            )}
            
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-2">
                <h3 className="font-medium text-sm">Error</h3>
                <p className="text-red-600">{result.error}</p>
              </div>
            )}
            
            {result.reviewReason && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                <h3 className="font-medium text-sm">Review Reason</h3>
                <p className="text-amber-600">{result.reviewReason}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm">Extraction Method</h3>
                <p>{extractionMethod || "Unknown"}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm">Confidence</h3>
                <p>{confidence !== null ? `${Math.round((confidence || 0) * 100)}%` : "Unknown"}</p>
              </div>
            </div>
            
            {Array.isArray(extractionAttempts) && extractionAttempts.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2">Extraction Attempts</h3>
                <div className="space-y-2">
                  {extractionAttempts.map((attempt, index) => (
                    <div key={index} className="border rounded-md p-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Method:</span> 
                        <span>{attempt.method || attempt.tier || "Unknown"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Price:</span> 
                        <span>{attempt.price !== null ? formatPrice(attempt.price) : "Failed"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Success:</span> 
                        <span>{attempt.success ? "✓" : "✗"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Confidence:</span> 
                        <span>{attempt.confidence !== undefined ? `${Math.round(attempt.confidence * 100)}%` : "N/A"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Extracted price component to show price before validation
function ExtractedPrice({ result }: { result: BatchResultItem }) {
  // Don't show for successful extractions that passed validation
  if (result.success && !result.needsReview) {
    return <span>-</span>;
  }
  
  // Parse extraction attempts to find price
  let extractedPrice = null;
  let extractionAttempts = result.extractionAttempts;
  
  // Handle case where extractionAttempts might be a JSON string from Supabase
  if (typeof extractionAttempts === 'string') {
    try {
      extractionAttempts = JSON.parse(extractionAttempts);
    } catch (e) {
      console.error('Failed to parse extraction attempts:', e);
      extractionAttempts = null;
    }
  }
  
  if (extractionAttempts && Array.isArray(extractionAttempts)) {
    // Find the last successful extraction attempt
    const successfulAttempts = extractionAttempts.filter(attempt => attempt.success);
    if (successfulAttempts.length > 0) {
      const lastSuccessfulAttempt = successfulAttempts[successfulAttempts.length - 1];
      extractedPrice = lastSuccessfulAttempt.price;
    }
  }
  
  if (extractedPrice === null) {
    return <span>-</span>;
  }
  
  // Calculate percentage difference from old price if available
  let percentageDiff: number | null = null;
  if (result.oldPrice && result.oldPrice > 0) {
    const difference = extractedPrice - result.oldPrice;
    percentageDiff = (difference / result.oldPrice) * 100;
  }
  
  // Determine if it exceeds the validation threshold (typically 25%)
  const exceedsThreshold = percentageDiff !== null && Math.abs(percentageDiff) > 25;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="font-medium text-amber-600 text-right">
            {formatPrice(extractedPrice)}
            {percentageDiff !== null && (
              <span className={`ml-1 text-xs ${exceedsThreshold ? 'text-red-600' : 'text-muted-foreground'}`}>
                ({percentageDiff > 0 ? '+' : ''}{percentageDiff.toFixed(1)}%)
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {exceedsThreshold 
              ? `Price change of ${Math.abs(percentageDiff || 0).toFixed(1)}% exceeds the validation threshold (25%)`
              : "Price extracted but failed validation"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 