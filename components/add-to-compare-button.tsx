"use client"

import { Button } from "@/components/ui/button"
import { PlusCircle, CheckCircle } from "lucide-react"
import { useComparison } from "@/context/comparison-context"
import type { Machine } from "@/lib/database-types"

// Define a type that can handle both camelCase and quoted property names
interface MixedFormatProduct extends Record<string, any> {
  id: string
}

export default function AddToCompareButton({ product }: { product: Machine }) {
  const { addToComparison, removeFromComparison, isSelected } = useComparison()
  const selected = isSelected(product.id)

  const handleCompare = () => {
    if (selected) {
      removeFromComparison(product.id)
    } else {
      // Cast the product to a mixed format type to handle both formats
      const mixedProduct = product as unknown as MixedFormatProduct
      
      // Format the product data to ensure it has the expected fields
      const formattedProduct = {
        ...product,
        // Use optional chaining to safely access properties
        "Image": mixedProduct.image_url || product["Image"] || "/placeholder.svg",
        "Machine Name": mixedProduct.machine_name || product["Machine Name"] || "Unknown Product",
        "Internal link": mixedProduct.slug || product["Internal link"] || "",
      }
      addToComparison(formattedProduct as Machine)
    }
    // Removed router.push('/compare') to prevent automatic navigation
  }

  return (
    <Button variant="outline" size="lg" className="w-full" onClick={handleCompare}>
      {selected ? (
        <>
          <CheckCircle className="mr-2 h-5 w-5" /> Added to Compare
        </>
      ) : (
        <>
          <PlusCircle className="mr-2 h-5 w-5" /> Add to Compare
        </>
      )}
    </Button>
  )
} 