"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SpecGroup {
  title: string
  icon: React.ReactNode
  specs: {
    name: string
    value: string | null | undefined
    tooltip?: string
  }[]
}

interface SpecificationsTableProps {
  product: any
  className?: string
}

export function SpecificationsTable({ product, className }: SpecificationsTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["power", "dimensions"])

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupTitle)
        ? prev.filter((title) => title !== groupTitle)
        : [...prev, groupTitle]
    )
  }

  // Generate specification groups from product data
  const specGroups: SpecGroup[] = [
    {
      title: "power",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Laser Type A", value: product.laser_type_a, tooltip: "Primary laser technology used in this machine" },
        { name: "Laser Power A", value: product.laser_power_a ? `${product.laser_power_a}W` : null, tooltip: "Maximum power output of the primary laser" },
        { name: "Laser Type B", value: product.laser_type_b },
        { name: "Laser Power B", value: product.laser_power_b ? `${product.laser_power_b}W` : null },
        { name: "Wavelength", value: product.wavelength },
        { name: "Power Requirements", value: product.power_requirements }
      ]
    },
    {
      title: "dimensions",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Work Area", value: product.work_area, tooltip: "Maximum area that can be engraved or cut" },
        { name: "Z-Axis Travel", value: product.z_axis_travel },
        { name: "Machine Dimensions", value: product.machine_dimensions },
        { name: "Machine Weight", value: product.weight },
        { name: "Maximum Material Height", value: product.max_material_height },
        { name: "Pass-Through", value: product.pass_through, tooltip: "Whether the machine allows materials to pass through for working on larger pieces" }
      ]
    },
    {
      title: "performance",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Speed", value: product.speed, tooltip: "Maximum speed the machine can operate at" },
        { name: "Resolution", value: product.resolution, tooltip: "Finest detail the machine can produce" },
        { name: "Positioning Accuracy", value: product.positioning_accuracy },
        { name: "Repeatability", value: product.repeatability },
        { name: "Minimum Line Width", value: product.min_line_width }
      ]
    },
    {
      title: "software",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Software", value: product.software, tooltip: "Software required or provided with the machine" },
        { name: "File Types", value: product.file_types },
        { name: "Operating System", value: product.operating_system },
        { name: "Connectivity", value: product.connectivity, tooltip: "How the machine connects to your computer or network" }
      ]
    },
    {
      title: "features",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Camera", value: product.camera, tooltip: "Camera system for material positioning" },
        { name: "Autofocus", value: product.autofocus },
        { name: "Air Assist", value: product.air_assist, tooltip: "System that blows air at the cutting point to improve cutting quality" },
        { name: "Rotary Support", value: product.rotary, tooltip: "Ability to engrave on cylindrical objects" },
        { name: "Safety Features", value: product.safety_features }
      ]
    },
    {
      title: "materials",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Compatible Materials", value: product.materials },
        { name: "Maximum Cutting Depth", value: product.max_cutting_depth }
      ]
    }
  ]

  // Filter out empty specs
  const filteredSpecGroups = specGroups.map(group => ({
    ...group,
    specs: group.specs.filter(spec => spec.value)
  })).filter(group => group.specs.length > 0)

  return (
    <div className={cn("space-y-4", className)}>
      <TooltipProvider>
        {filteredSpecGroups.map((group) => (
          <div
            key={group.title}
            className="border rounded-lg overflow-hidden bg-white shadow-sm"
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
              onClick={() => toggleGroup(group.title)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">{group.icon}</div>
                <h3 className="font-medium text-gray-900 capitalize">
                  {group.title}
                </h3>
              </div>
              <div>
                {expandedGroups.includes(group.title) ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </div>
            {expandedGroups.includes(group.title) && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.specs.map((spec) => (
                  <div key={spec.name} className="flex items-start">
                    <div className="w-1/2 text-sm text-gray-500 flex items-center pr-2">
                      {spec.name}
                      {spec.tooltip && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="ml-1 inline-flex text-gray-400 hover:text-gray-500"
                            >
                              <Info className="h-4 w-4" />
                              <span className="sr-only">Info</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{spec.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="w-1/2 text-sm font-medium text-gray-900">{spec.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </TooltipProvider>
    </div>
  )
} 