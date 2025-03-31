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
          
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={resetUpload}
              disabled={isUploading}
            >
              Reset
            </Button>
          </div>
        </div>
      )}
      
      {/* Upload Area */}
      {!preview && !optimizationData && (
        <div 
          className={`
            border-2 border-dashed rounded-md p-10 
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'} 
            transition-colors duration-200 ease-in-out
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Drag a file here, or click to browse</p>
              <p className="text-xs mt-1 text-muted-foreground">JPG, PNG, GIF or WebP (max 10MB)</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleButtonClick}
              className="mt-2"
              disabled={isUploading}
            >
              Select file
            </Button>
            <Input 
              ref={inputRef}
              type="file" 
              className="hidden" 
              accept={allowedFileTypes.join(',')}
              onChange={handleFileChange} 
              disabled={isUploading}
            />
          </div>
        </div>
      )}
      
      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-in-out" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}