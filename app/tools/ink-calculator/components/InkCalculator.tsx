"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "sonner";
import { Clipboard, HelpCircle } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import new services
import { analyzeImage } from "../services/color-analysis";
import { buildCalculationModel, estimateInkUsage } from "../services/calculation-model";
import { calculateInkUsage } from "../utils";
import { getCurrentCalibration } from "../services/calibration-loader";

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

  // Calibration state
  const [calibrationTimestamp, setCalibrationTimestamp] = useState<string | null>(null);

  // Load calculation model and saved values from localStorage on first render
  useEffect(() => {
    const loadModel = async () => {
      setIsLoadingModel(true);
      try {
        const model = await buildCalculationModel();
        console.log('DEBUG: Calculation model loaded:', model);
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
    if ((!coverage && !useManualValues)) return;
    
    // Skip calculation if dimensions aren't valid
    if (width <= 0 || height <= 0) return;
    
    const selectedInkMode = INK_MODES[inkMode];
    if (!selectedInkMode) return;
    
    // Set a loading state while we calculate
    setIsProcessing(true);
    
    const performCalculation = async () => {
      try {
        let usageResults;
        
        if (useManualValues) {
          // Use manually entered values
          const manualChannelMl = { ...manualValues };
          const totalMl = Object.values(manualChannelMl).reduce((sum, val) => sum + val, 0);
          
          usageResults = {
            channelMl: manualChannelMl,
            totalMl,
            coverage: coverage || 50,
            channelCoverage: channelCoverage || {}
          };
        } else {
          // Use the ink calculator with dynamic calibration factors
          usageResults = await calculateInkUsage(
            coverage || 50, // Default to 50% if no coverage data
            width,
            height,
            unit,
            selectedInkMode,
            quality,
            undefined,
            channelCoverage || undefined
          );
        }
        
        // Set the ink usage results
        setInkUsage(usageResults);
        
        // Calculate cost results
        const costResults = calculateCost(
          usageResults,
          inkPrice,
          mlPerSet
        );
        
        // Set the cost results
        setCostResults(costResults);
      } catch (error) {
        console.error("Error in calculation:", error);
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Execute the async calculation function
    performCalculation();
    
    // Clear the timeout on cleanup
    return () => {
      // Add any cleanup if needed
    };
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
    channelCoverage
  ]);

  // Handle image processing with enhanced analysis
  const handleImageProcessed = async (
    imageUrl: string,
    dimensions: { width: number; height: number }
  ) => {
    try {
      console.log('DEBUG: Starting image processing with dimensions:', dimensions);
      setIsProcessing(true);
      setImageUrl(imageUrl);
      setImageDimensions(dimensions);
      
      // If maintain aspect ratio is enabled, update dimensions
      if (maintainAspectRatio) {
        const aspectRatio = dimensions.width / dimensions.height;
        setHeight(parseFloat((width / aspectRatio).toFixed(2)));
      }
      
      // Get active channels for the selected ink mode
      const activeChannels = INK_MODES[inkMode]?.channels || [];
      console.log('DEBUG: Active channels for mode', inkMode, ':', activeChannels);
      
      // Analyze the image for color coverage
      const image = document.createElement('img');
      image.src = imageUrl;
      
      await new Promise<void>((resolve) => {
        image.onload = () => {
          console.log('DEBUG: Image loaded, dimensions:', image.width, 'x', image.height);
          resolve();
        };
      });
      
      // Use enhanced color analysis
      console.log('DEBUG: Starting color analysis');
      const analysis = await analyzeImage(image, activeChannels);
      console.log('DEBUG: Color analysis complete:', analysis);
      
      // Update state with analysis results
      setCoverage(analysis.totalCoverage);
      setChannelCoverage(analysis.channelCoverage);
      
      // Calculate ink usage with channel-specific coverage
      if (calculationModel) {
        console.log('DEBUG: Calculating ink usage with model:', calculationModel);
        console.log('DEBUG: Using channel coverage:', analysis.channelCoverage);
        console.log('DEBUG: Print dimensions:', { width, height, unit });
        
        const usage = estimateInkUsage(
          inkMode,
          quality,
          { width, height, unit },
          analysis.totalCoverage,
          calculationModel,
          analysis.channelCoverage // Pass channel-specific coverage
        );
        
        console.log('DEBUG: Estimated ink usage:', usage);
        
        // Calculate total ink usage
        const totalMl = Object.values(usage).reduce((sum, val) => sum + val, 0);
        
        // Update ink usage results
        setInkUsage({
          channelMl: usage,
          totalMl,
          coverage: analysis.totalCoverage,
          channelCoverage: analysis.channelCoverage
        });
        
        // Calculate cost results
        const costResult = calculateCost(
          {
            channelMl: usage,
            totalMl,
            coverage: analysis.totalCoverage
          },
          inkPrice,
          mlPerSet
        );
        
        console.log('DEBUG: Cost calculation complete:', costResult);
        
        setCostResults(costResult);
      } else {
        console.error('DEBUG: Calculation model not available');
      }
      
    } catch (error) {
      console.error("DEBUG: Image processing error:", error);
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual values toggling
  const handleManualModeChange = (isChecked: boolean) => {
    setUseManualValues(isChecked);
  };

  // Add a useEffect to initialize the calculation model on component mount
  useEffect(() => {
    async function initCalculationModel() {
      try {
        setIsLoadingModel(true);
        // Fetch the calculation model
        const model = await buildCalculationModel();
        setCalculationModel(model);
      } catch (error) {
        console.error('Error initializing calculation model:', error);
        toast.error('Failed to initialize calculation model');
      } finally {
        setIsLoadingModel(false);
      }
    }
    
    initCalculationModel();
  }, []);

  // Update the section that calculates ink usage and cost to use channel-specific coverage
  const calculateResults = useCallback(async () => {
    if (!calculationModel || (!imageUrl && !useManualValues)) {
      return;
    }

    try {
      setIsProcessing(true);
      
      let channelCoverageData: ChannelCoverageValues = {};
      let totalCoverageValue = 0;
      
      // If using image analysis (not manual mode)
      if (imageUrl && !useManualValues) {
        // Get the active channels for the selected ink mode
        const activeChannels = INK_MODES[inkMode]?.channels || [];
        
        // Create an image element from the file
        const img = document.createElement('img');
        img.src = imageUrl;
        
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });
        
        // Analyze the image
        const analysisResult = await analyzeImage(img, activeChannels);
        channelCoverageData = analysisResult.channelCoverage;
        totalCoverageValue = analysisResult.totalCoverage;
        
        // Clean up the object URL
        if (typeof imageUrl === 'string') {
          URL.revokeObjectURL(imageUrl);
        }
      }
      
      // Calculate ink usage using the enhanced model that accepts channel-specific coverage
      const usage = useManualValues 
        ? manualValues 
        : estimateInkUsage(
            inkMode,
            quality,
            { width, height, unit },
            totalCoverageValue,
            calculationModel,
            channelCoverageData // Pass the channel-specific coverage values
          );
      
      // Calculate total mL used
      const totalMl = Object.values(usage).reduce((sum, val) => sum + val, 0);
      
      // Create ink usage result object
      const inkUsageResult: InkUsageResult = {
        channelMl: usage,
        totalMl,
        coverage: totalCoverageValue,
        channelCoverage: channelCoverageData
      };
      
      // Use the calculateCost function to properly calculate cost breakdown
      const costResult = calculateCost(
        inkUsageResult,
        inkPrice,
        mlPerSet
      );
      
      // Verify that the channel breakdown is present
      console.log('Cost result with channel breakdown:', costResult);
      
      // Update state with complete objects
      setInkUsage(inkUsageResult);
      setCostResults(costResult);
      setCoverage(totalCoverageValue);
      setChannelCoverage(channelCoverageData);
      
    } catch (error) {
      console.error('Error calculating results:', error);
      toast.error('Failed to calculate results');
    } finally {
      setIsProcessing(false);
    }
  }, [
    calculationModel,
    imageUrl,
    useManualValues,
    inkMode,
    quality,
    width,
    height,
    unit,
    inkPrice,
    mlPerSet
  ]);

  // Add this useEffect to check for calibration data
  useEffect(() => {
    // Check if we're using calibrated factors
    try {
      const calibration = getCurrentCalibration();
      if (calibration && calibration.lastUpdated) {
        setCalibrationTimestamp(calibration.lastUpdated);
      }
    } catch (error) {
      console.warn("Could not load calibration timestamp:", error);
    }
  }, []);

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
          <CardHeader className="pb-3 bg-card">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold">Ink Price Information</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[220px] text-sm">Set the cost of your ink sets and their volume to calculate cost per print.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>Enter your ink price and ink set volume</CardDescription>
          </CardHeader>
          <CardContent>
            <InkPriceInput
              inkPrice={inkPrice}
              onInkPriceChange={setInkPrice}
              mlPerSet={mlPerSet}
              onMlPerSetChange={setMlPerSet}
            />
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
          inkUsage={inkUsage}
        />
        
        {calibrationTimestamp && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800 mt-4">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <span className="font-medium">Using auto-tuned calibration data</span> from {new Date(calibrationTimestamp).toLocaleDateString()}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 