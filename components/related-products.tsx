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
}

export default function RelatedProducts({ products, currentProductId }: RelatedProductsProps) {
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
  
  // Limit to 3 related products
  const relatedProducts = sortedProducts.slice(0, 3);

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

  if (relatedProducts.length === 0) {
    console.log('No related products to display');
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Related Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedProducts.map((product) => {
          console.log('Rendering related product:', {
            id: product.id,
            name: product.machine_name,
            award: product.award
          });
          
          return (
            <Card key={product.id} className="overflow-hidden">
              <div className="relative">
                <Link href={`/products/${product.slug}`}>
                  <div className="h-[150px] relative">
                    <Image
                      src={product.image_url || "/placeholder.svg?height=150&width=150"}
                      alt={product.machine_name || `Related product ${product.id || "image"}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                </Link>
                
                {product.award && (
                  <div className="absolute top-2 left-2">
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
          );
        })}
      </div>
    </div>
  )
}

