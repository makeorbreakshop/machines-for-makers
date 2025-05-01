"use client";

import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ImageDropzoneProps {
  onImageProcessed: (imageUrl: string, dimensions: { width: number; height: number }) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  currentImageUrl?: string | null;
  onImageRemove?: () => void;
}

export interface ImageDropzoneRef {
  openFileDialog: () => void;
}

// Convert the component to use forwardRef to expose imperative methods
const ImageDropzone = forwardRef<ImageDropzoneRef, ImageDropzoneProps>(({
  onImageProcessed,
  isProcessing,
  setIsProcessing,
  currentImageUrl,
  onImageRemove
}, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Expose the openFileDialog method via ref
  useImperativeHandle(ref, () => ({
    openFileDialog: () => {
      fileInputRef.current?.click();
    }
  }));

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    // Check if the file is an image
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Set processing state
    setIsProcessing(true);

    try {
      // Create a URL for the image
      const imageUrl = URL.createObjectURL(file);

      // Load the image to get dimensions
      const img = new window.Image();
      img.src = imageUrl;

      // Wait for the image to load to get dimensions
      await new Promise<void>((resolve) => {
        img.onload = () => {
          resolve();
        };
      });

      // Call the callback with the processed image
      onImageProcessed(imageUrl, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });

    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "Error",
        description: "Failed to process the image.",
        variant: "destructive",
      });
    } finally {
      // Clean up the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    if (onImageRemove) {
      onImageRemove();
    }
  };

  return (
    <div className="space-y-2 w-full">
      {currentImageUrl ? (
        <div className="relative rounded-md border bg-background">
          <div className="relative aspect-[4/3] rounded-md overflow-hidden">
            <Image
              src={currentImageUrl}
              alt="Uploaded image"
              fill
              className="object-contain"
            />
            <button
              type="button" 
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background shadow-sm z-10"
              aria-label="Remove image"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 transition-colors",
            "flex flex-col items-center justify-center cursor-pointer",
            "hover:border-primary/50 hover:bg-muted/50",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20",
            isProcessing ? "opacity-50 cursor-not-allowed" : ""
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <Upload
              className={cn(
                "h-10 w-10 mb-3",
                isDragging ? "text-primary" : "text-muted-foreground"
              )}
            />
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">
                {isProcessing ? "Processing..." : "Drag & drop an image or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileInputChange}
        disabled={isProcessing}
      />
    </div>
  );
});

ImageDropzone.displayName = "ImageDropzone";

export default ImageDropzone; 