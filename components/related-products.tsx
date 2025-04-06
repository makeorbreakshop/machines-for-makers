import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

// Interface for the transformed machine data
interface TransformedMachine {
  id: string
  machine_name: string
  slug: string
  company?: string
  image_url?: string
  laser_type_a?: string
  laser_power_a?: string
  laser_category?: string
  price?: number
  award?: string
  [key: string]: any
}

interface RelatedProductsProps {
  products: TransformedMachine[]
  currentProductId: string
  showHeading?: boolean
}

export default function RelatedProducts({ 
  products, 
  currentProductId,
  showHeading = false 
}: RelatedProductsProps) {
  // Log the original products to see if any have awards
  console.log('Original products with awards?', 
    products.map(p => ({
      name: p.machine_name,
      award: p.award
    }))
  );

  // Filter out the current product
  const filteredProducts = products.filter((product) => product.id !== currentProductId)
  
  // Sort products so that products with award come first
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // If a has an award and b doesn't, a comes first
    if (a.award && !b.award) return -1;
    // If b has an award and a doesn't, b comes first
    if (!a.award && b.award) return 1;
    // If both have awards, sort by similarity score if available, otherwise keep original order
    if (a.award && b.award) {
      if (a.similarityScore && b.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }
      return 0;
    }
    // If neither has an award, sort by similarity score if available
    if (a.similarityScore && b.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    return 0;
  });
  
  // Log the sorted products to see the new order
  console.log('Sorted products by award and similarity:', 
    sortedProducts.map(p => ({
      name: p.machine_name,
      award: p.award,
      similarityScore: p.similarityScore
    }))
  );
  
  // Show all related products, no limit on desktop
  const relatedProducts = sortedProducts;

  console.log('RelatedProducts component received:', {
    totalProducts: products.length,
    filteredProducts: relatedProducts.length,
    currentProductId,
    products: products.map(p => ({
      id: p.id,
      name: p.machine_name,
      category: p.laser_category,
      award: p.award
    }))
  });

  // Add logs to show how many products will display on each device
  console.log('Products displayed:', {
    mobile: Math.min(relatedProducts.length, 3),
    desktop: Math.min(relatedProducts.length, 6)
  });

  if (relatedProducts.length === 0) {
    console.log('No related products to display');
    return null;
  }

  return (
    <div className="mt-4 md:mt-6">
      {showHeading && <h2 className="text-2xl font-bold mb-6">Related Products</h2>}
      
      {/* Mobile: horizontal card layout for better space utilization */}
      <div className="md:hidden space-y-3">
        {relatedProducts.slice(0, 3).map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="flex">
              <div className="relative w-[120px] flex-shrink-0">
                <Link href={`/products/${product.slug}`} className="block h-full">
                  <div className="h-full relative bg-gray-50 flex items-center justify-center">
                    <Image
                      src={product.image_url || "/placeholder.svg?height=100&width=100"}
                      alt={product.machine_name || `Related product ${product.id || "image"}`}
                      fill
                      className="object-contain p-2"
                      sizes="120px"
                    />
                  </div>
                </Link>
                
                {product.award && (
                  <div className="absolute top-1 left-1 z-10">
                    <Badge className="bg-primary text-xs py-0">{product.award}</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3 flex-1">
                <Link href={`/products/${product.slug}`}>
                  <h3 className="font-bold text-base leading-tight hover:text-primary">{product.machine_name}</h3>
                </Link>
                <div className="text-xs text-muted-foreground mt-1">
                  {product.laser_power_a && `${product.laser_power_a}W`} {product.laser_type_a}
                </div>
                <div className="mt-2 font-bold">{product.price ? `$${product.price.toLocaleString()}` : "Price N/A"}</div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Desktop: horizontal scrolling grid with limit of 6 products, centered */}
      <div className="hidden md:block">
        <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent mx-auto">
          <div className="inline-flex min-w-full justify-center">
            <div className="grid grid-flow-col auto-cols-max gap-6">
              {relatedProducts.slice(0, 6).map((product) => (
                <Card key={product.id} className="overflow-hidden w-[280px]">
                  <div className="relative">
                    <Link href={`/products/${product.slug}`}>
                      <div className="h-[200px] relative bg-gray-50 flex items-center justify-center p-4">
                        <Image
                          src={product.image_url || "/placeholder.svg?height=150&width=150"}
                          alt={product.machine_name || `Related product ${product.id || "image"}`}
                          fill
                          className="object-contain p-3"
                          sizes="280px"
                        />
                      </div>
                    </Link>
                    
                    {product.award && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge className="bg-primary">{product.award}</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-bold text-base mb-1 hover:text-primary">{product.machine_name}</h3>
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {product.laser_power_a && `${product.laser_power_a}W`} {product.laser_type_a}
                    </div>
                    <div className="mt-2 font-bold">{product.price ? `$${product.price.toLocaleString()}` : "Price N/A"}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

