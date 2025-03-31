"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Loader2, ImageIcon, FileIcon, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface FileUploadProps {
  onUploadComplete: (url: string) => void
}

interface OptimizationData {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: string;
  url: string;
  originalDimensions?: {
    width: number;
    height: number;
  };
  optimizedDimensions?: {
    width: number;
    height: number;
  };
  processing?: {
    resized: boolean;
    format: string;
  };
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])
  
  const allowedFileTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]

  const validateFile = (file: File): boolean => {
    if (!allowedFileTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.");
      return false;
    }
    
    // 10MB file size limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return false;
    }
    
    return true;
  }

  const handleFileUpload = async (file: File) => {
    if (!file || !validateFile(file)) return;

    // Create preview
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    setOriginalFile(file)
    
    setIsUploading(true)
    setUploadProgress(0)
    setOptimizationData(null)

    try {
      // Create form data
      const formData = new FormData()
      formData.append("file", file)

      // Simulate progress (since fetch doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 300)

      // Upload file
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Upload error details:", errorData);
        throw new Error(errorData.message || errorData.error || "Upload failed");
      }

      const data = await response.json()
      setUploadProgress(100)

      // Save optimization data
      if (data.originalSize && data.optimizedSize) {
        setOptimizationData(data)
        
        const optimizationMessage = data.processing?.resized
          ? `Resized and converted to WebP`
          : `Converted to WebP format`;
        
        toast.success(`Image upload successful`, {
          description: `${optimizationMessage}. Size reduced from ${formatBytes(data.originalSize)} to ${formatBytes(data.optimizedSize)} (${data.compressionRatio} smaller)`
        });
      } else {
        toast.success("Image uploaded successfully");
      }

      // Call the callback with the uploaded file URL
      onUploadComplete(data.url)
    } catch (error) {
      console.error("Error uploading file:", error)
      toast.error(error instanceof Error ? error.message : "Error uploading file. Please try again.");
    } finally {
      setIsUploading(false)
      // Reset the input
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }
  
  const handleButtonClick = () => {
    inputRef.current?.click()
  }

  const resetUpload = () => {
    setPreview(null)
    setOriginalFile(null)
    setOptimizationData(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-4">
      {/* Preview area */}
      {(preview || optimizationData) && (
        <div className="rounded-md border p-4 bg-slate-50">
          <div className="flex flex-col sm:flex-row gap-4">
            {preview && (
              <div className="relative min-w-32 max-w-48">
                <p className="text-xs font-medium mb-1 text-muted-foreground">Original</p>
                <div className="relative h-32 border rounded-md overflow-hidden bg-white">
                  <Image
                    src={preview}
                    alt="Original preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 192px"
                  />
                </div>
                {originalFile && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-muted-foreground">{formatBytes(originalFile.size)}</p>
                    {optimizationData?.originalDimensions && (
                      <p className="text-xs text-muted-foreground">
                        {optimizationData.originalDimensions.width} × {optimizationData.originalDimensions.height} px
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {optimizationData && (
              <div className="relative min-w-32 max-w-48">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Optimized</p>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                </div>
                <div className="relative h-32 border rounded-md overflow-hidden bg-white">
                  <Image
                    src={optimizationData.url}
                    alt="Optimized preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 192px"
                  />
                </div>
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(optimizationData.optimizedSize)} 
                    <span className="text-green-600 ml-1">
                      ({optimizationData.compressionRatio} smaller)
                    </span>
                  </p>
                  {optimizationData.optimizedDimensions && (
                    <p className="text-xs text-muted-foreground">
                      {optimizationData.optimizedDimensions.width} × {optimizationData.optimizedDimensions.height} px
                      {optimizationData.processing?.resized && (
                        <span className="text-amber-600 ml-1">(resized)</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Format: WebP</p>
                </div>
              </div>
            )}
          </div>
          
          {optimizationData && (
            <div className="mt-3 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetUpload}
                className="text-xs"
              >
                Upload another
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upload area - hide when optimization is complete */}
      {!optimizationData && (
        <div className="space-y-2">
          <div 
            className={`border-2 border-dashed rounded-md p-4 transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Drag and drop</span> your image here or{" "}
                <span 
                  className="cursor-pointer text-primary font-medium hover:underline"
                  onClick={handleButtonClick}
                >
                  click to browse
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Supports JPG, PNG, GIF, WebP (max 10MB)
              </div>
              
              <Input 
                ref={inputRef}
                type="file" 
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange} 
                disabled={isUploading} 
                className="hidden"
              />
              
              {isUploading && (
                <div className="w-full flex justify-center items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {uploadProgress < 50 ? "Uploading..." : "Optimizing..."} {uploadProgress}%
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {isUploading && (
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

