"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  ExternalLink,
  MoreVertical,
  Info,
  CheckCircle,
  XCircle,
  Edit,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { PriceDetailsDialog } from "./price-details-dialog"

// Types
export interface PriceHistoryItem {
  id: string;
  machine_id: string;
  machine_name: string;
  brand?: string;
  variant_attribute: string;
  price: number | null;
  validation_basis_price?: number | null; // Same as old_price
  old_price?: number | null; // For backward compatibility
  new_price?: number | null; // For backward compatibility
  date: string;
  status?: 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW';
  success?: boolean; // For backward compatibility
  needs_review?: boolean; // For backward compatibility
  extraction_method?: string | null;
  tier?: string | null;
  extracted_confidence?: number | null;
  validation_confidence?: number | null;
  confidence?: number | null; // For backward compatibility
  failure_reason?: string | null;
  review_reason?: string | null;
  error?: string | null; // For backward compatibility
  raw_price_text?: string | null;
  url?: string | null;
  product_link?: string | null; // For backward compatibility
  batch_id?: string | null;
  price_change?: number | null;
  percentage_change?: number | null;
  extraction_duration_seconds?: number | null;
  http_status?: number | null;
  html_size?: number | null;
}

interface PriceHistoryTableProps {
  items: PriceHistoryItem[];
  loading: boolean;
  error: string | null;
  mode: 'history' | 'review' | 'batch';
  onRefresh: () => void;
}

