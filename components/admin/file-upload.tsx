"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Loader2 } from "lucide-react"

interface FileUploadProps {
  onUploadComplete: (url: string) => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
    } catch (error) {
      console.error("Error uploading file:", error)
    } finally {
      setIsUploading(false)
      // Reset the input
      e.target.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input type="file" onChange={handleFileChange} disabled={isUploading} className="flex-1" />
        {isUploading ? (
          <Button disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {uploadProgress}%
          </Button>
        ) : (
          <Button type="button" variant="secondary">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        )}
      </div>
      {isUploading && (
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
    </div>
  )
}

