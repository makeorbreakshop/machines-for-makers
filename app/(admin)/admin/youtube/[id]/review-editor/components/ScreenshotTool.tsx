'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Camera, Plus, Minus, ChevronLeft, ChevronRight, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

interface ScreenshotToolProps {
  draftId: string;
  videoId: string;
  machineId?: string; // Optional machine ID to associate screenshots with
  onScreenshotInsert?: (imageUrl: string) => void;
}

export default function ScreenshotTool({
  draftId,
  videoId,
  machineId,
  onScreenshotInsert
}: ScreenshotToolProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<{id: string, url: string, timestamp: string, used: boolean}[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [authError, setAuthError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  
  useEffect(() => {
    // Load screenshots for this draft/video if they exist
    const fetchScreenshots = async () => {
      try {
        setAuthError(false);
        
        // Use retryOperation to handle potential intermittent failures
        const { response, success, error } = await retryOperation(() => 
          fetch(`/api/admin/youtube/videos/screenshots?draftId=${draftId}&videoId=${videoId}`)
        );
        
        if (success && response) {
          const data = await response.json();
          console.log('Fetched screenshots:', data);
          
          if (data.screenshots && Array.isArray(data.screenshots)) {
            setScreenshots(data.screenshots);
            if (data.screenshots.length > 0) {
              toast.success(`Loaded ${data.screenshots.length} screenshots`);
            }
          } else {
            console.warn('No screenshots array in response:', data);
            setScreenshots([]);
          }
        } else {
          console.error('Failed to fetch screenshots after retries:', error);
          
          // Check if we already set auth error during retries
          if (!authError) {
            toast.error('Failed to load screenshots. Please try refreshing the page.');
          }
        }
      } catch (error) {
        console.error('Error in fetchScreenshots function:', error);
        toast.error('Failed to load screenshots');
      }
    };
    
    fetchScreenshots();
    
    // Add listener for screenshot usage events
    const handleScreenshotUsed = (event: CustomEvent) => {
      if (event.detail && event.detail.id) {
        // Mark screenshot as used in the UI
        setScreenshots(prev => 
          prev.map(s => 
            s.id === event.detail.id ? { ...s, used: true } : s
          )
        );
        
        // Mark screenshot as used in the database
        markScreenshotAsUsed(event.detail.id);
      }
    };
    
    window.addEventListener('screenshotUsed', handleScreenshotUsed as EventListener);
    
    return () => {
      window.removeEventListener('screenshotUsed', handleScreenshotUsed as EventListener);
      // Clean up video URL object if it exists
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [draftId, videoId, videoUrl]);

  // Add a separate effect for keyboard shortcuts to make it more focused
  useEffect(() => {
    // Only set up keyboard listener if there's a video loaded
    if (!videoRef.current) return;

    const handleKeyboardNavigation = (e: KeyboardEvent) => {
      // Only handle navigation keys if video player is in focus or its parent
      if (document.activeElement === videoRef.current || 
          document.activeElement?.contains(videoRef.current)) {
        if (e.key === ',') {
          e.preventDefault();
          stepBackward();
          console.log('Step backward');
        } else if (e.key === '.') {
          e.preventDefault();
          stepForward();
          console.log('Step forward');
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          stepForward();
          console.log('Step forward (plus)');
        }
      }
    };

    // Add document-level listener for keyboard events
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [videoRef.current]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Clean up previous video URL if it exists
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      
      // Create a new URL for the video file
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoUrl(url);
      
      toast.success('Video file loaded successfully');
    }
  };
  
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };
  
  const formatTimestamp = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };
  
  const stepForward = () => {
    if (!videoRef.current) return;
    
    // Step forward approximately one frame (assuming 30fps)
    videoRef.current.currentTime += (1/30);
  };
  
  const stepBackward = () => {
    if (!videoRef.current) return;
    
    // Step backward approximately one frame (assuming 30fps)
    videoRef.current.currentTime -= (1/30);
  };
  
  const captureScreenshot = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    
    try {
      setIsCapturing(true);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        toast.error('Failed to capture screenshot: Canvas context not available');
        return;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get the timestamp
      const timestamp = formatTimestamp(video.currentTime);
      
      // Convert to blob with quality settings for optimization
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else toast.error('Failed to create image');
        }, 'image/jpeg', 0.85); // 85% quality JPEG for good compression
      });
      
      setIsUploading(true);
      
      // Create FormData to upload
      const formData = new FormData();
      formData.append('file', blob, `screenshot-${timestamp.replace(/:/g, '-')}.jpg`);
      formData.append('draftId', draftId);
      formData.append('videoId', videoId);
      formData.append('timestamp', timestamp);
      
      // Add machine ID if it's available
      if (machineId) {
        formData.append('machineId', machineId);
        console.log(`Associating screenshot with machine ID: ${machineId}`);
      }
      
      toast.loading('Saving screenshot...');
      
      // Upload to API endpoint with retry mechanism
      const { response, success, error } = await retryOperation(() => 
        fetch('/api/admin/youtube/videos/screenshots', {
          method: 'POST',
          body: formData,
        })
      );
      
      if (!success) {
        if (error) {
          throw new Error(
            typeof error === 'object' && error.error 
              ? error.error 
              : 'Failed to upload screenshot after multiple attempts'
          );
        }
        throw new Error('Failed to upload screenshot after multiple attempts');
      }
      
      if (!response) {
        throw new Error('No response received from the server');
      }
      
      const data = await response.json();
      
      // Check for partial success (207 status code)
      if (response.status === 207 && data.warning) {
        console.warn('Partial success:', data.warning);
        toast.warning(data.warning);
      }
      
      // Verify the response has the expected data
      if (!data.id || !data.url) {
        console.error('Invalid response data:', data);
        throw new Error('Server returned invalid data');
      }
      
      // Add to screenshots array
      setScreenshots(prev => [...prev, {
        id: data.id,
        url: data.url,
        timestamp: timestamp,
        used: false
      }]);
      
      toast.success('Screenshot captured successfully');
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      
      // Provide a more detailed error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to capture screenshot';
      
      toast.error(errorMessage);
      
      // Check for network issues
      if (!navigator.onLine) {
        toast.error('Network connection issue detected. Please check your internet connection.');
      }
    } finally {
      setIsCapturing(false);
      setIsUploading(false);
      toast.dismiss();
    }
  };
  
  const deleteScreenshot = async (id: string) => {
    // Check if screenshot is used in the review
    const screenshot = screenshots.find(s => s.id === id);
    if (screenshot?.used) {
      toast.error('Cannot delete a screenshot that is currently used in the review');
      return;
    }
    
    try {
      toast.loading(`Deleting screenshot...`);
      
      // Use the retry mechanism for more reliable deletion
      const { response, success, error } = await retryOperation(() => 
        fetch(`/api/admin/youtube/videos/screenshots/${id}`, {
          method: 'DELETE',
        })
      );
      
      if (!success) {
        if (error) {
          throw new Error(
            typeof error === 'object' && error.error 
              ? error.error 
              : 'Failed to delete screenshot after multiple attempts'
          );
        }
        throw new Error('Failed to delete screenshot after multiple attempts');
      }
      
      if (!response) {
        throw new Error('No response received from the server');
      }
      
      // Check for partial success (207 status code)
      if (response.status === 207) {
        const data = await response.json();
        console.warn('Partial deletion success:', data);
        toast.warning(data.message || 'Screenshot partially deleted');
      }
      
      // Remove from screenshots array regardless
      setScreenshots(prev => prev.filter(s => s.id !== id));
      toast.success('Screenshot deleted');
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      
      // Provide a more detailed error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete screenshot';
      
      toast.error(errorMessage);
    } finally {
      toast.dismiss();
    }
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, screenshot: { id: string, url: string }) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'screenshot',
      id: screenshot.id,
      url: screenshot.url,
      width: '33%' // Set default width for dropped screenshots
    }));
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  const markScreenshotAsUsed = async (screenshotId: string) => {
    try {
      // Use the retry mechanism for more reliable marking
      const { response, success, error } = await retryOperation(() => 
        fetch('/api/admin/youtube/videos/screenshots/mark-used', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            screenshotId,
            isUsed: true,
          }),
        })
      );
      
      if (!success) {
        console.error('Failed to mark screenshot as used after retries:', error);
        return;
      }
      
      console.log('Successfully marked screenshot as used:', screenshotId);
    } catch (error) {
      console.error('Error marking screenshot as used:', error);
    }
  };
  
  // Add a function to refresh authentication
  const refreshAuth = () => {
    // Redirect to the same page to force a full reload and re-authenticate
    router.refresh();
    toast.success('Refreshing page...');
  };
  
  // Function to retry failed operations
  const retryOperation = async (operation: () => Promise<Response>, maxRetries = 3) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await operation();
        if (response.ok) {
          return { response, success: true };
        }
        lastError = await response.json();
        console.warn(`Attempt ${attempt + 1} failed:`, lastError);
        
        // If it's an auth error, don't retry - we need user intervention
        if (response.status === 401) {
          setAuthError(true);
          toast.error('Authentication error. Please refresh the page to log in again.');
          return { response, success: false };
        }
        
        // Sleep a bit between retries with increasing delay
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 500));
      } catch (error) {
        console.error(`Attempt ${attempt + 1} exception:`, error);
        lastError = error;
      }
    }
    return { error: lastError, success: false };
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Video Player */}
      <div className="p-4 border-b flex-shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/*"
          className="hidden"
        />
        
        {/* Canvas for capturing screenshots - hidden */}
        <canvas ref={canvasRef} className="hidden" />
        
        {videoUrl ? (
          <div className="space-y-2">
            <div className="rounded-md overflow-hidden border bg-black aspect-video">
              <video 
                ref={videoRef} 
                src={videoUrl} 
                controls 
                className="w-full h-full"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={stepBackward}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Previous Frame (,)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={stepForward}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Next Frame (.)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {videoRef.current && (
                  <span className="text-sm">
                    {formatTimestamp(videoRef.current.currentTime || 0)}
                  </span>
                )}
              </div>
              
              <Button 
                variant="secondary" 
                size="sm"
                onClick={captureScreenshot}
                disabled={isCapturing || isUploading}
              >
                {isCapturing || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    {isUploading ? 'Uploading...' : 'Capturing...'}
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-1" />
                    Capture
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-muted-foreground">
            <Upload className="h-8 w-8 mb-2" />
            <p>Select a video file to begin</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={handleSelectFile}>
              Choose Video
            </Button>
          </div>
        )}
      </div>
      
      {/* Screenshots Gallery */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <h3 className="text-sm font-medium">Screenshots</h3>
          <span className="text-xs text-muted-foreground">
            {screenshots.length} {screenshots.length === 1 ? 'image' : 'images'}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4">
          {screenshots.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pb-4">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className={`relative group rounded-md shadow-sm border overflow-hidden ${
                    screenshot.used ? 'ring-2 ring-primary' : ''
                  } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, screenshot)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="aspect-video relative">
                    <img
                      src={screenshot.url}
                      alt={`Screenshot at ${screenshot.timestamp}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-1">
                      <span className="text-xs text-white/0 group-hover:text-white/100 transition-colors bg-black/50 px-1 rounded">
                        {screenshot.timestamp}
                      </span>
                      <Button 
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteScreenshot(screenshot.id)}
                        disabled={screenshot.used}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {screenshot.used && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                      Used
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No screenshots yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 