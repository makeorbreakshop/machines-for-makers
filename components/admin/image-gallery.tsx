"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Check, Trash, Star, StarOff, AlertCircle, Image as ImageIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface ImageGalleryProps {
  images: string[];
  onImagesChange: (selectedImages: string[], primaryImage: string) => void;
}

export function ImageGallery({ images, onImagesChange }: ImageGalleryProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>(images);
  const [primaryImage, setPrimaryImage] = useState<string>(images[0] || '');
  
  if (!images || images.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Images Found</AlertTitle>
        <AlertDescription>
          No images were extracted from the product page.
        </AlertDescription>
      </Alert>
    );
  }
  
  const handleToggleImage = (image: string, checked: boolean) => {
    let newSelectedImages: string[];
    
    if (checked) {
      newSelectedImages = [...selectedImages, image];
    } else {
      newSelectedImages = selectedImages.filter(img => img !== image);
      
      // If removing the primary image, update primary
      if (image === primaryImage && newSelectedImages.length > 0) {
        setPrimaryImage(newSelectedImages[0]);
        onImagesChange(newSelectedImages, newSelectedImages[0]);
        return;
      }
    }
    
    setSelectedImages(newSelectedImages);
    onImagesChange(newSelectedImages, primaryImage);
  };
  
  const handleSetPrimary = (image: string) => {
    // Make sure the image is selected
    if (!selectedImages.includes(image)) {
      const newSelectedImages = [...selectedImages, image];
      setSelectedImages(newSelectedImages);
      setPrimaryImage(image);
      onImagesChange(newSelectedImages, image);
    } else {
      setPrimaryImage(image);
      onImagesChange(selectedImages, image);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Product Images
        </CardTitle>
        <CardDescription>
          Select images to include with this machine. The primary image will be displayed in lists and at the top of the product page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div key={index} className="space-y-2">
                <div className="relative overflow-hidden rounded-md border">
                  {primaryImage === image && (
                    <div className="absolute top-0 left-0 bg-yellow-500 text-white px-2 py-1 text-xs rounded-br-md">
                      Primary
                    </div>
                  )}
                  <img 
                    src={image} 
                    alt={`Product image ${index + 1}`} 
                    className="w-full h-40 object-contain"
                  />
                  <div className="absolute top-0 right-0 p-1">
                    <Checkbox 
                      checked={selectedImages.includes(image)}
                      onCheckedChange={(checked) => handleToggleImage(image, checked === true)}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button 
                    variant={primaryImage === image ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSetPrimary(image)}
                    className="text-xs"
                    disabled={primaryImage === image}
                  >
                    {primaryImage === image ? (
                      <Star className="h-3 w-3 mr-1 text-yellow-300" />
                    ) : (
                      <StarOff className="h-3 w-3 mr-1" />
                    )}
                    {primaryImage === image ? "Primary" : "Set Primary"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleToggleImage(image, false)}
                    className="text-xs text-red-500 hover:text-red-600"
                    disabled={!selectedImages.includes(image)}
                  >
                    <Trash className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedImages.length} of {images.length} images selected
        </div>
        <div className="text-sm text-muted-foreground">
          {primaryImage && (
            <span>Primary: Image {images.indexOf(primaryImage) + 1}</span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 