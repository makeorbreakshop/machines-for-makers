"use client"

import { useComparison } from "@/context/comparison-context"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import ComparisonModal from "./comparison-modal"
import type { Machine } from "@/lib/database-types"

// Define a type that can handle both camelCase and quoted property names
interface MixedFormatProduct extends Record<string, any> {
  id: string
}

export default function ComparisonBar() {
  const { selectedProducts, removeFromComparison, clearComparison } = useComparison()
  const [modalOpen, setModalOpen] = useState(false)

  // Helper functions to get product data regardless of format
  const getImageUrl = (product: Machine) => {
    const mixedProduct = product as unknown as MixedFormatProduct
    return mixedProduct["Image"] || mixedProduct.image_url || "/placeholder.svg"
  }
  
  const getMachineName = (product: Machine) => {
    const mixedProduct = product as unknown as MixedFormatProduct
    return mixedProduct["Machine Name"] || mixedProduct.machine_name || `Product ${product.id}`
  }

  // Don't render if no products are selected
  if (selectedProducts.length === 0) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 py-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedProducts.length} {selectedProducts.length === 1 ? "product" : "products"} selected
            </span>
            <div className="flex items-center gap-2 ml-4">
              {selectedProducts.map((product: Machine) => (
                <div key={product.id} className="relative group">
                  <div className="h-12 w-12 relative rounded border overflow-hidden">
                    <Image
                      src={getImageUrl(product)}
                      alt={getMachineName(product)}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <button
                    className="absolute -top-2 -right-2 bg-white rounded-full border h-5 w-5 flex items-center justify-center shadow-sm"
                    onClick={() => removeFromComparison(product.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {getMachineName(product)}
                  </div>
                </div>
              ))}
              {Array.from({ length: 8 - selectedProducts.length }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 w-12 border rounded border-dashed flex items-center justify-center text-muted-foreground"
                >
                  <span className="text-xs">+</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => clearComparison()}>
              Clear All
            </Button>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Compare Now
            </Button>
          </div>
        </div>
      </div>
      <ComparisonModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}

