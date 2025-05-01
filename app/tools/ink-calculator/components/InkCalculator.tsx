"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "sonner";
import { Clipboard, HelpCircle, ArrowRight, Check, RefreshCw } from "lucide-react";

import ImageDropzone, { ImageDropzoneRef } from "./ImageDropzone";
import DimensionInputs from "./DimensionInputs";
import InkModeSelect from "./InkModeSelect";
import QualitySelector from "./QualitySelector";
import InkPriceInput from "./InkPriceInput";
import ManualMlInputs from "./ManualMlInputs";
import SamplePicker from "./SamplePicker";
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

// Import validation service to use the same calculation process
import { validateTestEntry } from "../services/validation";
import { analyzeImage } from "../services/color-analysis";
import { refreshCalibrationFromDatabase, getCurrentCalibration } from "../services/calibration-loader";

export default function InkCalculator() {
  // Image state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCalibration, setIsLoadingCalibration] = useState(false);
  const [coverage, setCoverage] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [channelCoverage, setChannelCoverage] = useState<ChannelCoverageValues | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);

  // UI state
  const [imageTab, setImageTab] = useState<string>("upload");
  const [activeTab, setActiveTab] = useState<string>("essentials");
  const imageDropzoneRef = useRef<ImageDropzoneRef>(null);

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

  // Results state
  const [inkUsage, setInkUsage] = useState<InkUsageResult | null>(null);
  const [costResults, setCostResults] = useState<CostResult | null>(null);

  // Calibration state
  const [calibrationTimestamp, setCalibrationTimestamp] = useState<string | null>(null);

  // Fix ImageDropzone props
  const [setIsProcessingState, setSetIsProcessingState] = useState<(value: boolean) => void>(() => setIsProcessing);

  // Load saved values from localStorage and refresh calibration on first render
  useEffect(() => {
    const loadSavedValues = async () => {
      // Load saved ink price and ml per set
      const savedInkPrice = localStorage.getItem("inkPrice");
      if (savedInkPrice) {
        setInkPrice(parseFloat(savedInkPrice));
      }
      
      const savedMlPerSet = localStorage.getItem("mlPerSet");
      if (savedMlPerSet) {
        setMlPerSet(parseFloat(savedMlPerSet));
      }

      // Refresh calibration data from database
      setIsLoadingCalibration(true);
      try {
        await refreshCalibrationFromDatabase();
        const calibration = getCurrentCalibration();
        if (calibration && calibration.lastUpdated) {
          setCalibrationTimestamp(calibration.lastUpdated);
        }
      } catch (error) {
        console.error("Error loading calibration:", error);
      } finally {
        setIsLoadingCalibration(false);
      }
    };

    loadSavedValues();
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

  // Handle unit change with conversion
  const handleUnitChange = (newUnit: 'in' | 'mm') => {
    if (newUnit === unit) return; // No change

    if (newUnit === 'mm') {
      // Convert from inches to mm - round to nearest whole number
      setWidth(Math.round(width * 25.4));
      setHeight(Math.round(height * 25.4));
    } else {
      // Convert from mm to inches - round to 1 decimal place
      setWidth(parseFloat((width / 25.4).toFixed(1)));
      setHeight(parseFloat((height / 25.4).toFixed(1)));
    }
    
    setUnit(newUnit);
  };

  // Update calculations when inputs change
  useEffect(() => {
    // Skip calculation if no image uploaded or using manual values without an image
    if ((!coverage && !useManualValues) || !imageUrl) return;
    
    // Skip calculation if dimensions aren't valid
    if (width <= 0 || height <= 0) return;
    
    const selectedInkMode = INK_MODES[inkMode];
    if (!selectedInkMode) return;
    
    // Set a loading state while we calculate
    setIsProcessing(true);
    
    const performCalculation = async () => {
      try {
        // IMPORTANT: Refresh calibration data from database before each calculation
        // This ensures we're using the most up-to-date calibration factors
        await refreshCalibrationFromDatabase();
        
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
          // Create a test data entry object similar to what the validator uses
          const testEntry = {
            id: 'calculator-entry',
            ink_mode: inkMode,
            quality: quality,
            dimensions: {
              width: width,
              height: height,
              unit: unit
            },
            channel_ml: {}, // We don't need actual values for prediction
            image_analysis: {
              totalCoverage: coverage || 50,
              channelCoverage: channelCoverage || {}
            }
          };
          
          // Use the validator calculation process
          const validationResult = await validateTestEntry(testEntry);
          
          // Extract the results from the validation
          usageResults = {
            channelMl: validationResult.predictedValues,
            totalMl: Object.values(validationResult.predictedValues).reduce((sum, ml) => sum + ml, 0),
            coverage: coverage || 50,
            channelCoverage: channelCoverage || {}
          };
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
        
        // Update calibration timestamp
        const calibration = getCurrentCalibration();
        if (calibration && calibration.lastUpdated) {
          setCalibrationTimestamp(calibration.lastUpdated);
        }
      } catch (error) {
        console.error("Error in calculation:", error);
        toast.error("Error calculating ink usage");
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Execute the async calculation function
    performCalculation();
    
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
      console.log('Starting image processing with dimensions:', dimensions);
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
      
      // Analyze the image for color coverage
      const image = document.createElement('img');
      image.src = imageUrl;
      
      // Wait for the image to load
      await new Promise((resolve) => {
        image.onload = resolve;
      });
      
      // Use the color analysis service that gives us channel coverage values
      const analysisResult = await analyzeImage(image, activeChannels);
      
      if (analysisResult) {
        // Set the coverage and channel coverage values
        setCoverage(analysisResult.totalCoverage);
        setChannelCoverage(analysisResult.channelCoverage);
        console.log('Analysis complete, coverage:', analysisResult.totalCoverage);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Error analyzing image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to clear the image and reset related state
  const handleImageRemove = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    
    // Reset image-related state
    setImageUrl(null);
    setCoverage(null);
    setChannelCoverage(null);
    setImageDimensions(null);
    
    // Clear results but preserve configuration
    setInkUsage(null);
    setCostResults(null);
  };

  // Function to handle replacing the current image
  const handleReplaceImage = () => {
    if (imageDropzoneRef.current) {
      imageDropzoneRef.current.openFileDialog();
    }
  };

  // Handle manual mode toggle
  const handleManualModeChange = (isChecked: boolean) => {
    setUseManualValues(isChecked);
    
    // Prepopulate manual values with current calculated values
    if (isChecked && inkUsage) {
      setManualValues(inkUsage.channelMl);
    }
  };

  // Update manual values
  const handleManualValueChange = (values: ChannelMlValues) => {
    setManualValues(values);
  };

  // Save price and ml per set to localStorage
  const handlePriceChange = (price: number) => {
    setInkPrice(price);
    localStorage.setItem("inkPrice", price.toString());
  };
  
  const handleMlPerSetChange = (ml: number) => {
    setMlPerSet(ml);
    localStorage.setItem("mlPerSet", ml.toString());
  };

  // Copy results to clipboard
  const handleCopyResults = () => {
    if (!inkUsage || !costResults) return;
    
    const resultsText = `
      Ink Usage Report:
      - Total Ink: ${inkUsage.totalMl.toFixed(4)} mL
      - Cost per Print: $${costResults.costPerPrint.toFixed(4)}
      - Prints per Ink Set: ${costResults.printsPerSet.toFixed(2)}
      
      Channel Breakdown:
      ${Object.entries(inkUsage.channelMl)
        .map(([channel, ml]) => `- ${channel}: ${ml.toFixed(4)} mL`)
        .join('\n')
      }
      
      Coverage: ${inkUsage.coverage.toFixed(1)}%
    `.trim();
    
    navigator.clipboard.writeText(resultsText)
      .then(() => toast.success('Results copied to clipboard'))
      .catch(() => toast.error('Failed to copy results'));
  };

  // Handle loading sample data from the database
  const handleSampleSelected = async (sample: any) => {
    try {
      // Set ink mode - ensure we're using the exact ink mode string that exists in our config
      if (INK_MODES[sample.ink_mode]) {
        setInkMode(sample.ink_mode);
      } else {
        // If for some reason the ink mode doesn't match our config, fall back to CMYK
        console.warn(`Unknown ink mode: ${sample.ink_mode}, falling back to CMYK`);
        setInkMode("CMYK");
      }
      
      // Set quality
      if (["draft", "standard", "high"].includes(sample.quality)) {
        setQuality(sample.quality as PrintQuality);
      } else {
        // Default to standard if quality doesn't match
        setQuality("standard");
      }
      
      // Handle dimensions and unit with proper conversion
      const sampleUnit = sample.dimensions.unit === "mm" ? "mm" : "in";
      
      // First set the raw dimensions
      setWidth(sample.dimensions.width);
      setHeight(sample.dimensions.height);
      
      // Then set the unit (without conversion since we're already in the correct unit)
      setUnit(sampleUnit);
      
      // Set image data if available
      if (sample.image_url) {
        setIsProcessing(true);
        
        try {
          // Set the image URL to display the image
          setImageUrl(sample.image_url);
          
          // Set image dimensions
          const dimensions = {
            width: sample.dimensions.width,
            height: sample.dimensions.height
          };
          setImageDimensions(dimensions);
          
          // If we have coverage data in the sample, use that
          if (sample.image_analysis?.totalCoverage) {
            setCoverage(sample.image_analysis.totalCoverage);
          }
          
          // If we have channel coverage in the sample, use that
          if (sample.image_analysis?.channelCoverage) {
            setChannelCoverage(sample.image_analysis.channelCoverage);
          } 
          // If we don't have coverage data but have an image, analyze it
          else if (sample.image_url) {
            // Create an image element for analysis
            const image = new window.Image();
            image.src = sample.image_url;
            
            // Wait for the image to load
            await new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject(new Error("Failed to load image for analysis"));
              
              // Set a timeout to prevent hanging
              setTimeout(() => reject(new Error("Image load timed out")), 5000);
            });
            
            // Get active channels for the selected ink mode
            const activeChannels = INK_MODES[sample.ink_mode]?.channels || [];
            
            // Analyze the image
            const analysisResult = await analyzeImage(image, activeChannels);
            
            if (analysisResult) {
              setCoverage(analysisResult.totalCoverage);
              setChannelCoverage(analysisResult.channelCoverage);
            }
          }
        } catch (error) {
          console.error("Error processing sample image:", error);
          toast.error("Error analyzing sample image");
        } finally {
          setIsProcessing(false);
        }
      }
      
      // Set manual values from channel_ml
      if (sample.channel_ml && Object.keys(sample.channel_ml).length > 0) {
        setManualValues(sample.channel_ml);
        
        // Enable manual mode to show the actual measured values
        setUseManualValues(true);
      }
      
      // After successfully loading the sample, switch back to upload tab
      setImageTab("upload");
      
    } catch (error) {
      console.error("Error loading sample:", error);
      toast.error("Failed to load sample");
    }
  };

  // Function to format cost with proper precision
  const formatCost = (cost: number) => {
    return cost < 0.0001 ? "< $0.0001" : `$${cost.toFixed(4)}`;
  };

  return (
    <div className="space-y-4">
      {/* Main header with title and calibration info */}
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">UV Printer Ink Cost Calculator</h1>
          <p className="text-muted-foreground">Calculate accurate ink costs for your UV printing jobs</p>
        </div>
        {calibrationTimestamp && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  Calibrated {new Date(calibrationTimestamp).toLocaleDateString()}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Last calibration data update</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {/* Main calculator grid layout - two columns with results on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Left Column - Steps 1 & 2 */}
        <div className="md:col-span-1 lg:col-span-5 space-y-4">
          {/* Step 1: Image Upload/Sample Selection */}
          <Card className="overflow-hidden shadow-sm border-muted/20">
            <CardHeader className="bg-muted/20 pb-3">
              <div className="flex items-center">
                <div className="h-5 w-5 rounded-full bg-muted-foreground/20 text-center text-xs font-medium mr-2 flex items-center justify-center">1</div>
                <CardTitle className="text-lg">Image Source</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs value={imageTab} onValueChange={setImageTab} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="upload">Upload Image</TabsTrigger>
                  <TabsTrigger value="sample">Use Sample</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-4">
                  {/* Image upload area or current image display */}
                  <ImageDropzone
                    ref={imageDropzoneRef}
                    onImageProcessed={handleImageProcessed}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessingState}
                    currentImageUrl={imageUrl}
                    onImageRemove={handleImageRemove}
                  />
                  
                  {imageUrl && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {coverage !== null ? `Coverage: ${coverage.toFixed(1)}%` : "Analyzing..."}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReplaceImage}
                        className="h-8 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Replace
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="sample">
                  <SamplePicker 
                    onSelectSample={handleSampleSelected} 
                    onSampleSelected={() => setImageTab("upload")}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Step 2: Configure Print Settings */}
          <Card className="overflow-hidden shadow-sm border-muted/20">
            <CardHeader className="bg-muted/20 pb-3">
              <div className="flex items-center">
                <div className="h-5 w-5 rounded-full bg-muted-foreground/20 text-center text-xs font-medium mr-2 flex items-center justify-center">2</div>
                <CardTitle className="text-lg">Print Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="essentials">Essentials</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
                
                <TabsContent value="essentials" className="space-y-4">
                  {/* Dimensions */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Dimensions</h3>
                    <DimensionInputs
                      width={width}
                      height={height}
                      unit={unit}
                      onWidthChange={handleWidthChange}
                      onHeightChange={handleHeightChange}
                      onUnitChange={handleUnitChange}
                      imageDimensions={imageDimensions}
                    />
                    
                    {/* Aspect Ratio Checkbox - only show if we have image dimensions */}
                    {imageDimensions && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Checkbox
                          id="maintainAspectRatio"
                          checked={maintainAspectRatio}
                          onCheckedChange={(checked) => setMaintainAspectRatio(checked as boolean)}
                        />
                        <Label
                          htmlFor="maintainAspectRatio"
                          className="text-sm leading-none"
                        >
                          Maintain image aspect ratio
                        </Label>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Ink Mode & Quality */}
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Print Configuration</h3>
                      
                      {/* Ink Mode Select */}
                      <InkModeSelect
                        selectedMode={inkMode}
                        onModeChange={setInkMode}
                      />
                      
                      {/* Quality Selector */}
                      <QualitySelector
                        selectedQuality={quality}
                        onQualityChange={setQuality}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4 mt-0">
                  {/* Ink Price Information */}
                  <div>
                    <InkPriceInput
                      inkPrice={inkPrice}
                      mlPerSet={mlPerSet}
                      onInkPriceChange={handlePriceChange}
                      onMlPerSetChange={handleMlPerSetChange}
                    />
                  </div>
                  
                  <Separator />
                  
                  {/* Manual Mode Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Manual ML Values</h3>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useManualValues"
                          checked={useManualValues}
                          onCheckedChange={handleManualModeChange}
                        />
                        <Label
                          htmlFor="useManualValues"
                          className="text-sm leading-none"
                        >
                          Enable manual values
                        </Label>
                      </div>
                    </div>
                    
                    {useManualValues && (
                      <ManualMlInputs
                        inkMode={inkMode}
                        values={manualValues}
                        onChange={setManualValues}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Results (Step 3) - STICKY on larger screens */}
        <div className="md:col-span-1 lg:col-span-7 lg:sticky lg:top-6 lg:self-start">
          <Card className="h-full overflow-hidden shadow-md border-muted/20">
            <CardHeader className="bg-gradient-to-r from-muted/30 to-background pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full bg-muted-foreground/20 text-center text-xs font-medium mr-2 flex items-center justify-center">3</div>
                  <CardTitle className="text-lg">Calculation Results</CardTitle>
                </div>
                
                {inkUsage && costResults && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyResults}
                    className="h-8"
                  >
                    <Clipboard className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-4 flex-grow">
              {!inkUsage || !costResults || !imageUrl ? (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <HelpCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground max-w-xs font-medium">
                    {imageUrl 
                      ? isProcessing 
                        ? "Calculating results..."
                        : "Adjust your print settings to see results"
                      : "Upload an image or select a sample to calculate ink usage and costs"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Key Results - prominently displayed */}
                  <div className="text-center py-4 px-2 border rounded-lg bg-card shadow-sm">
                    <p className="text-sm uppercase tracking-wide text-muted-foreground font-medium mb-1">Cost per Print</p>
                    <p className="text-4xl font-bold mb-2">
                      {formatCost(costResults.costPerPrint)}
                    </p>
                    
                    <div className="flex justify-center gap-8 mt-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Prints per Set</p>
                        <p className="text-xl font-semibold">
                          {costResults.printsPerSet > 999999
                            ? "999,999+"
                            : costResults.printsPerSet.toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Total Ink</p>
                        <p className="text-xl font-semibold">
                          {inkUsage.totalMl.toFixed(3)} <span className="text-sm">mL</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional info - Channel breakdown only, no duplicate image */}
                  <div className="space-y-1 mt-6">
                    <Accordion type="single" collapsible defaultValue="item-1" className="w-full border rounded-md overflow-hidden">
                      <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="text-sm py-3 hover:no-underline hover:bg-muted/20 px-3 font-medium">
                          Channel Breakdown
                        </AccordionTrigger>
                        <AccordionContent className="px-0">
                          <div className="text-sm divide-y divide-border/20">
                            {Object.entries(inkUsage.channelMl).map(([channel, ml]) => (
                              <div key={channel} className="flex justify-between items-center py-2.5 px-4 hover:bg-muted/10">
                                <span className="capitalize">{channel}:</span>
                                <span className="font-mono font-medium">{ml.toFixed(4)} mL</span>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
              <p>Calculations based on calibrated printer data. Results may vary slightly from actual usage.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 