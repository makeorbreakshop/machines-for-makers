"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { Plus, Check, Star } from "lucide-react"
import { useComparison } from "@/context/comparison-context"
import type { Machine } from "@/lib/database-types"
import RatingMeter from "./rating-meter"
import { PriceDropBadge } from "@/components/price-drops/price-drop-badge"
import type { PriceDropInfo } from "@/lib/services/price-drop-service"

interface ProductsGridProps {
  products: Machine[]
  totalProducts: number
  onLoadMore?: () => void
  hasMoreProducts?: boolean
  priceDrops?: Map<string, PriceDropInfo>
}

export default function ProductsGrid({
  products,
  totalProducts,
  onLoadMore,
  hasMoreProducts = false,
  priceDrops
}: ProductsGridProps) {
  const { addToComparison, removeFromComparison, isSelected } = useComparison()

  // Don't render anything if there are no products
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold mb-2">No products found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
        {products.map((product) => {
          // Round up to nearest dollar and format price with commas
          const formattedPrice = product["Price"] ? `$${Math.ceil(product["Price"]).toLocaleString()}` : "N/A"
          const selected = isSelected(product.id)

          return (
            <Card key={product.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-gray-950 rounded-lg h-full flex flex-col">
              <div className="relative">
                {product["Award"] && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-amber-500 hover:bg-amber-600">
                      {product["Award"]}
                    </Badge>
                  </div>
                )}

                {priceDrops?.has(product.id) && (
                  <div className="absolute top-2 left-2 z-10" style={{ marginTop: product["Award"] ? '32px' : '0' }}>
                    <PriceDropBadge 
                      percentageChange={priceDrops.get(product.id)!.percentageChange}
                      isAllTimeLow={priceDrops.get(product.id)!.isAllTimeLow}
                      size="sm"
                    />
                  </div>
                )}

                {product["Rating"] && (
                  <div className="absolute top-2 right-2 z-10">
                    <RatingMeter 
                      rating={product["Rating"]} 
                      size="sm" 
                      showLabel={false}
                      className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm"
                    />
                  </div>
                )}

                <Link href={`/products/${product["Internal link"]}`} className="block h-[180px] relative">
                  <div className="absolute inset-0 bg-gray-100 animate-pulse opacity-20"></div>
                  <Image
                    src={product["Image"] || "/placeholder.svg?height=200&width=200"}
                    alt={product["Machine Name"] || `Product ${product.id || "image"}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw"
                    loading="lazy"
                    quality={75}
                    priority={false}
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YxZjFmMSIvPjwvc3ZnPg=="
                  />
                </Link>
              </div>

              <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
                <Link href={`/products/${product["Internal link"]}`} className="block">
                  <h3 className="font-bold text-base sm:text-lg hover:text-primary line-clamp-2">{product["Machine Name"]}</h3>
                </Link>

                <div className="mt-1 flex items-start">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">
                      {product["Laser Type A"] && (
                        <span className="inline-block mr-2">
                          {product["Laser Power A"] && `${product["Laser Power A"]}W`} {product["Laser Type A"]}
                        </span>
                      )}

                      {product["Laser Type B"] && (
                        <span className="inline-block">
                          {product["LaserPower B"] && `${product["LaserPower B"]}W`} {product["Laser Type B"]}
                        </span>
                      )}
                    </div>

                    {product["Work Area"] && (
                      <div className="mt-1 text-sm text-muted-foreground">{product["Work Area"]}</div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-3 flex justify-between items-center space-x-4">
                  <div className="font-bold text-xl">{formattedPrice}</div>
                  <Button
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    className="h-8 px-3"
                    onClick={(e) => {
                      e.preventDefault();
                      selected ? removeFromComparison(product.id) : addToComparison(product);
                    }}
                  >
                    {selected ? <Check className="h-3.5 w-3.5 mr-1.5" /> : null}
                    {selected ? 'Added' : 'Compare'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {hasMoreProducts && onLoadMore && (
        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={onLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

