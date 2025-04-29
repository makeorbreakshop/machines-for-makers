"use client";

import { useState, useEffect } from "react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import ImageDropzone from "./ImageDropzone";
import DimensionInputs from "./DimensionInputs";
import InkModeSelect from "./InkModeSelect";
import QualitySelector from "./QualitySelector";
import InkPriceInput from "./InkPriceInput";
import ManualMlInputs from "./ManualMlInputs";
import ResultsDisplay from "./ResultsDisplay";

import { 
  ChannelMlValues, 
  InkUsageResult, 
  CostResult, 
  PrintQuality, 
  DimensionValues,
  ChannelCoverageValues,
  InkMode
} from "../types";
import { 
  DEFAULT_INK_PACKAGE_PRICE, 
  DEFAULT_ML_PER_SET, 
  INK_MODES 
} from "../config";
import { calculateCost } from "../utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { HelpCircle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import new services
import { analyzeImage } from "../services/color-analysis";
import { buildCalculationModel, estimateInkUsage } from "../services/calculation-model";

export default function InkCalculator() {
  // Image state
  const [isProcessing, setIsProcessing] = useState(false);
  const [coverage, setCoverage] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [channelCoverage, setChannelCoverage] = useState<ChannelCoverageValues | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);

  // Dimensions state
  const [width, setWidth] = useState<number>(5);
  const [height, setHeight] = useState<number>(5);
  const [unit, setUnit] = useState<'in' | 'mm'>("in");

  // Configuration state
  const [inkMode, setInkMode] = useState<string>("CMYK");
  const [quality, setQuality] = useState<PrintQuality>("standard");
  const [inkPrice, setInkPrice] = useState<number>(DEFAULT_INK_PACKAGE_PRICE);
  const [mlPerSet, setMlPerSet] = useState<number>(DEFAULT_ML_PER_SET);
  const [useManualValues, setUseManualValues] = useState(false);
  const [manualValues, setManualValues] = useState<ChannelMlValues>({});

  // Calculation model state
  const [calculationModel, setCalculationModel] = useState<any>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  // Results state
  const [inkUsage, setInkUsage] = useState<InkUsageResult | null>(null);
  const [costResults, setCostResults] = useState<CostResult | null>(null);

  // Load calculation model and saved values from localStorage on first render
  useEffect(() => {
    const loadModel = async () => {
      setIsLoadingModel(true);
      try {
        const model = await buildCalculationModel();
        setCalculationModel(model);
      } catch (error) {
        console.error("Error loading calculation model:", error);
      } finally {
        setIsLoadingModel(false);
      }
    };

    loadModel();
    
    const savedInkPrice = localStorage.getItem("inkPrice");
    if (savedInkPrice) {
      setInkPrice(parseFloat(savedInkPrice));
    }
    
    const savedMlPerSet = localStorage.getItem("mlPerSet");
    if (savedMlPerSet) {
      setMlPerSet(parseFloat(savedMlPerSet));
    }
  }, []);

  // Handle dimension changes with aspect ratio preservation
  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    
    // If aspect ratio should be maintained and we have image dimensions
    if (maintainAspectRatio && imageDimensions) {
      const aspectRatio = imageDimensions.width / imageDimensions.height;
      setHeight(parseFloat((newWidth / aspectRatio).toFixed(2)));
    }
  };
  
  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    
    // If aspect ratio should be maintained and we have image dimensions
    if (maintainAspectRatio && imageDimensions) {
      const aspectRatio = imageDimensions.width / imageDimensions.height;
      setWidth(parseFloat((newHeight * aspectRatio).toFixed(2)));
    }
  };

  // Update calculations when inputs change
  useEffect(() => {
    if ((!coverage && !useManualValues) || !calculationModel) return;
    
    // Skip calculation if dimensions aren't valid
    if (width <= 0 || height <= 0) return;
    
    try {
      const selectedInkMode = INK_MODES[inkMode];
      if (!selectedInkMode) return;
      
      let channelMl: Record<string, number>;
      
      if (useManualValues) {
        // Use manually entered values
        channelMl = { ...manualValues };
      } else {
        // Use the calculation model to estimate ink usage
        channelMl = estimateInkUsage(
          inkMode,
          quality,
          { width, height, unit },
          coverage || 50, // Default to 50% if no coverage data
          calculationModel
        );
      }
      
      // Calculate total ink usage
      const totalMl = Object.values(channelMl).reduce((sum, val) => sum + val, 0);
      
      const usageResults: InkUsageResult = {
        channelMl,
        totalMl,
        coverage: coverage || 50,
        channelCoverage: channelCoverage || undefined
      };
      
      setInkUsage(usageResults);
      
      // Calculate cost results
      const costResults = calculateCost(
        usageResults,
        inkPrice,
        mlPerSet
      );
      
      setCostResults(costResults);
    } catch (error) {
      console.error("Calculation error:", error);
    }
  }, [
    coverage,
    width,
    height,
    unit,
    inkMode,
    quality,
    inkPrice,
    mlPerSet,
    useManualValues,
    manualValues,
    channelCoverage,
    calculationModel
  ]);

  // Handle image processing
  const handleImageProcessed = async (
    imageUrl: string,
    dimensions: { width: number; height: number }
  ) => {
    try {
      setIsProcessing(true);
      setImageUrl(imageUrl);
      setImageDimensions(dimensions);
      
      // Get the active channels for the selected ink mode
      const selectedInkMode = INK_MODES[inkMode];
      if (!selectedInkMode) return;
      
      // Analyze the image using our enhanced color analysis
      const analysis = await analyzeImage(imageUrl, selectedInkMode.channels);
      
      setCoverage(analysis.totalCoverage);
      setChannelCoverage(analysis.channelCoverage);
      setUseManualValues(false);
      
      // Set initial dimensions based on image aspect ratio
      // Use a default print size (e.g., 5 inches for the larger dimension)
      if (maintainAspectRatio && dimensions) {
        const aspectRatio = dimensions.width / dimensions.height;
        
        if (aspectRatio >= 1) {
          // Landscape or square image
          setWidth(5);
          setHeight(parseFloat((5 / aspectRatio).toFixed(2)));
        } else {
          // Portrait image
          setHeight(5);
          setWidth(parseFloat((5 * aspectRatio).toFixed(2)));
        }
      }
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual values toggling
  const handleManualModeChange = (isChecked: boolean) => {
    setUseManualValues(isChecked);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left Column - Inputs */}
      <div className="space-y-6">
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 bg-card">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold">Upload Image</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-sm">Image analysis helps calculate ink coverage for each color channel.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>Upload your artwork to analyze ink coverage</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageDropzone
              onImageProcessed={handleImageProcessed}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="pb-3 bg-card">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold">Print Specifications</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[220px] text-sm">These settings determine how much ink will be used for your print job.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>Enter your print dimensions and pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-1">
              <div className="space-y-4">
                <DimensionInputs
                  width={width}
                  height={height}
                  unit={unit}
                  onWidthChange={handleWidthChange}
                  onHeightChange={handleHeightChange}
                  onUnitChange={setUnit}
                  imageDimensions={imageDimensions}
                />
                
                {imageDimensions && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox 
                      id="aspect-ratio" 
                      checked={maintainAspectRatio}
                      onCheckedChange={(checked) => setMaintainAspectRatio(checked === true)}
                    />
                    <Label
                      htmlFor="aspect-ratio"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Maintain image aspect ratio
                    </Label>
                  </div>
                )}
              </div>

              <InkPriceInput
                inkPrice={inkPrice}
                onInkPriceChange={setInkPrice}
                mlPerSet={mlPerSet}
                onMlPerSetChange={setMlPerSet}
              />
            </div>

            <Separator className="my-4" />

            <div className="grid gap-6 sm:grid-cols-2">
              <InkModeSelect
                selectedMode={inkMode}
                onModeChange={setInkMode}
              />

              <QualitySelector
                selectedQuality={quality}
                onQualityChange={setQuality}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Advanced Options</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[220px] text-sm">For specialists who want to manually enter ink values.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="use-manual"
                checked={useManualValues}
                onCheckedChange={handleManualModeChange}
              />
              <Label
                htmlFor="use-manual"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Use manual ink values instead of image analysis
              </Label>
            </div>

            {useManualValues && (
              <div className="pt-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <ManualMlInputs
                  inkMode={inkMode}
                  values={manualValues}
                  onChange={setManualValues}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Results */}
      <div className="space-y-6">
        <ResultsDisplay
          costResults={costResults}
          totalMl={inkUsage?.totalMl || null}
          imageUrl={imageUrl}
          channelCoverage={channelCoverage}
        />
        
        {costResults && (
          <Card className="shadow-sm border bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold">Usage Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Print costs may vary based on substrate material and printer settings</li>
                <li>Higher quality settings will increase ink usage but improve detail</li>
                <li>Regularly calibrate your printer to maintain consistent results</li>
                <li>To reduce costs, consider optimizing artwork for lower ink coverage</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 