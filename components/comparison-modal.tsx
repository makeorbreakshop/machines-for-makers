"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useComparison } from "@/context/comparison-context"
import Image from "next/image"
import Link from "next/link"
import { Check, X } from "lucide-react"
import type { Machine } from "@/lib/database-types"
import React from "react"

// Define the specs we want to compare
const specCategories = [
  {
    name: "General",
    specs: [
      { key: "Laser Power A", label: "Power", unit: "W" },
      { key: "Work Area", label: "Dimensions" },
      { key: "Price", label: "Price", format: "currency" },
    ],
  },
  {
    name: "Performance",
    specs: [
      { key: "Speed", label: "Max Speed", defaultValue: "Not specified" },
      { key: "Laser Frequency", label: "Frequency", defaultValue: "Not specified" },
      { key: "Pulse Width", label: "Pulse Width", defaultValue: "Not specified" },
    ],
  },
  {
    name: "Features",
    specs: [
      { key: "Camera", label: "Camera", type: "boolean", defaultValue: "No" },
      { key: "Wifi", label: "WiFi", type: "boolean", defaultValue: "No" },
      { key: "Focus", label: "Auto Focus", type: "boolean", defaultValue: "No", trueValue: "Auto" },
      { key: "Enclosure", label: "Enclosure", type: "boolean", defaultValue: "No" },
      { key: "Passthrough", label: "Passthrough", type: "boolean", defaultValue: "No" },
    ],
  },
]

interface ComparisonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ComparisonModal({ open, onOpenChange }: ComparisonModalProps) {
  const { selectedProducts, removeFromComparison, clearComparison } = useComparison()

  // Calculate table width based on number of products
  const getTableWidth = () => {
    const baseWidth = 180 // Width of the first column
    const productWidth = 200 // Width per product column
    return `${baseWidth + selectedProducts.length * productWidth}px`
  }

  // Render a spec value based on its type
  const renderSpecValue = (product: Machine, spec: any) => {
    const value = product[spec.key as keyof Machine]

    if (spec.format === "currency" && typeof value === "number") {
      return `$${value.toLocaleString()}`
    }

    if (spec.type === "boolean") {
      // Handle boolean values that are stored as "Yes"/"No" strings
      if (value === "Yes" || value === "Auto") {
        return <Check className="h-5 w-5 mx-auto text-green-600" />
      } else if (value === "No" || value === null || value === undefined) {
        return <X className="h-5 w-5 mx-auto text-red-600" />
      } else {
        return value.toString()
      }
    }

    // Add unit if specified
    if (spec.unit && value) {
      return `${value}${spec.unit}`
    }

    return value || spec.defaultValue || "—"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Compare Laser Cutters</DialogTitle>
          <DialogDescription>Compare specifications of selected laser cutters side by side.</DialogDescription>
        </DialogHeader>

        {selectedProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ width: getTableWidth(), minWidth: "100%" }}>
              <thead className="sticky top-0 bg-background z-10">
                <tr>
                  <th className="w-[180px] min-w-[180px] border-b p-4 text-left"></th>
                  {selectedProducts.map((product) => (
                    <th key={product.id} className="min-w-[180px] w-[calc((100%-180px)/5)] border-b p-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="relative h-28 w-28 mb-3 mx-auto">
                          <Image
                            src={product["Image"] || "/placeholder.svg"}
                            alt={product["Machine Name"] || `Product ${product.id || "image"}`}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <Link
                          href={`/products/${product["Internal link"]}`}
                          className="font-bold text-primary hover:underline text-base"
                        >
                          {product["Machine Name"]}
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => removeFromComparison(product.id)}
                        >
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specCategories.map((category) => (
                  <React.Fragment key={category.name}>
                    <tr className="bg-muted/50">
                      <td className="border-b p-4 font-bold" colSpan={selectedProducts.length + 1}>
                        {category.name}
                      </td>
                    </tr>
                    {category.specs.map((spec) => (
                      <tr key={spec.key} className="hover:bg-muted/20">
                        <td className="border-b p-4 font-medium">{spec.label}</td>
                        {selectedProducts.map((product) => (
                          <td key={`${product.id}-${spec.key}`} className="border-b p-4 text-center font-medium">
                            {renderSpecValue(product, spec)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No products selected for comparison.</p>
            <p className="text-sm mt-2">Add products to compare by clicking the "COMPARE" button on product cards.</p>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => clearComparison()}>
            Clear All
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

