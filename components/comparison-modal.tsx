"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useComparison } from "@/context/comparison-context"
import Image from "next/image"
import Link from "next/link"
import { Check, X } from "lucide-react"
import type { Machine } from "@/lib/database-types"
import React from "react"

// Create a VisuallyHidden component for accessibility
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
)

// Define the specs we want to compare - expanded to match table view with new categories
const specCategories = [
  {
    name: "Basic Information",
    specs: [
      { key: "Company", label: "Brand" },
      { key: "Price", label: "Price", format: "currency" },
      { key: "Rating", label: "Rating", type: "rating" },
      { key: "Warranty", label: "Warranty" },
      { key: "Software", label: "Software" },
    ],
  },
  {
    name: "Laser Specifications",
    specs: [
      { key: "Laser Type A", label: "Laser Type" },
      { key: "Laser Power A", label: "Power", unit: "W" },
      { key: "Laser Source Manufacturer", label: "Laser Source" },
      { key: "Laser Frequency", label: "Frequency", defaultValue: "Not specified" },
      { key: "Pulse Width", label: "Pulse Width", defaultValue: "Not specified" },
    ],
  },
  {
    name: "Machine Dimensions",
    specs: [
      { key: "Work Area", label: "Work Area" },
      { key: "Machine Size", label: "Machine Size" },
      { key: "Height", label: "Height" },
    ],
  },
  {
    name: "Performance",
    specs: [
      { key: "Speed", label: "Speed", defaultValue: "Not specified" },
      { key: "Acceleration", label: "Acceleration", defaultValue: "Not specified" },
    ],
  },
  {
    name: "Features",
    specs: [
      { key: "Focus", label: "Auto Focus", type: "boolean", defaultValue: "No", trueValue: "Auto" },
      { key: "Enclosure", label: "Enclosure", type: "boolean", defaultValue: "No" },
      { key: "Wifi", label: "WiFi", type: "boolean", defaultValue: "No" },
      { key: "Camera", label: "Camera", type: "boolean", defaultValue: "No" },
      { key: "Passthrough", label: "Passthrough", type: "boolean", defaultValue: "No" },
      { key: "Controller", label: "Controller" },
    ],
  },
]

interface ComparisonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ComparisonModal({ open, onOpenChange }: ComparisonModalProps) {
  const { selectedProducts, removeFromComparison, clearComparison } = useComparison()

  // Set constant column width with increased spacing
  const PRODUCT_COLUMN_WIDTH = 220 // Increased from 180px
  const LABEL_COLUMN_WIDTH = 200 // Increased from 180px
  
  // Render a spec value based on its type
  const renderSpecValue = (product: Machine, spec: any) => {
    const value = product[spec.key as keyof Machine]

    if (spec.format === "currency" && typeof value === "number") {
      return `$${value.toLocaleString()}`
    }

    if (spec.type === "rating" && typeof value === "number") {
      return (
        <div className="flex items-center justify-center">
          <span className="font-medium mr-1">{value}</span>
          <div className="flex">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <svg
                  key={i}
                  className={`h-3 w-3 ${i < Math.floor(value) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ))}
          </div>
        </div>
      )
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

    // Format Work Area, Height and Machine Size
    if (spec.key === "Work Area" || spec.key === "Height" || spec.key === "Machine Size") {
      if (typeof value === "string") {
        // Remove ALL "mm" instances from the string
        const withoutUnits = value.replace(/mm/g, "");
        // Then normalize separators (convert * to x)
        return withoutUnits.replace(/\*/g, "x");
      }
    }

    // Format Speed
    if (spec.key === "Speed" && typeof value === "string") {
      return value.replace(/ mm\/s$/, "");
    }

    // Add unit if specified
    if (spec.unit && value) {
      return `${value}${spec.unit}`
    }

    return value || spec.defaultValue || "—"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-auto max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Compare Laser Cutters</DialogTitle>
        </DialogHeader>

        {selectedProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: `${LABEL_COLUMN_WIDTH}px` }} />
                {selectedProducts.map((product, index) => (
                  <col key={`col-${product.id || index}`} style={{ width: `${PRODUCT_COLUMN_WIDTH}px` }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 bg-background z-10">
                <tr>
                  <th className="border-b p-4 text-left"></th>
                  {selectedProducts.map((product) => (
                    <th key={product.id} className="border-b p-4 text-center">
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

