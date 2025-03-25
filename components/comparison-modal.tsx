"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useComparison } from "@/context/comparison-context"
import Image from "next/image"
import Link from "next/link"
import { Check, X } from "lucide-react"
import type { Machine } from "@/lib/database-types"
import React from "react"

// Define a type that can handle both camelCase and quoted property names
interface MixedFormatProduct extends Record<string, any> {
  id: string
}

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

// Updated spec keys to handle both formats
const specKeys = {
  // Basic Information
  brand: ["Company", "company"],
  price: ["Price", "price"],
  rating: ["Rating", "rating"],
  warranty: ["Warranty", "warranty"],
  software: ["Software", "software"],
  
  // Laser Specifications
  laserType: ["Laser Type A", "laser_type_a"],
  laserPower: ["Laser Power A", "laser_power_a"],
  laserSource: ["Laser Source Manufacturer", "laser_source_manufacturer"],
  laserFrequency: ["Laser Frequency", "laser_frequency"],
  pulseWidth: ["Pulse Width", "pulse_width"],
  
  // Machine Dimensions
  workArea: ["Work Area", "work_area"],
  machineSize: ["Machine Size", "machine_size"],
  height: ["Height", "height"],
  
  // Performance
  speed: ["Speed", "speed"],
  acceleration: ["Acceleration", "acceleration"],
  
  // Features
  focus: ["Focus", "focus"],
  enclosure: ["Enclosure", "enclosure"],
  wifi: ["Wifi", "wifi"],
  camera: ["Camera", "camera"],
  passthrough: ["Passthrough", "passthrough"],
  controller: ["Controller", "controller"],
}

interface ComparisonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ComparisonModal({ open, onOpenChange }: ComparisonModalProps) {
  const { selectedProducts, removeFromComparison, clearComparison } = useComparison()

  // Set constant column width with increased spacing
  const PRODUCT_COLUMN_WIDTH = 220 // Increased from 180px
  const LABEL_COLUMN_WIDTH = 200 // Increased from 180px
  
  // Helper function to get value from product using multiple possible keys
  const getProductValue = (product: Machine, keys: string[]) => {
    const mixedProduct = product as unknown as MixedFormatProduct
    
    for (const key of keys) {
      if (mixedProduct[key] !== undefined) {
        return mixedProduct[key]
      }
    }
    
    return undefined
  }
  
  // Render a spec value based on its type
  const renderSpecValue = (product: Machine, spec: any) => {
    // Try to get value using both camelCase and quoted formats
    let value
    
    // Handle spec keys mapping
    if (spec.key === "Company") value = getProductValue(product, specKeys.brand)
    else if (spec.key === "Price") value = getProductValue(product, specKeys.price)
    else if (spec.key === "Rating") value = getProductValue(product, specKeys.rating)
    else if (spec.key === "Warranty") value = getProductValue(product, specKeys.warranty)
    else if (spec.key === "Software") value = getProductValue(product, specKeys.software)
    else if (spec.key === "Laser Type A") value = getProductValue(product, specKeys.laserType)
    else if (spec.key === "Laser Power A") value = getProductValue(product, specKeys.laserPower)
    else if (spec.key === "Laser Source Manufacturer") value = getProductValue(product, specKeys.laserSource)
    else if (spec.key === "Laser Frequency") value = getProductValue(product, specKeys.laserFrequency)
    else if (spec.key === "Pulse Width") value = getProductValue(product, specKeys.pulseWidth)
    else if (spec.key === "Work Area") value = getProductValue(product, specKeys.workArea)
    else if (spec.key === "Machine Size") value = getProductValue(product, specKeys.machineSize)
    else if (spec.key === "Height") value = getProductValue(product, specKeys.height)
    else if (spec.key === "Speed") value = getProductValue(product, specKeys.speed)
    else if (spec.key === "Acceleration") value = getProductValue(product, specKeys.acceleration)
    else if (spec.key === "Focus") value = getProductValue(product, specKeys.focus)
    else if (spec.key === "Enclosure") value = getProductValue(product, specKeys.enclosure)
    else if (spec.key === "Wifi") value = getProductValue(product, specKeys.wifi)
    else if (spec.key === "Camera") value = getProductValue(product, specKeys.camera)
    else if (spec.key === "Passthrough") value = getProductValue(product, specKeys.passthrough)
    else if (spec.key === "Controller") value = getProductValue(product, specKeys.controller)
    else value = product[spec.key as keyof Machine]

    // Handle null/undefined values consistently
    if (value === null || value === undefined) {
      return spec.defaultValue || "—"
    }

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
      } else if (value === "No") {
        return <X className="h-5 w-5 mx-auto text-red-600" />
      } else if (typeof value === "boolean") {
        return value ? 
          <Check className="h-5 w-5 mx-auto text-green-600" /> : 
          <X className="h-5 w-5 mx-auto text-red-600" />
      } else if (typeof value === "string") {
        return value
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

  // Get image URL from product data
  const getImageUrl = (product: Machine) => {
    const mixedProduct = product as unknown as MixedFormatProduct
    return mixedProduct["Image"] || mixedProduct.image_url || "/placeholder.svg"
  }
  
  // Get machine name from product data
  const getMachineName = (product: Machine) => {
    const mixedProduct = product as unknown as MixedFormatProduct
    return mixedProduct["Machine Name"] || mixedProduct.machine_name || `Product ${product.id}`
  }
  
  // Get internal link from product data
  const getInternalLink = (product: Machine) => {
    const mixedProduct = product as unknown as MixedFormatProduct
    return mixedProduct["Internal link"] || mixedProduct.slug || ""
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
                            src={getImageUrl(product)}
                            alt={getMachineName(product)}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <Link
                          href={`/products/${getInternalLink(product)}`}
                          className="font-bold text-primary hover:underline text-base"
                        >
                          {getMachineName(product)}
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

