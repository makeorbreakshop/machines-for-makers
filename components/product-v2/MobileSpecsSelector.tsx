"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

interface MobileSpecsSelectorProps {
  product: any
}

export function MobileSpecsSelector({ product }: MobileSpecsSelectorProps) {
  const [activeTab, setActiveTab] = useState('basic')

  // Helper function to format boolean/Yes/No values
  const formatBooleanValue = (value: any) => {
    if (value === "Yes" || value === true || value === "Auto") {
      return <Check className="h-4 w-4 text-green-500" />
    }
    if (value === "No" || value === false || value === null || value === undefined) {
      return <X className="h-4 w-4 text-red-400" />
    }
    return value;
  }

  return (
    <div className="space-y-3">
      {/* Section heading with dropdown */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold" id="mobile-specifications">
          Specifications
        </h2>
        <select 
          className="bg-slate-100 text-sm rounded-md py-1.5 pl-3 pr-8 focus:ring-1 focus:ring-primary border border-slate-200"
          aria-label="Select specification category"
          onChange={(e) => setActiveTab(e.target.value)}
          value={activeTab}
        >
          <option value="basic">Basic Info</option>
          <option value="laser">Laser Specs</option>
          <option value="dimensions">Dimensions</option>
          <option value="performance">Performance</option>
          <option value="features">Features</option>
        </select>
      </div>
      
      {/* Specs table with card styling */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm divide-y divide-slate-200">
        {activeTab === 'basic' && (
          <>
            <SpecRow label="Brand" value={product.company} />
            <SpecRow label="Price" value={product.price ? `$${product.price.toLocaleString()}` : "N/A"} />
            <SpecRow label="Expert Score" value={product.rating ? (
              <div className="flex items-center">
                <span className="font-medium mr-1">{product.rating}</span>
                <div className="flex">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <svg
                        key={i}
                        className={`h-3 w-3 ${i < Math.floor(product.rating/2) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ))}
                </div>
              </div>
            ) : "N/A"} />
            <SpecRow label="Warranty" value={product.warranty || "N/A"} />
            <SpecRow label="Software" value={product.software || "N/A"} />
          </>
        )}
        
        {activeTab === 'laser' && (
          <>
            <SpecRow label="Laser Type" value={product.laser_type_a || "N/A"} highlight />
            <SpecRow label="Power (W)" value={product.laser_power_a ? `${product.laser_power_a}` : "N/A"} highlight />
            <SpecRow label="Laser Source" value={product.laser_source_manufacturer || "N/A"} />
            <SpecRow label="Frequency" value={product.laser_frequency || "N/A"} />
            <SpecRow label="Pulse Width" value={product.pulse_width || "N/A"} />
            {product.laser_power_b && (
              <SpecRow label="Secondary Laser" value={`${product.laser_power_b}W ${product.laser_type_b}`} />
            )}
          </>
        )}
        
        {activeTab === 'dimensions' && (
          <>
            <SpecRow label="Work Area (mm)" value={product.work_area || "N/A"} highlight />
            <SpecRow label="Machine Size (mm)" value={product.machine_size || "N/A"} />
            <SpecRow label="Height (mm)" value={product.height || "N/A"} />
            <SpecRow label="Weight (kg)" value={product.weight || "N/A"} />
          </>
        )}
        
        {activeTab === 'performance' && (
          <>
            <SpecRow label="Speed (mm/s)" value={product.speed || product.max_speed || "N/A"} highlight />
            <SpecRow label="Acceleration" value={product.acceleration || "N/A"} />
            <SpecRow label="Air Assist" value={formatBooleanValue(product.air_assist)} />
            <SpecRow label="Auto Focus" value={formatBooleanValue(product.focus === "Auto" || product.focus === "Yes")} />
          </>
        )}
        
        {activeTab === 'features' && (
          <>
            <SpecRow label="Focus" value={product.focus || "N/A"} />
            <SpecRow label="Enclosure" value={formatBooleanValue(product.enclosure)} />
            <SpecRow label="WiFi" value={formatBooleanValue(product.wifi)} />
            <SpecRow label="Camera" value={formatBooleanValue(product.camera)} />
            <SpecRow label="Passthrough" value={formatBooleanValue(product.passthrough)} />
            <SpecRow label="Controller" value={product.controller || "N/A"} />
          </>
        )}
      </div>

      {/* Manual download button if available */}
      {product.manual_url && (
        <div className="mt-4 text-center">
          <a 
            href={product.manual_url}
            className="inline-flex items-center justify-center text-sm font-medium rounded-lg px-4 py-2 bg-primary text-white shadow-sm hover:bg-primary/90"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Product Manual
          </a>
        </div>
      )}
    </div>
  )
}

// Helper component for spec rows
function SpecRow({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string;
  value: any;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "px-4 py-3 flex items-center justify-between",
      highlight ? "bg-slate-50" : "bg-white"
    )}>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className="font-medium text-slate-900 flex items-center">
        {typeof value === "string" || typeof value === "number" ? value : value}
      </div>
    </div>
  )
} 