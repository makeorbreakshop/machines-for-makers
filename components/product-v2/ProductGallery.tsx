"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductGalleryProps {
  images: string[]
  productName: string
  className?: string
}

export function ProductGallery({ images, productName, className }: ProductGalleryProps) {
  const [mainImageIndex, setMainImageIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalImageIndex, setModalImageIndex] = useState(0)
  
  // Deduplicate images
  const uniqueImagesSet = new Set(images.filter(Boolean));
  const validImages = Array.from(uniqueImagesSet);
  
  // Log the deduplication results
  console.log("ProductGallery images:", {
    original: images.length,
    deduplicated: validImages.length
  });
  
  // If no images, show a placeholder
  if (validImages.length === 0) {
    return (
      <div className={cn("rounded-lg overflow-hidden bg-gray-100", className)}>
        <div className="aspect-[16/10] flex items-center justify-center">
          <p className="text-gray-500">No image available</p>
        </div>
      </div>
    )
  }

  // For single image case, display full width image without thumbnails
  if (validImages.length === 1) {
    return (
      <div className={cn("overflow-hidden rounded-lg", className)}>
        <div 
          className="aspect-[16/10] relative cursor-pointer"
          onClick={() => {
            setModalImageIndex(0)
            setModalOpen(true)
          }}
        >
          <Image
            src={validImages[0]}
            alt={`${productName}`}
            fill
            priority
            className="object-contain"
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
        </div>
        
        {/* Full-screen image modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-6xl w-full h-[90vh] p-0 bg-gray-900 border-0 shadow-2xl rounded-lg">
            <DialogTitle className="sr-only">
              {productName} - Image
            </DialogTitle>
            
            {/* Close button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4 z-10 text-white hover:bg-white/10 rounded-full"
              onClick={() => setModalOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            {/* Current image */}
            <div className="relative h-full w-full flex items-center justify-center bg-black">
              <Image
                src={validImages[0]}
                alt={`${productName}`}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const openModal = (initialIndex: number) => {
    setModalImageIndex(initialIndex)
    setModalOpen(true)
  }
  
  const nextModalImage = () => {
    setModalImageIndex((prev) => 
      prev === validImages.length - 1 ? 0 : prev + 1
    )
  }
  
  const prevModalImage = () => {
    setModalImageIndex((prev) => 
      prev === 0 ? validImages.length - 1 : prev
    )
  }
  
  // Calculate how many thumbnails to show
  const thumbnailCount = Math.min(validImages.length > 3 ? 3 : validImages.length, 3)
  
  // For multiple images, use the grid layout
  return (
    <>
      <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3", className)}>
        {/* Main large image - 3 of 4 columns */}
        <div 
          className="md:col-span-3 overflow-hidden rounded-lg cursor-pointer relative"
          onClick={() => openModal(mainImageIndex)}
        >
          <div className="aspect-[16/10] relative">
            <Image
              src={validImages[mainImageIndex]}
              alt={`${productName} - Main Image`}
              fill
              priority
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
            />
          </div>
        </div>
        
        {/* Thumbnails column - matching height of main image */}
        <div className="md:col-span-1 hidden md:flex md:flex-col md:h-full" style={{ height: thumbnailCount > 0 ? 'auto' : '0' }}>
          {validImages.slice(0, thumbnailCount).map((imageUrl, index) => (
            <div 
              key={index}
              className={cn(
                "flex-1 mb-2 last:mb-0 overflow-hidden rounded-lg cursor-pointer border transition-all",
                index === mainImageIndex 
                  ? "border-primary shadow-sm" 
                  : "border-transparent hover:border-gray-300"
              )}
              onClick={() => setMainImageIndex(index)}
            >
              <div className="h-full relative">
                <Image
                  src={imageUrl}
                  alt={`${productName} - Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="15vw"
                />
              </div>
            </div>
          ))}
          
          {/* View Photos button - shown as the last item if we have more than 3 images */}
          {validImages.length > 3 && (
            <div 
              className="flex-1 overflow-hidden bg-gray-900 text-white cursor-pointer rounded-lg relative group transition-opacity hover:opacity-90"
              onClick={() => openModal(3)}
            >
              <div className="h-full relative flex items-center justify-center">
                <div className="absolute inset-0">
                  <Image
                    src={validImages[3] || validImages[0]}
                    alt={`${productName} - More Photos`}
                    fill
                    className="object-cover opacity-40 group-hover:opacity-30 transition-opacity"
                    sizes="15vw"
                  />
                </div>
                <div className="z-10 flex flex-col items-center gap-1 text-center">
                  <ExternalLink className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">View All Photos</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile thumbnails - horizontal row */}
        <div className="md:hidden grid grid-cols-4 gap-2">
          {validImages.slice(0, 3).map((imageUrl, index) => (
            <div 
              key={index}
              className={cn(
                "overflow-hidden rounded-lg cursor-pointer border transition-all",
                index === mainImageIndex 
                  ? "border-primary shadow-sm" 
                  : "border-transparent hover:border-gray-300"
              )}
              onClick={() => setMainImageIndex(index)}
            >
              <div className="aspect-square relative">
                <Image
                  src={imageUrl}
                  alt={`${productName} - Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </div>
            </div>
          ))}
          
          {/* View Photos button for mobile */}
          {validImages.length > 3 && (
            <div 
              className="overflow-hidden bg-gray-900 text-white cursor-pointer rounded-lg relative group transition-opacity hover:opacity-90"
              onClick={() => openModal(3)}
            >
              <div className="aspect-square relative flex items-center justify-center">
                <div className="absolute inset-0">
                  <Image
                    src={validImages[3] || validImages[0]}
                    alt={`${productName} - More Photos`}
                    fill
                    className="object-cover opacity-40 group-hover:opacity-30 transition-opacity"
                    sizes="25vw"
                  />
                </div>
                <div className="z-10 flex flex-col items-center gap-1 text-center">
                  <ExternalLink className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">View</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    
      {/* Full-screen image gallery modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0 bg-gray-900 border-0 shadow-2xl rounded-lg">
          {/* Hidden DialogTitle for accessibility */}
          <DialogTitle className="sr-only">
            {productName} - Image Gallery
          </DialogTitle>
          
          {/* Close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4 z-10 text-white hover:bg-white/10 rounded-full"
            onClick={() => setModalOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          
          {/* Image navigation */}
          {validImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 h-12 w-12 rounded-full"
                onClick={prevModalImage}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 h-12 w-12 rounded-full"
                onClick={nextModalImage}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}
          
          {/* Current image */}
          <div className="relative h-full w-full flex items-center justify-center bg-black">
            <Image
              src={validImages[modalImageIndex]}
              alt={`${productName} - Gallery Image ${modalImageIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
          
          {/* Image counter */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/75 text-white text-sm px-4 py-1.5 rounded-full">
            {modalImageIndex + 1} / {validImages.length}
          </div>
          
          {/* Thumbnails carousel */}
          {validImages.length > 1 && (
            <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto py-3">
              {validImages.map((image, index) => (
                <div 
                  key={index}
                  className={cn(
                    "w-16 h-16 relative rounded-md overflow-hidden cursor-pointer border-2 transition-all",
                    index === modalImageIndex ? "border-white scale-110" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                  onClick={() => setModalImageIndex(index)}
                >
                  <Image
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 