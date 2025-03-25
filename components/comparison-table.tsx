"use client"

import { useState } from "react"
import type { Machine } from "@/lib/database-types"
import { Button } from "@/components/ui/button"
import { Check, X, ExternalLink, SlidersHorizontal, Plus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useComparison } from "@/context/comparison-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ComparisonTableProps {
  machines: Machine[]
}

export default function ComparisonTable({ machines }: ComparisonTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "Company",
    "Laser Type A",
    "Laser Power A",
    "Price",
    "Work Area",
    "Speed",
    "Rating",
  ])
  
  const { addToComparison, removeFromComparison, isSelected } = useComparison()

  // Define column groups for the table
  const columnGroups = [
    {
      id: "general",
      name: "General",
      columns: [
        { id: "Company", name: "Brand" },
        { id: "Laser Type A", name: "Laser Type" },
        { id: "Laser Power A", name: "Power (W)" },
        { id: "Price", name: "Price" },
        { id: "Rating", name: "Rating" },
      ],
    },
    {
      id: "performance",
      name: "Performance",
      columns: [
        { id: "Work Area", name: "Work Area" },
        { id: "Speed", name: "Speed" },
        { id: "Acceleration", name: "Acceleration" },
        { id: "Laser Frequency", name: "Frequency" },
        { id: "Pulse Width", name: "Pulse Width" },
      ],
    },
    {
      id: "features",
      name: "Features",
      columns: [
        { id: "Focus", name: "Focus" },
        { id: "Enclosure", name: "Enclosure" },
        { id: "Wifi", name: "WiFi" },
        { id: "Camera", name: "Camera" },
        { id: "Passthrough", name: "Passthrough" },
        { id: "Controller", name: "Controller" },
      ],
    },
  ]

  const toggleColumn = (columnId: string) => {
    if (visibleColumns.includes(columnId)) {
      setVisibleColumns(visibleColumns.filter((id) => id !== columnId))
    } else {
      setVisibleColumns([...visibleColumns, columnId])
    }
  }

  // Helper function to render cell content based on column and machine
  const renderCell = (column: string, machine: Machine) => {
    const value = machine[column as keyof Machine]
    
    // Handle null/undefined values consistently
    if (value === null || value === undefined) {
      return "—"
    }

    if (column === "Price") {
      return typeof value === "number" ? `$${value.toLocaleString()}` : "—"
    }

    if (column === "Rating") {
      if (typeof value !== "number") return "—"
      
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

    return value
  }

  // Get all visible columns
  const allVisibleColumns = columnGroups.flatMap((group) =>
    group.columns.filter((column) => visibleColumns.includes(column.id)),
  )

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
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
                      {visibleColumns.includes(column.id) && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Improved scrolling container with shadow for visual separation */}
      <div className="border rounded-md relative">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full table-fixed border-collapse min-w-full">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                {/* Fixed machine column - enhanced stickiness */}
                <th className="sticky left-0 z-20 bg-muted/50 p-2 px-3 text-left font-medium text-sm whitespace-nowrap border-b border-r min-w-[220px] w-[220px] shadow-[2px_0px_5px_0px_rgba(0,0,0,0.05)]">
                  Machine
                </th>

                {/* Spec columns */}
                {allVisibleColumns.map((column) => (
                  <th
                    key={column.id}
                    className="bg-muted/50 p-2 px-3 text-left font-medium text-sm whitespace-nowrap border-b min-w-[120px] w-[140px]"
                  >
                    {column.name}
                  </th>
                ))}
                
                {/* Compare column */}
                <th className="bg-muted/50 p-2 px-3 text-center font-medium text-sm whitespace-nowrap border-b min-w-[100px] w-[100px]">
                  Compare
                </th>
              </tr>
            </thead>
            <tbody>
              {machines.map((machine, index) => {
                const selected = isSelected(machine.id)
                return (
                <tr key={machine.id} className={`hover:bg-muted/10 ${index % 2 === 0 ? "bg-white" : "bg-muted/5"}`}>
                  {/* Fixed machine column with improved stickiness */}
                  <td className={`sticky left-0 z-10 p-2 px-3 ${index % 2 === 0 ? "bg-white" : "bg-muted/5"} shadow-[2px_0px_5px_0px_rgba(0,0,0,0.05)]`}>
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
                  </td>

                  {/* Spec cells */}
                  {allVisibleColumns.map((column) => (
                    <td key={column.id} className="p-2 px-3 text-sm border-r last:border-r-0">
                      {renderCell(column.id, machine)}
                    </td>
                  ))}
                  
                  {/* Compare button */}
                  <td className="p-2 px-3 text-sm text-center">
                    <Button
                      size="sm"
                      className={`${selected ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-gray-100'} rounded-md shadow-sm text-xs font-medium h-8 flex items-center px-3 mx-auto`}
                      onClick={() => selected ? removeFromComparison(machine.id) : addToComparison(machine)}
                    >
                      {selected ? <Check className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                      {selected ? 'Selected' : 'Compare'}
                    </Button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

