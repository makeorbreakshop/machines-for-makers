"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Loader2, ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface FileUploadProps {
  onUploadComplete: (url: string) => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
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

    setIsUploading(true)
    setUploadProgress(0)

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
        throw new Error("Upload failed")
      }

      const data = await response.json()
      setUploadProgress(100)

      // Call the callback with the uploaded file URL
      onUploadComplete(data.url)
      
      // Show success message with optimization details
      if (data.originalSize && data.optimizedSize) {
        toast.success(`Image uploaded and optimized`, {
          description: `Reduced from ${formatBytes(data.originalSize)} to ${formatBytes(data.optimizedSize)} (${data.compressionRatio} smaller)`
        });
      } else {
        toast.success("Image uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast.error("Error uploading file. Please try again.");
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

  return (
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
                Optimizing & uploading... {uploadProgress}%
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
  )
}

