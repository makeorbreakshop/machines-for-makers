"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Image from "next/image"

export default function LogoUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch current logo on component mount
  const fetchCurrentLogo = async () => {
    try {
      const response = await fetch("/api/logo")
      if (response.ok) {
        const data = await response.json()
        if (data && data.url) {
          setCurrentLogo(data.url)
        }
      } else {
        const errorData = await response.json()
        console.error("Error fetching logo:", errorData)
      }
    } catch (err) {
      console.error("Error fetching logo:", err)
    }
  }

  useEffect(() => {
    fetchCurrentLogo()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear any previous errors
    setError(null)
    
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Check file type
    if (!selectedFile.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Check file size (2MB limit)
    if (selectedFile.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const objectUrl = URL.createObjectURL(selectedFile)
    setPreview(objectUrl)
    setFile(selectedFile)

    // Clean up the preview URL when component unmounts
    return () => URL.revokeObjectURL(objectUrl)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      console.log("Uploading file:", file.name, file.type, file.size)

      const response = await fetch("/api/logo/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error("Upload response error:", data)
        setError(data.error || "Failed to upload logo. Please try again.")
        throw new Error(data.error || "Upload failed")
      }

      // Handle warning but successful upload
      if (data.warning) {
        toast({
          title: "Logo uploaded with warning",
          description: data.warning,
          variant: "default",
        })
      }

      if (data.url) {
        setCurrentLogo(data.url)
        setPreview(null)
        setFile(null)

        toast({
          title: "Logo uploaded",
          description: "Your new logo has been uploaded successfully",
        })
      } else {
        throw new Error("No URL returned from upload")
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      setError(error.message || "There was an error uploading your logo")
      
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your logo",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Logo Uploader</CardTitle>
        <CardDescription>Upload a new logo for your site</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {currentLogo && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Current Logo:</p>
              <div className="relative h-24 w-full bg-muted/20 rounded flex items-center justify-center">
                <Image
                  src={currentLogo}
                  alt="Current logo"
                  width={150}
                  height={80}
                  className="object-contain"
                  quality={90}
                  sizes="(max-width: 768px) 100px, 150px"
                />
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-2">Select a new logo:</p>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">Max file size: 2MB</p>
          </div>

          {preview && (
            <div>
              <p className="text-sm font-medium mb-2">Preview:</p>
              <div className="relative h-24 w-full bg-muted/20 rounded flex items-center justify-center">
                <Image
                  src={preview}
                  alt="Logo preview"
                  width={150}
                  height={80}
                  className="object-contain"
                  quality={90}
                  sizes="(max-width: 768px) 100px, 150px"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? "Uploading..." : "Upload Logo"}
        </Button>
      </CardFooter>
    </Card>
  )
} 