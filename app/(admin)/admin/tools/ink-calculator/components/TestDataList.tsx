"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { InkMode } from "@/app/tools/ink-calculator/types";
import { Trash2, ImageIcon, ExternalLink, Filter, RefreshCw } from "lucide-react";
import { analyzeImage } from "@/app/tools/ink-calculator/services/color-analysis";

// Define test data type
interface TestData {
  id: string;
  ink_mode: string;
  quality: string;
  image_type: string;
  dimensions: {
    width: number;
    height: number;
    unit: string;
  };
  channel_ml: Record<string, number>;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  image_analysis?: {
    totalCoverage: number;
    channelCoverage: Record<string, number>;
  } | null;
}

interface TestDataListProps {
  inkModes: Record<string, InkMode>;
}

export function TestDataList({ inkModes }: TestDataListProps) {
  const router = useRouter();
  const [testData, setTestData] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [totalMl, setTotalMl] = useState<Record<string, number>>({});
  const [filterInkMode, setFilterInkMode] = useState<string>("all");
  const [filterQuality, setFilterQuality] = useState<string>("all");
  const [filterImageType, setFilterImageType] = useState<string>("all");
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  // Fetch test data
  const fetchTestData = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (filterInkMode && filterInkMode !== "all") params.append("inkMode", filterInkMode);
      if (filterQuality && filterQuality !== "all") params.append("quality", filterQuality);
      if (filterImageType && filterImageType !== "all") params.append("imageType", filterImageType);

      const response = await fetch(`/api/admin/ink-test-data?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch test data");
      }

      const { data } = await response.json();
      setTestData(data || []);

      // Calculate total mL for each entry
      const newTotalMl: Record<string, number> = {};
      data.forEach((item: TestData) => {
        const sum = Object.values(item.channel_ml).reduce(
          (acc, val) => acc + (val as number),
          0
        );
        newTotalMl[item.id] = parseFloat(sum.toFixed(2));
      });
      setTotalMl(newTotalMl);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTestData();
  }, [filterInkMode, filterQuality, filterImageType]);

  // Delete test data entry
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/ink-test-data?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete test data");
      }

      toast.success("Test data deleted successfully");
      fetchTestData();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  // Recalculate image analysis
  const recalculateAnalysis = async (id: string) => {
    try {
      // Add ID to processing list
      setProcessingIds(prev => [...prev, id]);
      
      // Step 1: Get test data entry details
      const response = await fetch(`/api/admin/recalculate-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch test data");
      }
      
      const { testData: entryData } = await response.json();
      
      // Step 2: Load and analyze the image using the original ink mode's channels
      const inkMode = inkModes[entryData.ink_mode];
      if (!inkMode) {
        throw new Error("Invalid ink mode");
      }
      
      // Load and analyze the image
      toast.info("Fetching and analyzing image...");
      
      let localImageUrl = '';
      let results;
      
      try {
        // First attempt: Try direct fetch
        const imageResponse = await fetch(entryData.image_url, {
          cache: "no-store" // Bypass cache to ensure fresh fetch
        });
        
        if (!imageResponse.ok) {
          throw new Error("Direct fetch failed");
        }
        
        // Get the image as a blob
        const imageBlob = await imageResponse.blob();
        
        // Create a local object URL to avoid CORS issues
        localImageUrl = URL.createObjectURL(imageBlob);
        
        // Analyze the image using local URL
        results = await analyzeImage(localImageUrl, inkMode.channels);
      } catch (fetchError) {
        console.warn("Direct fetch failed, trying proxy:", fetchError);
        
        // Second attempt: Use proxy
        try {
          // Encode the URL to avoid issues with special characters
          const encodedUrl = encodeURIComponent(entryData.image_url);
          const proxyUrl = `/api/admin/proxy-image?url=${encodedUrl}`;
          
          // Analyze via proxy
          results = await analyzeImage(proxyUrl, inkMode.channels);
        } catch (error: any) {
          throw new Error(`Image analysis failed: ${error.message}`);
        }
      } finally {
        // Clean up the object URL if it was created
        if (localImageUrl) {
          URL.revokeObjectURL(localImageUrl);
        }
      }
      
      if (!results) {
        throw new Error("Failed to analyze image");
      }
      
      // Step 3: Save the analysis results
      const updateResponse = await fetch(`/api/admin/recalculate-analysis`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          id: entryData.id,
          image_analysis: results
        }),
      });
      
      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || "Failed to update analysis");
      }
      
      toast.success("Image analysis recalculated successfully");
      
      // Refresh data
      fetchTestData();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      // Remove ID from processing list
      setProcessingIds(prev => prev.filter(item => item !== id));
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterInkMode("all");
    setFilterQuality("all");
    setFilterImageType("all");
  };

  // Check if filters are active
  const hasActiveFilters = filterInkMode !== "all" || filterQuality !== "all" || filterImageType !== "all";

  // Get image type display name
  const getImageTypeDisplay = (type: string) => {
    switch (type) {
      case "solid": return "Solid Color";
      case "gradient": return "Gradient";
      case "photo": return "Photo";
      case "line_art": return "Line Art";
      default: return type;
    }
  };

  // Check if a test entry has an image preview
  const hasImage = (entry: TestData) => !!entry.image_url;
  
  // Check if entry needs analysis (has image but no analysis)
  const needsAnalysis = (entry: TestData) => 
    !!entry.image_url && (!entry.image_analysis || Object.keys(entry.image_analysis).length === 0);
  
  // Check if entry is being processed
  const isProcessing = (id: string) => processingIds.includes(id);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Filter Test Data</h3>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Clear Filters
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Select value={filterInkMode} onValueChange={setFilterInkMode}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter by Ink Mode" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ink Modes</SelectItem>
                {Object.entries(inkModes).map(([id, mode]) => (
                  <SelectItem key={id} value={id}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={filterQuality} onValueChange={setFilterQuality}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter by Quality" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quality Settings</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={filterImageType} onValueChange={setFilterImageType}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter by Image Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Image Types</SelectItem>
                <SelectItem value="solid">Solid Color</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="line_art">Line Art</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading test data...</div>
      ) : testData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No test data found. Add some test data to get started.
        </div>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Ink Mode</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Image Type</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Total mL</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testData.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {hasImage(entry) ? (
                      <div className="relative h-10 w-10">
                        <Image
                          src={entry.image_url as string}
                          alt="Test image"
                          fill
                          className="object-cover rounded"
                        />
                        {entry.image_analysis && (
                          <div className="absolute bottom-0 right-0 bg-green-500 h-2 w-2 rounded-full" title="Has image analysis data" />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-10 w-10 bg-muted rounded">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {inkModes[entry.ink_mode]?.label || entry.ink_mode}
                  </TableCell>
                  <TableCell className="capitalize">{entry.quality}</TableCell>
                  <TableCell>{getImageTypeDisplay(entry.image_type)}</TableCell>
                  <TableCell>
                    {entry.dimensions.width} × {entry.dimensions.height}{" "}
                    {entry.dimensions.unit}
                  </TableCell>
                  <TableCell>{totalMl[entry.id]} mL</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(entry.created_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {needsAnalysis(entry) && (
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isProcessing(entry.id)}
                          onClick={() => recalculateAnalysis(entry.id)}
                          title="Analyze image colors"
                        >
                          <RefreshCw className={`h-4 w-4 ${isProcessing(entry.id) ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Test Data Details</DialogTitle>
                            <DialogDescription>
                              Viewing details for test data entry
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid md:grid-cols-2 gap-6 py-4">
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-sm font-medium mb-1">Ink Mode</h3>
                                <p>
                                  {inkModes[entry.ink_mode]?.label || entry.ink_mode}
                                </p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium mb-1">
                                  Quality Setting
                                </h3>
                                <p className="capitalize">{entry.quality}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium mb-1">
                                  Image Type
                                </h3>
                                <p>{getImageTypeDisplay(entry.image_type)}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium mb-1">
                                  Dimensions
                                </h3>
                                <p>
                                  {entry.dimensions.width} × {entry.dimensions.height}{" "}
                                  {entry.dimensions.unit}
                                </p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium mb-1">
                                  Total Ink Usage
                                </h3>
                                <p>{totalMl[entry.id]} mL</p>
                              </div>
                              {entry.notes && (
                                <div>
                                  <h3 className="text-sm font-medium mb-1">
                                    Notes
                                  </h3>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {entry.notes}
                                  </p>
                                </div>
                              )}
                              {entry.image_analysis && (
                                <div>
                                  <h3 className="text-sm font-medium mb-1">
                                    Color Coverage Analysis
                                  </h3>
                                  <p className="font-medium">Total: {entry.image_analysis.totalCoverage.toFixed(1)}%</p>
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {Object.entries(entry.image_analysis.channelCoverage).map(
                                      ([channel, coverage]) => (
                                        <div
                                          key={channel}
                                          className="flex justify-between p-2 bg-muted/50 rounded"
                                        >
                                          <span className="capitalize font-medium">
                                            {channel}:
                                          </span>
                                          <span>{coverage.toFixed(1)}%</span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="space-y-4">
                              {hasImage(entry) && (
                                <div>
                                  <h3 className="text-sm font-medium mb-2">
                                    Test Image
                                  </h3>
                                  <div className="relative h-48 w-full border rounded overflow-hidden">
                                    <Image
                                      src={entry.image_url as string}
                                      alt="Test image"
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                </div>
                              )}
                              <div>
                                <h3 className="text-sm font-medium mb-2">
                                  Channel mL Values
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(entry.channel_ml).map(
                                    ([channel, ml]) => (
                                      <div
                                        key={channel}
                                        className="flex justify-between p-2 bg-muted/50 rounded"
                                      >
                                        <span className="capitalize font-medium">
                                          {channel}:
                                        </span>
                                        <span>{ml} mL</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          setSelectedId(entry.id);
                          setDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test Data</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this test data? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedId && handleDelete(selectedId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 