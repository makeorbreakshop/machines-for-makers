"use client"

import React, { useState, useMemo } from "react"
import { DataTable } from "@/components/data-table"
import type { Machine } from "@/lib/database-types"
import { useComparison } from "@/context/comparison-context"
import Image from "next/image"
import Link from "next/link"
import { Check, X, ExternalLink, SlidersHorizontal, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type ColumnDef, type VisibilityState } from "@tanstack/react-table"

interface EnhancedComparisonTableProps {
  machines: Machine[]
}

export default function EnhancedComparisonTable({ machines }: EnhancedComparisonTableProps) {
  const { addToComparison, removeFromComparison, isSelected } = useComparison()
  
  // Define initial column visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    company: true,
    laserTypeA: true,
    laserPowerA: true,
    price: true,
    workArea: true,
    speed: true,
    software: true,
    warranty: false,
    machineSize: false,
    height: false,
    laserSourceManufacturer: false,
    bestFor: false,
    rating: true,
    actions: true,
  })

  // Define column groups for displaying in dropdown menu
  const columnGroups = [
    {
      id: "general",
      name: "General",
      columns: [
        { id: "company", name: "Brand" },
        { id: "laserTypeA", name: "Laser Type" },
        { id: "laserPowerA", name: "Power (W)" },
        { id: "laserSourceManufacturer", name: "Laser Source" },
        { id: "price", name: "Price" },
        { id: "rating", name: "Rating" },
        { id: "software", name: "Software" },
        { id: "warranty", name: "Warranty" },
        { id: "bestFor", name: "Best For" },
      ],
    },
    {
      id: "performance",
      name: "Performance",
      columns: [
        { id: "workArea", name: "Work Area (mm)" },
        { id: "height", name: "Height (mm)" },
        { id: "machineSize", name: "Machine Size (mm)" },
        { id: "speed", name: "Speed (mm/s)" },
        { id: "acceleration", name: "Acceleration" },
        { id: "laserFrequency", name: "Frequency" },
        { id: "pulseWidth", name: "Pulse Width" },
      ],
    },
    {
      id: "features",
      name: "Features",
      columns: [
        { id: "focus", name: "Focus" },
        { id: "enclosure", name: "Enclosure" },
        { id: "wifi", name: "WiFi" },
        { id: "camera", name: "Camera" },
        { id: "passthrough", name: "Passthrough" },
        { id: "controller", name: "Controller" },
      ],
    },
  ]

  // Create a flat list of all columns
  const allColumns = useMemo(() => 
    columnGroups.flatMap(group => group.columns),
    [columnGroups]
  )

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId],
    }))
  }

  // Helper function to render cell content based on data type
  const renderCellContent = (value: any, fieldName: string) => {
    if (fieldName === "price" && typeof value === "number") {
      return `$${value.toLocaleString()}`
    }

    if (fieldName === "workArea" && typeof value === "string") {
      // Format work area to always be WxH format (remove third dimension if present)
      // First remove ALL "mm" instances from the string
      const withoutUnits = value.replace(/mm/g, "");
      // Then normalize separators (convert * to x)
      const normalizedValue = withoutUnits.replace(/\*/g, "x");
      // Then handle the format to ensure it's only WxH
      const dimensions = normalizedValue.split(/[x×]/);
      if (dimensions.length >= 2) {
        return `${dimensions[0]}x${dimensions[1]}`;
      }
      return normalizedValue;
    }

    if ((fieldName === "machineSize" || fieldName === "height") && typeof value === "string") {
      // Remove ALL "mm" instances from machine size values
      const withoutUnits = value.replace(/mm/g, "");
      // Convert * to x for consistent formatting
      return withoutUnits.replace(/\*/g, "x");
    }

    if (fieldName === "speed" && value !== undefined && value !== null) {
      // Remove "mm/s" from speed values
      if (typeof value === "string") {
        return value.replace(/ mm\/s$/, "");
      }
      return value;
    }

    if (fieldName === "laserPowerA" && value !== undefined && value !== null) {
      // Remove "W" from power values if present
      if (typeof value === "string") {
        return value.replace(/ W$/, "");
      }
      return value;
    }

    if (fieldName === "rating" && typeof value === "number") {
      return (
        <div className="flex items-center">
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

    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-4 w-4 text-green-600 mx-auto" />
      ) : (
        <X className="h-4 w-4 text-red-600 mx-auto" />
      )
    }

    return value || "—"
  }

  // Define the columns for the table
  const columns = useMemo<ColumnDef<Machine>[]>(
    () => [
      // Machine Column (always visible and sticky)
      {
        id: "machine",
        accessorFn: (row) => row["Machine Name"],
        header: "Machine",
        cell: ({ row }) => {
          const machine = row.original
          return (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 relative flex-shrink-0">
                <Image
                  src={machine["Image"] || "/placeholder.svg?height=32&width=32"}
                  alt={machine["Machine Name"] || `Machine ${machine.id || "image"}`}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/products/${machine["Internal link"]}`}
                    className="font-medium text-primary hover:underline text-sm truncate"
                  >
                    {machine["Machine Name"]}
                  </Link>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                </div>
                {machine["Award"] && (
                  <div className="text-xs bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded inline-block mt-0.5">
                    {machine["Award"]}
                  </div>
                )}
              </div>
            </div>
          )
        },
      },
      // Company/Brand
      {
        id: "company",
        accessorFn: (row) => row["Company"],
        header: "Brand",
        cell: ({ row }) => renderCellContent(row.original["Company"], "company"),
      },
      // Laser Type
      {
        id: "laserTypeA",
        accessorFn: (row) => row["Laser Type A"],
        header: "Laser Type",
        cell: ({ row }) => renderCellContent(row.original["Laser Type A"], "laserTypeA"),
      },
      // Laser Power
      {
        id: "laserPowerA",
        accessorFn: (row) => row["Laser Power A"],
        header: "Power (W)",
        cell: ({ row }) => renderCellContent(row.original["Laser Power A"], "laserPowerA"),
      },
      // Price
      {
        id: "price",
        accessorFn: (row) => row["Price"],
        header: "Price",
        cell: ({ row }) => renderCellContent(row.original["Price"], "price"),
      },
      // Work Area
      {
        id: "workArea",
        accessorFn: (row) => row["Work Area"],
        header: "Work Area (mm)",
        cell: ({ row }) => renderCellContent(row.original["Work Area"], "workArea"),
      },
      // Height
      {
        id: "height",
        accessorFn: (row) => row["Height"],
        header: "Height (mm)",
        cell: ({ row }) => renderCellContent(row.original["Height"], "height"),
      },
      // Machine Size
      {
        id: "machineSize",
        accessorFn: (row) => row["Machine Size"],
        header: "Machine Size (mm)",
        cell: ({ row }) => renderCellContent(row.original["Machine Size"], "machineSize"),
      },
      // Speed
      {
        id: "speed",
        accessorFn: (row) => row["Speed"],
        header: "Speed (mm/s)",
        cell: ({ row }) => renderCellContent(row.original["Speed"], "speed"),
      },
      // Acceleration
      {
        id: "acceleration",
        accessorFn: (row) => row["Acceleration"],
        header: "Acceleration",
        cell: ({ row }) => renderCellContent(row.original["Acceleration"], "acceleration"),
      },
      // Laser Frequency
      {
        id: "laserFrequency",
        accessorFn: (row) => row["Laser Frequency"],
        header: "Frequency",
        cell: ({ row }) => renderCellContent(row.original["Laser Frequency"], "laserFrequency"),
      },
      // Pulse Width
      {
        id: "pulseWidth",
        accessorFn: (row) => row["Pulse Width"],
        header: "Pulse Width",
        cell: ({ row }) => renderCellContent(row.original["Pulse Width"], "pulseWidth"),
      },
      // Focus
      {
        id: "focus",
        accessorFn: (row) => row["Focus"],
        header: "Focus",
        cell: ({ row }) => renderCellContent(row.original["Focus"], "focus"),
      },
      // Enclosure
      {
        id: "enclosure",
        accessorFn: (row) => row["Enclosure"],
        header: "Enclosure",
        cell: ({ row }) => renderCellContent(row.original["Enclosure"], "enclosure"),
      },
      // WiFi
      {
        id: "wifi",
        accessorFn: (row) => row["Wifi"],
        header: "WiFi",
        cell: ({ row }) => renderCellContent(row.original["Wifi"], "wifi"),
      },
      // Camera
      {
        id: "camera",
        accessorFn: (row) => row["Camera"],
        header: "Camera",
        cell: ({ row }) => renderCellContent(row.original["Camera"], "camera"),
      },
      // Passthrough
      {
        id: "passthrough",
        accessorFn: (row) => row["Passthrough"],
        header: "Passthrough",
        cell: ({ row }) => renderCellContent(row.original["Passthrough"], "passthrough"),
      },
      // Controller
      {
        id: "controller",
        accessorFn: (row) => row["Controller"],
        header: "Controller",
        cell: ({ row }) => renderCellContent(row.original["Controller"], "controller"),
      },
      // Software
      {
        id: "software",
        accessorFn: (row) => row["Software"],
        header: "Software",
        cell: ({ row }) => renderCellContent(row.original["Software"], "software"),
      },
      // Warranty
      {
        id: "warranty",
        accessorFn: (row) => row["Warranty"],
        header: "Warranty",
        cell: ({ row }) => renderCellContent(row.original["Warranty"], "warranty"),
      },
      // Laser Source Manufacturer
      {
        id: "laserSourceManufacturer",
        accessorFn: (row) => row["Laser Source Manufacturer"],
        header: "Laser Source",
        cell: ({ row }) => renderCellContent(row.original["Laser Source Manufacturer"], "laserSourceManufacturer"),
      },
      // Best For
      {
        id: "bestFor",
        accessorFn: (row) => row["Best for:"],
        header: "Best For",
        cell: ({ row }) => renderCellContent(row.original["Best for:"], "bestFor"),
      },
      // Rating
      {
        id: "rating",
        accessorFn: (row) => row["Rating"],
        header: "Rating",
        cell: ({ row }) => renderCellContent(row.original["Rating"], "rating"),
      },
      // Compare/Actions Column
      {
        id: "actions",
        header: "Compare",
        cell: ({ row }) => {
          const machine = row.original
          const selected = isSelected(machine.id)
          
          return (
            <div className="text-center">
              <Button
                size="sm"
                className={`${selected ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-gray-100'} rounded-md shadow-sm text-xs font-medium h-8 flex items-center px-3 mx-auto`}
                onClick={() => selected ? removeFromComparison(machine.id) : addToComparison(machine)}
              >
                {selected ? <Check className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {selected ? 'Selected' : 'Compare'}
              </Button>
            </div>
          )
        },
      },
    ],
    [isSelected, addToComparison, removeFromComparison]
  )

  // Get only the visible columns based on columnVisibility state
  const visibleColumns = useMemo(() => {
    return columns.filter(col => {
      if (col.id === "machine") return true; // Always show machine column
      return col.id ? columnVisibility[col.id] : true;
    });
  }, [columns, columnVisibility]);

  return (
    <div className="space-y-2">
      {/* Column visibility dropdown positioned outside scrollable area */}
      <div className="flex justify-end sticky top-0 z-30 bg-white pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {columnGroups.map((group) => (
              <div key={group.id}>
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  {group.name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {group.columns.map((column) => (
                    <DropdownMenuItem
                      key={column.id}
                      className="flex items-center justify-between cursor-pointer text-sm py-1.5"
                      onClick={() => toggleColumn(column.id)}
                    >
                      {column.name}
                      {columnVisibility[column.id] && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data table with proper scrolling */}
      <div className="w-full overflow-hidden">
        <DataTable
          columns={visibleColumns}
          data={machines}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      </div>
    </div>
  )
} 