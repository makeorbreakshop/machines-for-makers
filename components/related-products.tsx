import { Card, CardContent } from "@/components/ui/card"
import type { Machine } from "@/lib/database-types"
import Image from "next/image"
import Link from "next/link"

interface RelatedProductsProps {
  products: Machine[]
  currentProductId: string
}

export default function RelatedProducts({ products, currentProductId }: RelatedProductsProps) {
  // Filter out the current product and limit to 3 related products
  const relatedProducts = products.filter((product) => product.id !== currentProductId).slice(0, 3)

  if (relatedProducts.length === 0) return null

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Related Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <Link href={`/products/${product["Internal link"]}`}>
              <div className="h-[150px] relative">
                <Image
                  src={product["Image"] || "/placeholder.svg?height=150&width=150"}
                  alt={product["Machine Name"]}
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
            <CardContent className="p-4">
              <Link href={`/products/${product["Internal link"]}`}>
                <h3 className="font-bold text-base mb-1 hover:text-primary">{product["Machine Name"]}</h3>
              </Link>
              <div className="text-sm text-muted-foreground">
                {product["Laser Power A"] && `${product["Laser Power A"]}W`} {product["Laser Type A"]}
              </div>
              <div className="mt-2 font-bold">{product["Price"] ? `$${product["Price"].toLocaleString()}` : "Price N/A"}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

