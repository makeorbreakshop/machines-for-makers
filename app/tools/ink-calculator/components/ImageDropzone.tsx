"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from "../config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  onImageProcessed: (
    imageUrl: string,
    dimensions: { width: number; height: number }
  ) => Promise<void>;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

export default function ImageDropzone({
  onImageProcessed,
  isProcessing,
  setIsProcessing,
}: ImageDropzoneProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      const file = acceptedFiles[0];
      
      // Validation
      if (!file) return;
      
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        setError("Only JPEG and PNG files are accepted");
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        setError("File size cannot exceed 20MB");
        return;
      }
      
      try {
        // Create an object URL for the image
        const objectUrl = URL.createObjectURL(file);
        setImageUrl(objectUrl);
        
        // Load the image to get dimensions
        const img = new Image();
        img.onload = async () => {
          const dimensions = {
            width: img.width,
            height: img.height
          };
          
          // Call the parent handler with the URL and dimensions
          // The parent component will handle the analysis
          await onImageProcessed(objectUrl, dimensions);
        };
        img.onerror = () => {
          setError("Failed to load image");
          URL.revokeObjectURL(objectUrl);
          setImageUrl(null);
        };
        img.src = objectUrl;
      } catch (err) {
        setError("Failed to process image");
        console.error(err);
      }
    },
    [onImageProcessed]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const clearImage = () => {
    setImageUrl(null);
    // Create a placeholder URL revocation if needed
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  };

  return (
    <div>
      {!imageUrl ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:bg-muted/30",
            isDragActive 
              ? "border-primary/70 bg-primary/5 scale-[1.02]" 
              : "border-border",
            isProcessing ? "pointer-events-none" : ""
          )}
        >
          <input {...getInputProps()} />
          {isProcessing ? (
            <div className="flex flex-col items-center py-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-center font-medium text-foreground">
                Analyzing image...
              </p>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Calculating ink coverage for accurate estimates
              </p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload
                  className={cn(
                    "h-8 w-8 transition-all duration-300",
                    isDragActive ? "text-primary scale-110" : "text-primary/70"
                  )}
                />
              </div>
              <p className="text-center font-medium text-foreground">
                {isDragActive
                  ? "Drop to analyze image"
                  : "Drag & drop an image, or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Upload artwork to analyze ink coverage & calculate costs
              </p>
              {error && (
                <p className="text-sm text-destructive mt-3 text-center font-medium bg-destructive/10 px-3 py-1.5 rounded-md">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden relative border shadow-sm rounded-lg">
          <div className="relative aspect-[16/9] bg-muted/10">
            <img
              src={imageUrl}
              alt="Uploaded print artwork"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/90 hover:bg-background shadow-sm"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove image</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
} 