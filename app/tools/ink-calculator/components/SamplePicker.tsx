"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Filter } from "lucide-react";

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

interface SamplePickerProps {
  onSelectSample: (sample: TestData) => void;
  onSampleSelected?: () => void; // Optional callback to notify parent when sample is selected
}

export default function SamplePicker({ onSelectSample, onSampleSelected }: SamplePickerProps) {
  const [samples, setSamples] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterInkMode, setFilterInkMode] = useState<string>("all");
  const [filterQuality, setFilterQuality] = useState<string>("all");
  const [filterImageType, setFilterImageType] = useState<string>("all");
  const [totalMl, setTotalMl] = useState<Record<string, number>>({});

  // Fetch sample data
  const fetchSamples = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (filterInkMode && filterInkMode !== "all") params.append("inkMode", filterInkMode);
      if (filterQuality && filterQuality !== "all") params.append("quality", filterQuality);
      if (filterImageType && filterImageType !== "all") params.append("imageType", filterImageType);

      const response = await fetch(`/api/ink-test-data?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sample data");
      }

      const { data } = await response.json();
      setSamples(data || []);

      // Calculate total mL for each entry
      const newTotalMl: Record<string, number> = {};
      data.forEach((item: TestData) => {
        const sum = Object.values(item.channel_ml).reduce(
          (acc, val) => acc + (val as number),
          0
        );
        newTotalMl[item.id] = parseFloat(sum.toFixed(3));
      });
      setTotalMl(newTotalMl);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchSamples();
  }, [filterInkMode, filterQuality, filterImageType]);

  // Handle sample selection
  const handleSelectSample = (sample: TestData) => {
    // Make sure image url is valid before selecting
    if (sample.image_url) {
      // Preload the image to ensure it's available in cache
      const preloadImage = new window.Image();
      preloadImage.src = sample.image_url;
      
      preloadImage.onload = () => {
        // Only select the sample once the image is loaded
        onSelectSample(sample);
        if (onSampleSelected) onSampleSelected();
        toast.success("Sample data loaded successfully");
      };
      
      preloadImage.onerror = () => {
        // Handle image load error
        toast.error("Failed to load sample image");
        // Still load the sample data, just without the image
        sample.image_url = null;
        onSelectSample(sample);
        if (onSampleSelected) onSampleSelected();
      };
    } else {
      // If there's no image, just select the sample
      onSelectSample(sample);
      if (onSampleSelected) onSampleSelected();
      toast.success("Sample data loaded successfully");
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterInkMode("all");
    setFilterQuality("all");
    setFilterImageType("all");
  };

  // Helper to get display-friendly image type
  const getImageTypeDisplay = (type: string) => {
    const displayMap: Record<string, string> = {
      "product": "Product",
      "photo": "Photo",
      "graphic": "Graphic",
      "text": "Text"
    };
    return displayMap[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <div className="flex flex-wrap gap-2 flex-1">
          <Select value={filterInkMode} onValueChange={setFilterInkMode}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Ink Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="CMYK">CMYK</SelectItem>
              <SelectItem value="WHITE_CMYK">CMYK+W</SelectItem>
              <SelectItem value="WHITE_CMYK_GLOSS">CMYK+WG</SelectItem>
              <SelectItem value="CMYK_GLOSS">CMYK+G</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterQuality} onValueChange={setFilterQuality}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quality</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterImageType} onValueChange={setFilterImageType}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Image Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="photo">Photos</SelectItem>
              <SelectItem value="graphic">Graphics</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="h-8 text-xs"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Sample grid */}
      <div className="pt-2">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[4/3] flex flex-col">
                <Skeleton className="h-full w-full rounded-xl mb-2" />
                <div className="flex flex-col gap-1.5 mt-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {samples.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No sample data found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-2 max-h-[400px] overflow-y-auto pr-2">
                {samples.map((sample) => (
                  <div 
                    key={sample.id} 
                    className="group relative flex flex-col rounded-lg overflow-hidden border bg-card hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    {/* Image */}
                    <div 
                      className="relative aspect-[4/3] bg-muted overflow-hidden cursor-pointer"
                      onClick={() => handleSelectSample(sample)}
                    >
                      {sample.image_url ? (
                        <Image
                          src={sample.image_url}
                          alt={`Sample ${sample.id}`}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="p-2 flex-1 flex flex-col text-xs">
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {sample.ink_mode.replace('WHITE_', 'W+').replace('_GLOSS', '+G')}
                        </Badge>
                        <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                          {sample.quality}
                        </Badge>
                      </div>
                      
                      <div className="space-y-0.5 mb-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dimensions:</span>
                          <span className="font-medium">
                            {sample.dimensions.width} × {sample.dimensions.height} {sample.dimensions.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ink:</span>
                          <span className="font-medium">{totalMl[sample.id]?.toFixed(2)} ml</span>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleSelectSample(sample)}
                        variant="default"
                        size="sm"
                        className="w-full mt-auto text-xs h-7"
                      >
                        Use Sample
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 