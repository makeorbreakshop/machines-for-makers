"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useComparison } from "@/context/comparison-context"
import Image from "next/image"
import Link from "next/link"
import { Check, X, ChevronDown, ChevronRight } from "lucide-react"
import type { Machine } from "@/lib/database-types"
import React, { useState } from "react"

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
      { key: "Laser Type A", label: "Laser A Type" },
      { key: "Laser Power A", label: "Laser A Power", unit: "W" },
      { key: "Laser Type B", label: "Laser B Type" },
      { key: "LaserPower B", label: "Laser B Power", unit: "W" },
      { key: "Laser Source Manufacturer", label: "Laser Source" },
      { key: "Laser Frequency", label: "Frequency", defaultValue: "Not specified" },
      { key: "Pulse Width", label: "Pulse Width", defaultValue: "Not specified" },
    ],
  },
  {
    name: "Machine Dimensions",
    specs: [
      { key: "Work Area", label: "Work Area", unit: "mm" },
      { key: "Machine Size", label: "Machine Size", unit: "mm" },
      { key: "Height", label: "Height", unit: "mm" },
    ],
  },
  {
    name: "Performance",
    specs: [
      { key: "Speed", label: "Speed", unit: "mm/s", defaultValue: "Not specified" },
      { key: "Acceleration", label: "Acceleration", unit: "mm/s²", defaultValue: "Not specified" },
    ],
  },
  {
    name: "Features",
    specs: [
      { key: "Focus", label: "Auto Focus", type: "autofocus", defaultValue: "No", trueValue: "Auto" },
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
  laserTypeB: ["Laser Type B", "laser_type_b"],
  laserPowerB: ["LaserPower B", "laser_power_b"],
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({"Basic Information": true, "Laser Specifications": true})
  
  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }

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
    else if (spec.key === "Laser Type B") value = getProductValue(product, specKeys.laserTypeB)
    else if (spec.key === "LaserPower B") value = getProductValue(product, specKeys.laserPowerB)
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

    // Special handling for Auto Focus - show checkmark only for "Auto" value, X for all others
    if (spec.key === "Focus") {
      if (value === "Auto" || value === "Yes") {
        return <Check className="h-4 w-4 md:h-5 md:w-5 mx-auto text-green-500" />
      } else {
        return <X className="h-4 w-4 md:h-5 md:w-5 mx-auto text-red-400" />
      }
    }

    // Handle null/undefined values consistently
    if (value === null || value === undefined) {
      // For features category, show X icon for null/undefined values
      if (specCategories[4].specs.some(s => s.key === spec.key)) {
        return <X className="h-4 w-4 md:h-5 md:w-5 mx-auto text-red-400" />
      }
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
                  className={`h-2.5 w-2.5 md:h-3 md:w-3 ${i < Math.floor(value) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
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
        return <Check className="h-4 w-4 md:h-5 md:w-5 mx-auto text-green-500" />
      } else if (value === "No" || value === false) {
        return <X className="h-4 w-4 md:h-5 md:w-5 mx-auto text-red-400" />
      } else if (typeof value === "boolean" && value) {
        return <Check className="h-4 w-4 md:h-5 md:w-5 mx-auto text-green-500" /> 
      } else if (typeof value === "string" && value !== "No" && value !== "Yes" && value !== "Auto") {
        return value
      }
    }

    // Handle autofocus type specifically
    if (spec.type === "autofocus") {
      if (value === "Auto" || value === "Yes") {
        return <Check className="h-4 w-4 md:h-5 md:w-5 mx-auto text-green-500" />
      } else {
        return <X className="h-4 w-4 md:h-5 md:w-5 mx-auto text-red-400" />
      }
    }

    // For features category, convert "No" string values to X icon
    if (specCategories[4].specs.some(s => s.key === spec.key) && 
        (value === "No" || value === "—" || value === "Not specified" || value === "Manual")) {
      return <X className="h-4 w-4 md:h-5 md:w-5 mx-auto text-red-400" />
    }

    // Format Work Area, Height and Machine Size
    if (spec.key === "Work Area" || spec.key === "Height" || spec.key === "Machine Size") {
      if (typeof value === "string") {
        // Special handling for placeholder values
        if (value === "?" || value === "—" || value === "Not specified" || value === "0" || value === "") {
          return "—";
        }
        
        // Remove ALL "mm" instances from the string
        const withoutUnits = value.replace(/mm/g, "");
        // Then normalize separators (convert * to x)
        const formattedValue = withoutUnits.replace(/\*/g, "x");
        
        // Add mm unit display for clarity
        return <span>{formattedValue} <span className="text-xs text-muted-foreground">mm</span></span>;
      }
    }

    // Format Speed
    if (spec.key === "Speed" && typeof value === "string") {
      // Handle placeholder values
      if (value === "?" || value === "—" || value === "Not specified" || value === "") {
        return "—";
      }
      
      const speedValue = value.replace(/ mm\/s$/, "");
      return <span>{speedValue} <span className="text-xs text-muted-foreground">mm/s</span></span>;
    }

    // Special case for Acceleration - show dash if no value
    if (spec.key === "Acceleration") {
      if (!value || value === "Not specified" || value === "?" || value === "—" || value === "") {
        return "—";
      }
      // If there is a value, display with unit
      return <span>{value}<span className="text-xs ml-0.5 text-muted-foreground">mm/s²</span></span>;
    }

    // Add unit if specified in the spec definition
    if (spec.unit && value) {
      // Don't add units to placeholder values
      if (value === "?" || value === "—" || value === "Not specified" || value === "") {
        return "—";
      }
      
      // Special handling for laser power - clean up the formatting
      if (spec.key === "Laser Power A" || spec.key === "LaserPower B") {
        // Remove any existing "W" suffix before adding our own
        const cleanValue = typeof value === "string" ? value.replace(/W?$/, "") : value;
        return <span>{cleanValue}<span className="text-xs ml-0.5 text-muted-foreground">W</span></span>;
      }
      
      return <span>{value}<span className="text-xs ml-0.5 text-muted-foreground">{spec.unit}</span></span>;
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
      <DialogContent 
        className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-[90vw] xl:max-w-[90vw] 2xl:max-w-[90vw] h-[90vh] p-0 md:p-0 flex flex-col"
        style={{ 
          width: selectedProducts.length <= 2 ? "1000px" : 
                 selectedProducts.length <= 3 ? "1200px" : "95vw" 
        }}
      >
        <DialogHeader className="px-4 pt-4 md:px-6 md:pt-6">
          <DialogTitle className="sr-only">Compare Laser Cutters</DialogTitle>
        </DialogHeader>

        {selectedProducts.length > 0 ? (
          <div className="overflow-auto flex-grow px-2 sm:px-4 md:px-6 pb-0">
            <div className="w-full mx-auto">
              <table className="w-full border-collapse min-w-max" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col className="w-[200px] min-w-[180px] max-w-[220px]" />
                  {selectedProducts.map((product, index) => {
                    // Responsive width calculation
                    const productCount = selectedProducts.length;
                    // Smaller base width to keep tables condensed
                    const baseWidth = productCount <= 2 ? 300 : 
                                     productCount <= 3 ? 260 : 
                                     productCount <= 4 ? 220 : 
                                     productCount <= 5 ? 200 : 
                                     productCount <= 6 ? 180 : 160;
                    
                    // Calculate width based on available space
                    const maxProductWidth = Math.min(350, baseWidth);
                    
                    return (
                      <col 
                        key={`col-${product.id || index}`} 
                        className={`min-w-[140px]`}
                        style={{ width: `${maxProductWidth}px`, maxWidth: `${maxProductWidth}px` }}
                      />
                    );
                  })}
                </colgroup>
                <thead className="sticky top-0 bg-background z-10">
                  <tr>
                    <th className="border-b p-3 md:p-3 text-left"></th>
                    {selectedProducts.map((product) => (
                      <th key={product.id} className="border-b p-2 md:p-3 text-center">
                        <div className="flex flex-col items-center relative group">
                          <div className="relative h-32 w-32 md:h-36 md:w-36 mb-2 mx-auto rounded-lg overflow-hidden bg-muted/20 p-2">
                            <Image
                              src={getImageUrl(product)}
                              alt={getMachineName(product)}
                              fill
                              className="object-contain p-2"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                              onClick={() => removeFromComparison(product.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <Link
                            href={`/products/${getInternalLink(product)}`}
                            className="font-bold text-primary hover:underline text-sm md:text-base px-1 line-clamp-2 h-9 flex items-center justify-center group-hover:text-primary/80"
                          >
                            {getMachineName(product)}
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specCategories.map((category) => {
                    // Filter specs to only include those where at least one product has a value
                    const visibleSpecs = category.specs.filter(spec => {
                      // Check if any product has a value for this spec
                      return selectedProducts.some(product => {
                        // Get the value using our existing helper
                        let value;
                        if (spec.key === "Company") value = getProductValue(product, specKeys.brand)
                        else if (spec.key === "Price") value = getProductValue(product, specKeys.price)
                        else if (spec.key === "Rating") value = getProductValue(product, specKeys.rating)
                        else if (spec.key === "Warranty") value = getProductValue(product, specKeys.warranty)
                        else if (spec.key === "Software") value = getProductValue(product, specKeys.software)
                        else if (spec.key === "Laser Type A") value = getProductValue(product, specKeys.laserType)
                        else if (spec.key === "Laser Power A") value = getProductValue(product, specKeys.laserPower)
                        else if (spec.key === "Laser Type B") value = getProductValue(product, specKeys.laserTypeB)
                        else if (spec.key === "LaserPower B") value = getProductValue(product, specKeys.laserPowerB)
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
                        
                        // Check if value is meaningful (not empty, undefined, or placeholder)
                        return value !== null && 
                               value !== undefined && 
                               value !== "" && 
                               value !== "—" && 
                               value !== "?" &&
                               value !== "Not specified" &&
                               value !== "0" &&
                               !('type' in spec && spec.type === "boolean" && (value === "No" || value === false));
                      });
                    });
                    
                    // Only render category if it has visible specs
                    if (visibleSpecs.length === 0) return null;
                    
                    return (
                      <React.Fragment key={category.name}>
                        <tr className="bg-muted/50">
                          <td className="border-b p-2 md:p-3 font-bold text-sm md:text-base text-gray-700 dark:text-gray-300" colSpan={selectedProducts.length + 1}>
                            <button
                              onClick={() => toggleSection(category.name)}
                              className="flex items-center gap-2 w-full text-left hover:text-primary transition-colors"
                            >
                              {expandedSections[category.name] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {category.name}
                            </button>
                          </td>
                        </tr>
                        {expandedSections[category.name] && visibleSpecs.map((spec) => (
                          <tr key={spec.key} className="hover:bg-muted/20 transition-colors">
                            <td className="border-b p-2 md:p-3 font-medium text-sm md:text-base text-muted-foreground">{spec.label}</td>
                            {selectedProducts.map((product) => (
                              <td key={`${product.id}-${spec.key}`} className="border-b p-2 md:p-3 text-center font-medium text-xs md:text-sm">
                                <div className="px-1">{renderSpecValue(product, spec)}</div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center px-4 md:px-6">
            <p className="text-muted-foreground">No products selected for comparison.</p>
            <p className="text-sm mt-2">Add products to compare by clicking the "COMPARE" button on product cards.</p>
          </div>
        )}

        <div className="flex justify-between mt-auto border-t shrink-0 px-4 py-3 md:px-6">
          <Button variant="outline" onClick={() => clearComparison()} className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
            Clear All
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

