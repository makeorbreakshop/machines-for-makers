"use client"

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface SequenceStep {
  type: string;
  selector?: string;
  position?: { x: number; y: number };
  time?: number;
}

export default function RecordPage() {
  const searchParams = useSearchParams();
  const urlParam = searchParams?.get('url') || '';
  const [url, setUrl] = useState(urlParam || '');
  const [sequence, setSequence] = useState<SequenceStep[]>([]);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Start recording by taking initial screenshot
  const startRecording = async () => {
    if (!url) {
      toast.error('Please enter a valid URL');
      return;
    }
    
    // Reset states
    setError('');
    setLoading(true);
    setRecording(true);
    setSequence([]);
    setCurrentStep(0);
    
    try {
      const response = await fetch('/api/browser/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get screenshot');
      }
      
      // Convert blob to base64
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
        setLoading(false);
      };
      reader.readAsDataURL(blob);
      
      toast.success('Ready to record actions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      setRecording(false);
      toast.error('Failed to load website');
    }
  };
  
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !recording) return;
    
    // Get click coordinates relative to the image
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate position relative to original image size
    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;
    const displayWidth = imageRef.current.width;
    const displayHeight = imageRef.current.height;
    
    const originalX = Math.round((x / displayWidth) * naturalWidth);
    const originalY = Math.round((y / displayHeight) * naturalHeight);
    
    // Add click step to sequence
    const newStep: SequenceStep = {
      type: 'click',
      position: { x: originalX, y: originalY }
    };
    
    setSequence(prev => [...prev, newStep]);
    performAction(newStep);
  };
  
  const performAction = async (step: SequenceStep) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/browser/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          actions: [...sequence, step] // Include all previous steps plus this one
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }
      
      const data = await response.json();
      
      // Update the sequence step with the detected selector
      if (data.results.length > 0) {
        const lastResult = data.results[data.results.length - 1];
        if (lastResult.selector) {
          // Update the sequence step with the detected selector
          setSequence(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1].selector = lastResult.selector;
            }
            return updated;
          });
        }
      }
      
      // Update screenshot
      if (data.imageBase64) {
        setScreenshot(`data:image/png;base64,${data.imageBase64}`);
      }
      
      // Check if price was found
      if (data.priceInfo?.found) {
        toast.success(`Detected price: ${data.priceInfo.prices.join(', ')}`);
      }
      
      setCurrentStep(prev => prev + 1);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      toast.error('Action failed');
    }
  };
  
  const addWaitStep = () => {
    const waitStep: SequenceStep = { type: 'wait', time: 1000 };
    setSequence(prev => [...prev, waitStep]);
    performAction(waitStep);
    toast.info('Added wait step (1000ms)');
  };
  
  const removeStep = (index: number) => {
    // Remove step and reset to initial state
    setSequence(prev => prev.filter((_, i) => i !== index));
    // Replay the sequence up to this point
    setLoading(true);
    
    // If we're removing the last step, we need to replay all previous steps
    const remainingSequence = sequence.filter((_, i) => i !== index);
    
    if (remainingSequence.length === 0) {
      // If all steps are removed, restart recording
      startRecording();
    } else {
      // Otherwise replay the sequence
      fetch('/api/browser/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          actions: remainingSequence
        })
      })
      .then(response => {
        if (!response.ok) throw new Error('Failed to replay sequence');
        return response.json();
      })
      .then(data => {
        if (data.imageBase64) {
          setScreenshot(`data:image/png;base64,${data.imageBase64}`);
        }
        setCurrentStep(remainingSequence.length);
        setLoading(false);
      })
      .catch(err => {
        toast.error('Failed to replay sequence');
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Unknown error');
      });
    }
  };
  
  const stopRecording = () => {
    setRecording(false);
    
    // Add extract step if not already present
    if (sequence.length > 0) {
      const lastStep = sequence[sequence.length - 1];
      if (lastStep.type !== 'extract') {
        // Create the extract step with common price selectors
        const extractStep: SequenceStep = {
          type: 'extract',
          selector: '.price, .product-price, [data-price], [itemprop="price"]'
        };
        
        // First add a wait step
        const waitStep: SequenceStep = {
          type: 'wait',
          time: 1000
        };
        
        // Add steps to sequence
        const updatedSequence = [...sequence, waitStep, extractStep];
        setSequence(updatedSequence);
        
        // Test the extraction to see if it works
        setLoading(true);
        toast.info('Testing price extraction...');
        
        fetch('/api/browser/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            actions: updatedSequence
          })
        })
        .then(response => {
          if (!response.ok) throw new Error('Failed to extract price');
          return response.json();
        })
        .then(data => {
          setLoading(false);
          
          if (data.imageBase64) {
            setScreenshot(`data:image/png;base64,${data.imageBase64}`);
          }
          
          // Check the results of the extraction
          const extractResult = data.results.find((r: any) => r.action.type === 'extract');
          if (extractResult?.extraction?.found) {
            toast.success(`Successfully extracted price: ${extractResult.extraction.prices.map((p: any) => p.parsed).join(', ')}`);
          } else if (data.priceInfo?.found) {
            // If direct extraction failed but we found prices with common selectors, update the extract step with better selectors
            const betterSelector = data.priceInfo.commonSelectors.selectors[0];
            const updatedExtractStep = {
              ...extractStep,
              selector: betterSelector
            };
            
            // Update the sequence with the better selector
            setSequence(prev => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = updatedExtractStep;
              }
              return updated;
            });
            
            toast.success(`Found better price selector: ${betterSelector}`);
          } else {
            toast.error('Failed to extract price. Try selecting a specific price element.');
          }
        })
        .catch(err => {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Unknown error');
          toast.error('Failed to test price extraction');
        });
      }
    }
  };
  
  const applySequence = () => {
    if (sequence.length === 0) {
      toast.error('No sequence steps to apply');
      return;
    }
    
    // Convert sequence to the format expected by the parent window
    const formattedSequence = sequence.map(step => ({
      action: step.type,  // Convert type to action
      selector: step.selector,
      time: step.time
    }));
    
    // Store in localStorage for retrieval by the parent window
    localStorage.setItem('recordedSequence', JSON.stringify(formattedSequence));
    
    toast.success('Sequence recorded successfully! You can now close this tab and continue in the main window.');
    
    // Attempt to send data back to opener window
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: 'SEQUENCE_RECORDED', sequence: formattedSequence }, '*');
      } catch (error) {
        console.error('Error sending message to opener:', error);
      }
    }
  };
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => window.close()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Config
          </Button>
          <h1 className="text-xl font-bold ml-4">Record Sequence</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {!recording ? (
            <div className="flex space-x-2">
              <Input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="Enter product URL" 
                className="w-96"
                disabled={loading}
              />
              <Button onClick={startRecording} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Start Recording'
                )}
              </Button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={addWaitStep} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Wait
              </Button>
              <Button variant="destructive" onClick={stopRecording} disabled={loading}>
                Stop Recording
              </Button>
              <Button variant="default" onClick={applySequence} disabled={loading || sequence.length === 0}>
                <Check className="h-4 w-4 mr-2" />
                Apply Sequence
              </Button>
            </div>
          )}
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with recorded steps */}
        <div className="w-72 bg-gray-50 border-r p-4 overflow-y-auto" style={{ minHeight: 0, maxHeight: '100%' }}>
          <h2 className="text-lg font-semibold mb-4">Recorded Steps</h2>
          
          {sequence.length === 0 ? (
            <div className="text-gray-500 italic text-sm">
              {recording 
                ? 'Click on the screenshot to record actions' 
                : 'Click "Start Recording" to begin'}
            </div>
          ) : (
            <div className="space-y-2">
              {sequence.map((step, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between bg-white p-2 rounded border ${
                    index === currentStep - 1 ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <span className="font-medium">{step.type}</span>
                    {step.selector && (
                      <div className="text-xs text-gray-500 truncate max-w-[180px]" title={step.selector}>
                        {step.selector}
                      </div>
                    )}
                    {step.position && (
                      <div className="text-xs text-gray-500">
                        x: {step.position.x}, y: {step.position.y}
                      </div>
                    )}
                    {step.time && (
                      <div className="text-xs text-gray-500">
                        {step.time}ms
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeStep(index)} disabled={loading}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Main content area */}
        <div className="flex-1 overflow-hidden flex items-center justify-center relative" style={{ height: 'calc(100vh - 73px)' }}>
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-500" />
                <p className="mt-2">Processing...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
              <div className="text-center p-6">
                <div className="text-red-500 text-xl mb-2">Error</div>
                <p className="mb-4">{error}</p>
                <Button variant="outline" onClick={startRecording}>Try Again</Button>
              </div>
            </div>
          )}
          
          {screenshot ? (
            <div className="overflow-auto w-full h-full bg-gray-100 p-4">
              <div className="flex flex-col items-center">
                <img 
                  ref={imageRef}
                  src={screenshot} 
                  alt="Website screenshot" 
                  className={`max-w-full ${recording && !loading ? 'cursor-pointer' : ''}`}
                  onClick={recording && !loading ? handleImageClick : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <h3 className="text-xl font-medium mb-2">Ready to Record</h3>
                <p className="text-gray-500 mb-4">Enter the product URL and click "Start Recording" to begin</p>
                <p className="text-sm text-blue-600">
                  No DevTools required! Just click on the screenshot to record clicks.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 