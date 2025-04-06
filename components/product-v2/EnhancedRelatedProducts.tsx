"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

interface MachineData {
  id: string
  machine_name: string
  slug: string
  company?: string
  image_url?: string
  laser_type_a?: string
  laser_power_a?: string
  price?: number
  rating?: number
  award?: string
  excerpt_short?: string
  [key: string]: any
}

interface EnhancedRelatedProductsProps {
  products: MachineData[]
  currentProductId: string
  className?: string
}

export function EnhancedRelatedProducts({
  products,
  currentProductId,
  className
}: EnhancedRelatedProductsProps) {
  // Filter out the current product
  const filteredProducts = products
    .filter(product => product.id !== currentProductId)
    .slice(0, 6)

  if (filteredProducts.length === 0) {
    return null
  }

  const featuredProduct = filteredProducts.find(p => p.award) || filteredProducts[0]
  const otherProducts = filteredProducts
    .filter(p => p.id !== featuredProduct.id)
    .slice(0, 5)

  return (
    <section className={cn("py-8", className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Featured Product - Takes up 2 columns on desktop */}
        <Card className="col-span-1 md:col-span-2 overflow-hidden">
          <div className="md:flex h-full">
            <div className="md:w-1/2 relative bg-gray-50">
              <Link href={`/products/${featuredProduct.slug}`} className="block h-full">
                <div className="relative aspect-[4/3] md:aspect-auto md:h-full">
                  <Image
                    src={featuredProduct.image_url || "/placeholder.svg"}
                    alt={featuredProduct.machine_name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </Link>
              
              {featuredProduct.award && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge className="bg-primary text-white">{featuredProduct.award}</Badge>
                </div>
              )}
            </div>
            <CardContent className="p-6 md:w-1/2 flex flex-col">
              <div className="flex-1">
                <Link href={`/products/${featuredProduct.slug}`}>
                  <h3 className="text-xl font-bold text-gray-900 hover:text-primary transition-colors mb-2">
                    {featuredProduct.machine_name}
                  </h3>
                </Link>
                <div className="text-sm text-muted-foreground mb-3">
                  {featuredProduct.laser_power_a && `${featuredProduct.laser_power_a}W`} {featuredProduct.laser_type_a}
                </div>
                <p className="text-gray-700 line-clamp-3 mb-4">
                  {featuredProduct.excerpt_short}
                </p>
              </div>
              <div className="mt-auto flex items-baseline justify-between">
                <div className="font-bold text-lg">
                  {featuredProduct.price ? `$${featuredProduct.price.toLocaleString()}` : "Price N/A"}
                </div>
                <Link href={`/products/${featuredProduct.slug}`} className="text-primary flex items-center hover:underline">
                  <span className="mr-1">View details</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </div>
        </Card>
        
        {/* Grid of additional products */}
        <div className="col-span-1 space-y-4">
          {otherProducts.slice(0, 3).map(product => (
            <Card key={product.id} className="overflow-hidden">
              <div className="flex h-full">
                <div className="w-1/3 relative bg-gray-50">
                  <Link href={`/products/${product.slug}`} className="block h-full">
                    <div className="relative aspect-square h-full">
                      <Image
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.machine_name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 33vw, 10vw"
                      />
                    </div>
                  </Link>
                  
                  {product.award && (
                    <div className="absolute top-1 left-1 z-10">
                      <Badge className="bg-primary text-white text-xs py-0">{product.award}</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3 w-2/3">
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2 mb-1">
                      {product.machine_name}
                    </h3>
                  </Link>
                  <div className="text-xs text-muted-foreground mb-2">
                    {product.laser_power_a && `${product.laser_power_a}W`} {product.laser_type_a}
                  </div>
                  <div className="font-bold">
                    {product.price ? `$${product.price.toLocaleString()}` : "N/A"}
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
} 