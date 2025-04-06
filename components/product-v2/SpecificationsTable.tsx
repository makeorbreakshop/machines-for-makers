"use client"

import { Info } from "lucide-react"
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
  color: string
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
  const specGroups: SpecGroup[] = [
    {
      title: "Power",
      color: "text-yellow-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Laser Type A", value: product.laser_type_a, tooltip: "Primary laser type" },
        { name: "Laser Power A", value: product.laser_power_a ? `${product.laser_power_a}W` : null },
        { name: "Laser Type B", value: product.laser_type_b },
        { name: "Laser Power B", value: product.laser_power_b ? `${product.laser_power_b}W` : null }
      ]
    },
    {
      title: "Dimensions",
      color: "text-blue-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Work Area", value: product.work_area, tooltip: "Maximum area that can be engraved or cut" },
        { name: "Z-Axis Travel", value: product.z_axis_travel },
        { name: "Machine Dimensions", value: product.machine_dimensions },
        { name: "Machine Weight", value: product.weight },
        { name: "Maximum Material Height", value: product.max_material_height },
        { name: "Pass-Through", value: product.pass_through, tooltip: "Whether the machine allows materials to pass through" }
      ]
    },
    {
      title: "Performance",
      color: "text-red-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
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
      title: "Software",
      color: "text-purple-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Software", value: product.software },
        { name: "File Types", value: product.file_types },
        { name: "Operating System", value: product.operating_system }
      ]
    },
    {
      title: "Features",
      color: "text-green-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      specs: [
        { name: "Camera", value: product.camera, tooltip: "Camera system for material positioning" },
        { name: "Autofocus", value: product.autofocus },
        { name: "Air Assist", value: product.air_assist, tooltip: "System that blows air at the cutting point" },
        { name: "Rotary Support", value: product.rotary, tooltip: "Ability to engrave on cylindrical objects" },
        { name: "Safety Features", value: product.safety_features }
      ]
    }
  ]

  // Filter out empty specs
  const filteredSpecGroups = specGroups.map(group => ({
    ...group,
    specs: group.specs.filter(spec => spec.value)
  })).filter(group => group.specs.length > 0)

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
      <TooltipProvider>
        {filteredSpecGroups.map((group) => (
          <div
            key={group.title}
            className="bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            <div className={cn("flex items-center gap-2 p-4 border-b bg-gray-50", group.color)}>
              <div className="flex-shrink-0">{group.icon}</div>
              <h3 className="font-medium capitalize">{group.title}</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {group.specs.map((spec) => (
                  <div key={spec.name} className="flex items-start justify-between text-sm">
                    <div className="text-gray-500 flex items-center gap-1">
                      {spec.name}
                      {spec.tooltip && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-gray-400 hover:text-gray-500">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{spec.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-gray-900 font-medium text-right">{spec.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </TooltipProvider>
    </div>
  )
} 