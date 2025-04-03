"use client"

import { useState } from "react"
import Image from "next/image"
import { Star, ChevronRight, ChevronLeft, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import RatingMeter from "@/components/rating-meter"
import Link from "next/link"

interface ProductHeroProps {
  product: any
  images: any[]
  highlights: string[]
}

export function ProductHero({ product, images, highlights }: ProductHeroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const allImages = [
    product.image_url,
    ...(images?.map(img => img.url) || [])
  ].filter(Boolean)

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === allImages.length - 1 ? 0 : prevIndex + 1
    )
  }

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? allImages.length - 1 : prevIndex - 1
    )
  }

  return (
    <section className="py-6 md:py-12 bg-white">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product image carousel */}
          <div className="relative rounded-xl overflow-hidden bg-gray-50">
            <div className="aspect-[4/3] relative">
              {allImages.length > 0 ? (
                <Image
                  src={allImages[currentImageIndex] || "/placeholder.svg"}
                  alt={product.machine_name}
                  fill
                  priority
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">No image available</p>
                </div>
              )}
            </div>
            
            {allImages.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-gray-700 hover:bg-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-gray-700 hover:bg-white"
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                  {allImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2.5 h-2.5 rounded-full ${
                        index === currentImageIndex ? "bg-primary" : "bg-gray-300"
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col">
            <div className="mb-6">
              {product.award && (
                <Badge className="mb-3 text-sm py-1 px-3 bg-primary text-white">
                  {product.award}
                </Badge>
              )}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
                {product.machine_name}
              </h1>
              <div className="flex items-center mb-4">
                <div className="flex items-center mr-3">
                  <span className="font-bold text-2xl mr-1">{product.rating}</span>
                  <span className="text-sm font-medium text-gray-500">/ 10</span>
                </div>
                <RatingMeter rating={product.rating} size="md" className="mr-2" />
                {product.rating_count && (
                  <span className="text-sm text-gray-500">
                    ({product.rating_count} reviews)
                  </span>
                )}
              </div>
              <p className="text-xl text-gray-600 mb-6 max-w-2xl">
                {product.excerpt_short}
              </p>
            </div>

            {/* Key specs summary */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-lg mb-3">Key Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {product.laser_type_a && (
                  <div>
                    <p className="text-sm text-gray-500">Laser Type</p>
                    <p className="font-medium">{product.laser_type_a}</p>
                  </div>
                )}
                {product.laser_power_a && (
                  <div>
                    <p className="text-sm text-gray-500">Power</p>
                    <p className="font-medium">{product.laser_power_a}W</p>
                  </div>
                )}
                {product.work_area && (
                  <div>
                    <p className="text-sm text-gray-500">Work Area</p>
                    <p className="font-medium">{product.work_area}</p>
                  </div>
                )}
                {product.speed && (
                  <div>
                    <p className="text-sm text-gray-500">Speed</p>
                    <p className="font-medium">{product.speed}</p>
                  </div>
                )}
                {product.software && (
                  <div>
                    <p className="text-sm text-gray-500">Software</p>
                    <p className="font-medium">{product.software}</p>
                  </div>
                )}
                {product.connectivity && (
                  <div>
                    <p className="text-sm text-gray-500">Connectivity</p>
                    <p className="font-medium">{product.connectivity}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Price and buy section */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">
                    {product.price ? `$${product.price.toLocaleString()}` : "Price N/A"}
                  </span>
                  {product.msrp && product.msrp > product.price && (
                    <span className="ml-2 text-sm line-through text-gray-500">
                      ${product.msrp.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              {product.buy_link && (
                <div className="flex-1 sm:text-right">
                  <a 
                    href={product.buy_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-11 px-6 font-medium tracking-wide text-white transition-colors duration-200 rounded-md bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Check Price & Buy
                  </a>
                </div>
              )}
            </div>
            
            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="mt-2">
                <h3 className="font-bold text-lg mb-3">What We Like</h3>
                <ul className="space-y-2">
                  {highlights.slice(0, 4).map((highlight, index) => (
                    <li key={index} className="flex items-start">
                      <div className="bg-green-100 rounded-full p-1 mr-3 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
} 