export function PriceHistoryTable({ items, loading, error, mode, onRefresh }: PriceHistoryTableProps) {
  const [selectedItem, setSelectedItem] = useState<PriceHistoryItem | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  
  // API URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'

  // Format price as currency
  const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  }
  
  // Normalize item data to handle different API response formats
  const normalizeItem = (item: PriceHistoryItem): PriceHistoryItem => {
    // Handle different formats of price data
    const newPrice = item.price ?? item.new_price;
    const oldPrice = item.validation_basis_price ?? item.old_price;
    
    // Handle different formats of URL data
    const url = item.url ?? item.product_link;
    
    // Handle different status formats (new schema vs. old flags)
    let status = item.status;
    if (!status) {
      if (item.needs_review) {
        status = 'NEEDS_REVIEW';
      } else if (item.success === false) {
        status = 'FAILED';
      } else {
        status = 'SUCCESS';
      }
    }
    
    // Handle different error/reason formats
    const failureReason = item.failure_reason ?? item.error;
    
    return {
      ...item,
      price: newPrice,
      validation_basis_price: oldPrice,
      url,
      status,
      failure_reason: failureReason
    };
  };
  
  // Handle viewing item details
  const handleViewDetails = (item: PriceHistoryItem) => {
    setSelectedItem(normalizeItem(item))
    setShowDetails(true)
  }
  
  if (loading) {
    return <div className="text-center p-8">Loading price history...</div>
  }
  
  if (error) {
    return (
      <div className="text-center p-8 border rounded-lg bg-red-50">
        <p className="text-red-800">{error}</p>
        <Button variant="outline" className="mt-4" onClick={onRefresh}>
          Try Again
        </Button>
      </div>
    )
  }
  
  if (!items || items.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <p>No price history found</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-right">Previous</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-center">Method</TableHead>
              <TableHead className="text-center">Confidence</TableHead>
              <TableHead className="text-center">Date</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((originalItem) => {
              const item = normalizeItem(originalItem);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <StatusBadge item={item} />
                  </TableCell>
                  <TableCell className="font-medium">{item.machine_name}</TableCell>
                  <TableCell>{item.variant_attribute || "Default"}</TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {item.url ? (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <span className="truncate">{item.url}</span>
                        <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">No URL</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(item.validation_basis_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PriceChange 
                      newPrice={item.price} 
                      oldPrice={item.validation_basis_price} 
                      priceChange={item.price_change}
                      percentageChange={item.percentage_change}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <MethodBadge 
                      tier={item.tier} 
                      method={item.extraction_method} 
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <ConfidenceIndicator 
                      extractedConfidence={item.extracted_confidence} 
                      validationConfidence={item.validation_confidence}
                      confidence={item.confidence}
                    />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {formatDate(item.date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionsMenu 
                      item={item} 
                      mode={mode}
                      onViewDetails={() => handleViewDetails(item)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <PriceDetailsDialog
        item={selectedItem}
        open={showDetails}
        onOpenChange={setShowDetails}
        mode={mode}
        onRefresh={onRefresh}
      />
    </>
  )
}

// Helper components

function StatusBadge({ item }: { item: PriceHistoryItem }) {
  const status = item.status || 'UNKNOWN';
  
  switch(status) {
    case 'NEEDS_REVIEW':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800">Review</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.review_reason || "Needs manual review"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case 'SUCCESS':
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">Success</Badge>;
    case 'FAILED':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="flex items-center gap-1">
                Failed
                <Info className="h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{item.failure_reason || item.error || "Unknown error"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function PriceChange({ 
  newPrice, 
  oldPrice,
  priceChange,
  percentageChange
}: { 
  newPrice: number | null; 
  oldPrice: number | null;
  priceChange?: number | null;
  percentageChange?: number | null;
}) {
  // Use pre-calculated values if available, otherwise calculate
  let change = priceChange;
  let percentage = percentageChange;
  
  if ((change === undefined || percentage === undefined) && newPrice !== null && oldPrice !== null && oldPrice > 0) {
    change = newPrice - oldPrice;
    percentage = (change / oldPrice) * 100;
  }
  
  if (change === null || change === undefined || percentage === null || percentage === undefined) {
    return <span>-</span>;
  }
  
  const isPositive = change > 0;
  const changeFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(change));
  
  const percentFormatted = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(percentage) / 100);
  
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

function MethodBadge({ 
  tier, 
  method 
}: { 
  tier: string | null | undefined; 
  method: string | null | undefined;
}) {
  const displayText = method || tier || "Unknown";
  
  // Determine badge style based on extraction tier
  let className = "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  
  if (tier) {
    const tierLower = tier.toLowerCase();
    if (tierLower.includes("static")) {
      className = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400";
    } else if (tierLower.includes("slice_fast")) {
      className = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400";
    } else if (tierLower.includes("slice_balanced")) {
      className = "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400";
    } else if (tierLower.includes("js")) {
      className = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400";
    } else if (tierLower.includes("full")) {
      className = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400";
    } else if (tierLower.includes("manual")) {
      className = "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  }
  
  return (
    <Badge variant="outline" className={className}>
      {displayText}
    </Badge>
  );
}

function ConfidenceIndicator({ 
  extractedConfidence, 
  validationConfidence,
  confidence
}: { 
  extractedConfidence: number | null | undefined;
  validationConfidence: number | null | undefined;
  confidence: number | null | undefined;
}) {
  // Use the first available confidence value
  const value = validationConfidence ?? extractedConfidence ?? confidence ?? null;
  
  if (value === null) return <span className="text-muted-foreground">-</span>;
  
  // Color coding based on confidence level
  let colorClass = "";
  if (value >= 0.9) {
    colorClass = "bg-green-100 dark:bg-green-900";
  } else if (value >= 0.7) {
    colorClass = "bg-yellow-100 dark:bg-yellow-900";
  } else {
    colorClass = "bg-red-100 dark:bg-red-900";
  }
  
  const percentage = Math.round(value * 100);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${colorClass} rounded-full`} 
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="ml-1 text-xs">{percentage}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Extraction: {extractedConfidence ? `${Math.round(extractedConfidence * 100)}%` : 'N/A'}</p>
          <p>Validation: {validationConfidence ? `${Math.round(validationConfidence * 100)}%` : 'N/A'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ActionsMenu({
  item,
  mode,
  onViewDetails
}: {
  item: PriceHistoryItem;
  mode: string;
  onViewDetails: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onViewDetails}>
          <Info className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        
        {/* View product URL if available */}
        {item.url && (
          <DropdownMenuItem asChild>
            <a 
              href={item.url} 
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Product Page
            </a>
          </DropdownMenuItem>
        )}
        
        {/* View machine link */}
        <DropdownMenuItem asChild>
          <a 
            href={`/admin/machines/edit/${item.machine_id}`} 
            target="_blank"
            rel="noopener noreferrer"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Machine
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 