"use client"

import { useState } from "react"
import { ShoppingCart, Image as ImageIcon, PlusCircle, Star, ArrowRight, ExternalLink, ChevronLeft, ChevronRight, X, Check, Copy, InfoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PromoCodeDisplay } from "@/types/promo-codes"
import AddToCompareButton from "@/components/add-to-compare-button"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { PriceHistoryChart } from "@/components/product/price-history-chart"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PriceTooltip } from "@/components/product/price-tooltip"

interface ProductHeroProps {
  product: any
  images: any[]
  highlights: string[]
  promoCode?: PromoCodeDisplay | null
}

export function ProductHero({ product, images, highlights, promoCode }: ProductHeroProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // Handle copy to clipboard
  const handleCopyCode = async () => {
    if (promoCode?.code) {
      try {
        await navigator.clipboard.writeText(promoCode.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  // Create array of image URLs for the gallery
  // First collect all image URLs
  const imageUrls = new Set<string>();
  
  // Add primary image if it exists
  if (product.image_url) {
    imageUrls.add(product.image_url);
  }
  
  // Add additional images from the images array
  if (images && images.length > 0) {
    images.forEach(img => {
      if (img.url) {
        imageUrls.add(img.url);
      }
    });
  }
  
  // Convert to array and filter out any null/undefined/empty values
  const allImages = Array.from(imageUrls).filter(Boolean);
  
  console.log("Product page images:", { 
    primaryImage: product.image_url,
    additionalImages: images?.map(img => img.url),
    deduplicated: allImages
  });

  // Format price with commas
  const formattedPrice = product.price 
    ? `$${product.price.toLocaleString()}` 
    : "N/A"
  
  // Display price range if applicable
  const priceRangeDisplay = product.msrp && product.msrp !== product.price
    ? `${formattedPrice}–$${product.msrp.toLocaleString()}`
    : formattedPrice

  // Handle clicking an image
  const handleImageClick = (image: string) => {
    setSelectedImage(image);
  }
  
  // Open gallery modal
  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  }

  return (
    <section className="relative">
      {/* Top gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white h-[400px] z-0" />
      
      <div className="container relative px-4 mx-auto max-w-7xl pt-10 pb-16 z-10">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ArrowRight className="h-3 w-3 mx-2" />
          <Link href="/category/laser-cutters" className="hover:text-primary">Laser Cutters</Link>
          <ArrowRight className="h-3 w-3 mx-2" />
          <span className="text-slate-700 font-medium truncate">{product.machine_name}</span>
        </div>
        
        {/* Mobile product title - shown only on mobile */}
        <div className="lg:hidden mb-6">
          {/* Award badge if available */}
          {product.award && (
            <div className="mb-3">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 uppercase tracking-wide text-xs font-semibold">
                {product.award}
              </Badge>
            </div>
          )}
          
          {/* Product title */}
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {product.machine_name}
          </h1>
          
          {/* Short excerpt if available */}
          {product.excerpt_short && (
            <p className="text-slate-600 mb-3 leading-relaxed">{product.excerpt_short}</p>
          )}
          
          {/* Mobile price display */}
          <div className="flex items-center gap-3 mb-3">
            <div className="text-2xl font-bold text-slate-900">{priceRangeDisplay}</div>
            {product.rating && (
              <div className="flex items-center">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={cn(
                        "h-4 w-4",
                        i < Math.round(product.rating/2) ? "text-amber-400 fill-amber-400" : "text-slate-300"
                      )} 
                    />
                  ))}
                </div>
                <span className="ml-1 text-xs font-medium text-slate-600">{product.rating}/10</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Two-column layout for product details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Left column - Image Gallery */}
          <div>
            {/* Main product image */}
            {allImages.length > 0 && (
              <div 
                className={`relative overflow-hidden rounded-xl border border-slate-200 mb-3 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 ${allImages.length === 1 ? 'aspect-[4/3]' : 'aspect-[16/11]'}`}
                onClick={() => openGallery(allImages.indexOf(selectedImage || allImages[0]))}
              >
                <Image
                  src={selectedImage || allImages[0]}
                  alt={product.machine_name}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                
                {/* Zoom indicator */}
                <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm">
                  <PlusCircle className="h-5 w-5 text-slate-500" />
                </div>
              </div>
            )}
            
            {/* Thumbnail gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {allImages.slice(0, 4).map((image, index) => (
                  <div 
                    key={index} 
                    className={`relative aspect-square overflow-hidden rounded-lg cursor-pointer bg-white
                      ${(selectedImage || allImages[0]) === image 
                        ? 'ring-2 ring-primary ring-offset-1' 
                        : 'border border-slate-200 hover:border-primary/50 transition-colors'}`}
                    onClick={() => handleImageClick(image)}
                  >
                    <Image
                      src={image}
                      alt={`${product.machine_name} view ${index + 1}`}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 1024px) 20vw, 10vw"
                    />
                  </div>
                ))}
                
                {/* Show "more images" thumbnail if we have more than 4 */}
                {allImages.length > 4 && (
                  <div 
                    className="relative aspect-square overflow-hidden rounded-lg cursor-pointer bg-slate-50 flex items-center justify-center border border-slate-200 hover:border-primary/50 transition-colors"
                    onClick={() => openGallery(4)}
                  >
                    <div className="text-center">
                      <ImageIcon className="h-5 w-5 mx-auto text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">+{allImages.length - 4}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right column - Title, specs and purchase options */}
          <div className="flex flex-col">
            {/* Award badge if available - only on desktop */}
            <div className="hidden lg:block">
              {product.award && (
                <div className="mb-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 uppercase tracking-wide text-xs font-semibold">
                    {product.award}
                  </Badge>
                </div>
              )}
              
              {/* Product title - only on desktop */}
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                {product.machine_name}
              </h1>
              
              {/* Short excerpt if available - only on desktop */}
              {product.excerpt_short && (
                <p className="text-slate-600 mb-6 leading-relaxed">{product.excerpt_short}</p>
              )}
              
              {/* Rating if available - only on desktop */}
              {product.rating && (
                <div className="flex items-center mb-6">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-5 w-5 ${i < Math.round(product.rating/2) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} 
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm font-medium text-slate-600">{product.rating}/10</span>
                </div>
              )}
            </div>
            
            {/* Price section with promo code */}
            <div className="mb-6">
              {/* Price and promo code display */}
              <div className="flex items-center gap-3 mb-6">
                <div className="hidden lg:block text-3xl font-bold text-slate-900">
                  {priceRangeDisplay}
                  {product.price && (
                    <PriceTooltip 
                      machineId={product.id}
                      price={product.price}
                      className="ml-2"
                    />
                  )}
                </div>
                {promoCode && promoCode.isActive && (
                  <div className="bg-[#E7F6EC] text-[#027A48] px-3 py-1.5 rounded-lg flex items-center gap-2 font-mono text-sm">
                    <span>{promoCode.code} ({promoCode.discountText})</span>
                    <button
                      onClick={handleCopyCode}
                      className="text-[#027A48] hover:text-[#027A48]/80 transition-colors flex items-center gap-1"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>Copy</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Buy now button */}
              <Button 
                asChild
                className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-medium shadow-sm"
              >
                <a 
                  href={promoCode?.affiliateLink || product.affiliate_link || product.buy_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Buy Now
                  <ExternalLink className="ml-2 h-4 w-4 opacity-70" />
                </a>
              </Button>

              {/* Price history chart for mobile - show as a dialog */}
              {product.price && (
                <div className="mt-3 lg:hidden flex items-center justify-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <InfoIcon className="h-3 w-3 mr-1" />
                        View Price History
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Price History</DialogTitle>
                      </DialogHeader>
                      <div className="pt-2">
                        <p className="text-sm text-muted-foreground mb-4">Track price changes over time</p>
                        <PriceHistoryChart 
                          machineId={product.id} 
                          currentPrice={product.price}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* Add to Compare button */}
              <div className="mt-3 flex justify-center">
                <AddToCompareButton 
                  product={product}
                />
              </div>
            </div>
            
            {/* Key specifications in a grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Key Specifications</h3>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-200">
                <div className="p-4">
                  <div className="text-sm font-medium text-slate-500">Laser Type</div>
                  <div className="font-medium text-slate-900">{product.laser_type_a || "N/A"}</div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium text-slate-500">Power</div>
                  <div className="font-medium text-slate-900">{product.laser_power_a ? `${product.laser_power_a}W` : "N/A"}</div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium text-slate-500">Work Area</div>
                  <div className="font-medium text-slate-900">{product.work_area ? product.work_area : "N/A"}</div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium text-slate-500">Speed</div>
                  <div className="font-medium text-slate-900">{product.max_speed ? `${product.max_speed} mm/s` : "N/A"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Image Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <div className="relative h-[80vh] w-full">
            {allImages[galleryIndex] && (
              <Image
                src={allImages[galleryIndex]}
                alt={`${product.machine_name} large view`}
                fill
                className="object-contain"
              />
            )}
            
            {/* Navigation controls */}
            <div className="absolute inset-0 flex justify-between items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={() => setGalleryIndex((galleryIndex - 1 + allImages.length) % allImages.length)}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={() => setGalleryIndex((galleryIndex + 1) % allImages.length)}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </div>
            
            {/* Close button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => setGalleryOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {galleryIndex + 1} / {allImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
} 