"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { Plus, Check, Star } from "lucide-react"
import { useComparison } from "@/context/comparison-context"
import type { Machine } from "@/lib/database-types"

interface ProductsGridProps {
  products: Machine[]
  totalProducts: number
  onLoadMore?: () => void
  hasMoreProducts?: boolean
}

export default function ProductsGrid({
  products,
  totalProducts,
  onLoadMore,
  hasMoreProducts = false,
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product) => {
          // Format price with commas
          const formattedPrice = product["Price"] ? `$${product["Price"].toLocaleString()}` : "N/A"
          const selected = isSelected(product.id)

          return (
            <Card key={product.id} className="overflow-hidden">
              <div className="relative">
                {product["Award"] && (
                  <div className="absolute top-2 left-2 z-10">
                    <div className="bg-primary text-primary-foreground px-2 py-1 text-xs font-medium rounded-md">
                      {product["Award"]}
                    </div>
                  </div>
                )}

                {product["Rating"] && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="flex items-center bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-1" />
                      <span className="text-xs font-medium">{product["Rating"]}</span>
                    </div>
                  </div>
                )}

                {/* Compare button overlay */}
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    size="sm"
                    className={`${selected ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-gray-100'} rounded-md shadow-md text-xs font-medium h-8 flex items-center`}
                    onClick={() => selected ? removeFromComparison(product.id) : addToComparison(product)}
                  >
                    {selected ? <Check className="h-3.5 w-3.5 mr-1" /> : null}
                    {selected ? 'Compare' : 'Compare'}
                  </Button>
                </div>

                <Link href={`/products/${product["Internal link"]}`} className="block h-[180px] relative">
                  <Image
                    src={product["Image"] || "/placeholder.svg?height=200&width=200"}
                    alt={product["Machine Name"]}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </Link>
              </div>

              <CardContent className="p-4 pt-4">
                <Link href={`/products/${product["Internal link"]}`} className="block">
                  <h3 className="font-bold text-lg hover:text-primary line-clamp-2">{product["Machine Name"]}</h3>
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
                      <div className="mt-1 text-sm text-muted-foreground">{product["Work Area"]} work area</div>
                    )}
                  </div>
                </div>

                <div className="mt-3 font-bold text-xl">{formattedPrice}</div>
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

