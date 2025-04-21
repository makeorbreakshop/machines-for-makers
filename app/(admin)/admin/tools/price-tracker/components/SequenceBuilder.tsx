import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ArrowUp, ArrowDown, Trash2, Edit, Play, ArrowRight, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Types
interface SequenceStep {
  action: string;
  selector?: string;
  time?: number;
}

interface SequenceBuilderProps {
  initialSequence: SequenceStep[];
  onChange: (sequence: SequenceStep[]) => void;
  onTest: () => void;
  productUrl: string;
}

export function SequenceBuilder({ initialSequence, onChange, onTest, productUrl }: SequenceBuilderProps) {
  const [sequence, setSequence] = useState<SequenceStep[]>(initialSequence || []);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<SequenceStep | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestSuccessful, setIsTestSuccessful] = useState(false);
  
  // Initialize sequence when initialSequence changes
  useEffect(() => {
    setSequence(initialSequence || []);
  }, [initialSequence]);

  // Update parent component when sequence changes
  useEffect(() => {
    onChange(sequence);
  }, [sequence, onChange]);

  // Handle step editing
  const openAddStepDialog = () => {
    setCurrentStep({ action: 'click', selector: '' });
    setEditIndex(null);
    setIsStepDialogOpen(true);
  };

  const openEditStepDialog = (index: number) => {
    setCurrentStep({ ...sequence[index] });
    setEditIndex(index);
    setIsStepDialogOpen(true);
  };

  const handleSaveStep = () => {
    if (!currentStep) return;
    
    // Validate step
    if (currentStep.action === 'click' && !currentStep.selector) {
      toast.error("Selector is required for click actions");
      return;
    }
    
    if (currentStep.action === 'wait' && (!currentStep.time || currentStep.time <= 0)) {
      toast.error("Wait time must be positive");
      return;
    }
    
    if (currentStep.action === 'extract' && !currentStep.selector) {
      toast.error("Selector is required for extract actions");
      return;
    }
    
    if (editIndex !== null) {
      // Edit existing step
      const newSequence = [...sequence];
      newSequence[editIndex] = currentStep;
      setSequence(newSequence);
    } else {
      // Add new step
      setSequence([...sequence, currentStep]);
    }
    
    setIsStepDialogOpen(false);
    setCurrentStep(null);
    setEditIndex(null);
  };

  const handleDeleteStep = (index: number) => {
    const newSequence = [...sequence];
    newSequence.splice(index, 1);
    setSequence(newSequence);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === sequence.length - 1)
    ) {
      return;
    }
    
    const newSequence = [...sequence];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap steps
    [newSequence[index], newSequence[newIndex]] = [newSequence[newIndex], newSequence[index]];
    setSequence(newSequence);
  };

  const startRecording = () => {
    if (!productUrl) {
      toast.error("Product URL is required for recording");
      return;
    }
    
    // Open the recording page in a new tab
    const recordingUrl = `/admin/tools/price-tracker/record?url=${encodeURIComponent(productUrl)}`;
    window.open(recordingUrl, '_blank');
    
    toast.info("Recording page opened in a new tab. Click on elements in the page to record actions.");
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      
      // Check if there's an extract step (last step should be extract)
      const hasExtractStep = sequence.length > 0 && sequence[sequence.length - 1].action === 'extract';
      const endpoint = hasExtractStep ? '/api/browser/extract' : '/api/browser/action';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: productUrl,
          actions: sequence.map(step => ({
            type: step.action,
            selector: step.selector,
            time: step.time,
            // Handle null/undefined properties
            ...(step.action === 'click' && !step.selector ? { position: { x: 0, y: 0 } } : {})
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const data = await response.json();
      
      // Update test result state
      setTestResults(data);
      
      // Check for extraction results if using extract endpoint
      if (hasExtractStep && endpoint === '/api/browser/extract') {
        const extractResult = data.results.find((r: any) => r.action.type === 'extract');
        if (extractResult?.extraction?.found) {
          toast.success(`Successfully extracted price: ${extractResult.extraction.prices.map((p: any) => p.parsed).join(', ')}`);
        } else if (data.priceInfo?.found) {
          toast.info(`Found prices with common selectors: ${data.priceInfo.commonSelectors.prices.join(', ')}`, {
            duration: 6000
          });
        } else {
          toast.error('No prices found. Try a different selector.');
        }
      } else {
        toast.success('Test completed successfully!');
      }
      
      // Set test as successful
      setIsTestSuccessful(true);
      
      // Call the original onTest if provided
      if (onTest) onTest();
      
    } catch (error) {
      console.error('Error testing sequence:', error);
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsTestSuccessful(false);
    } finally {
      setIsTesting(false);
    }
  };

  // Render the step with the appropriate icon and text
  const renderStepDetails = (step: SequenceStep) => {
    switch (step.action) {
      case 'click':
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Click element</div>
              <div className="text-sm text-gray-500 truncate max-w-[250px]" title={step.selector}>
                {step.selector}
              </div>
            </div>
          </div>
        );
      case 'wait':
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
              <div className="h-4 w-4 text-amber-600 flex items-center justify-center">⏱️</div>
            </div>
            <div className="flex-1">
              <div className="font-medium">Wait</div>
              <div className="text-sm text-gray-500">
                {step.time}ms
              </div>
            </div>
          </div>
        );
      case 'extract':
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <div className="h-4 w-4 text-green-600 flex items-center justify-center">💰</div>
            </div>
            <div className="flex-1">
              <div className="font-medium">Extract price</div>
              <div className="text-sm text-gray-500 truncate max-w-[250px]" title={step.selector}>
                {step.selector}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
              <div className="h-4 w-4 text-gray-600 flex items-center justify-center">❓</div>
            </div>
            <div className="flex-1">
              <div className="font-medium">{step.action}</div>
              <div className="text-sm text-gray-500">
                Unknown action type
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Sequence Steps</h3>
        <div className="space-x-2">
          <Button variant="secondary" onClick={startRecording}>
            Record New Sequence
          </Button>
          <Button variant="outline" onClick={openAddStepDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </div>
      </div>
      
      {sequence.length === 0 ? (
        <div className="text-center py-8 border rounded-md border-dashed">
          <p className="text-muted-foreground">No steps defined. Add steps or record a new sequence.</p>
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {sequence.map((step, index) => (
            <div key={index} className="p-4 flex justify-between items-center">
              <div className="flex-1">
                {renderStepDetails(step)}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleMoveStep(index, 'up')}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleMoveStep(index, 'down')}
                  disabled={index === sequence.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEditStepDialog(index)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteStep(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-end">
        <Button variant="default" onClick={handleTest} disabled={isTesting || sequence.length === 0}>
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Test Sequence
            </>
          )}
        </Button>
      </div>
      
      {/* Step edit dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? 'Edit Step' : 'Add Step'}</DialogTitle>
            <DialogDescription>
              Configure the settings for this sequence step.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="action" className="text-right font-medium">
                Action Type
              </label>
              <Select
                value={currentStep?.action}
                onValueChange={(value) => setCurrentStep({
                  ...(currentStep || {}),
                  action: value,
                  // Clear irrelevant fields based on action type
                  ...(value === 'wait' ? { selector: undefined } : {}),
                  ...(value !== 'wait' ? { time: undefined } : {})
                } as SequenceStep)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click">Click Element</SelectItem>
                  <SelectItem value="wait">Wait</SelectItem>
                  <SelectItem value="extract">Extract Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {currentStep?.action !== 'wait' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="selector" className="text-right font-medium">
                  Selector
                </label>
                <Input
                  id="selector"
                  value={currentStep?.selector || ''}
                  onChange={(e) => setCurrentStep({
                    ...(currentStep || {}),
                    selector: e.target.value
                  } as SequenceStep)}
                  placeholder={`.class, #id, [attr=value]`}
                  className="col-span-3"
                />
              </div>
            )}
            
            {currentStep?.action === 'wait' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="time" className="text-right font-medium">
                  Wait Time (ms)
                </label>
                <Input
                  id="time"
                  type="number"
                  min="100"
                  step="100"
                  value={currentStep?.time || 1000}
                  onChange={(e) => setCurrentStep({
                    ...(currentStep || {}),
                    time: parseInt(e.target.value)
                  } as SequenceStep)}
                  placeholder="1000"
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStep}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 