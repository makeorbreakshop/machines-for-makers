"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Copy, Eye, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import { format } from "date-fns"
import { deleteMachine } from "@/lib/services/machine-service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

// Enhanced table data type with additional fields
export interface TableMachine {
  id: string
  machine_name: string
  company: string | null
  machine_category: string | null
  price: number | null
  rating: number | null
  published_at: string | null
  image: string | null
  work_area: string | null
  favorited: number | null
  award: string | null
  speed_category: string | null
  updated_at: string
  // Additional machine features
  laser_type: string | null
  laser_power: string | null
  height: string | null
  machine_size: string | null
  speed: string | null
  acceleration: string | null
  software: string | null
  focus: string | null
  enclosure: string | null
  wifi: string | null
  camera: string | null
  passthrough: string | null
  controller: string | null
  warranty: string | null
}

// Define columns for the machines table with enhanced features
const columns: ColumnDef<TableMachine>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40, // Set fixed width for select column
  },
  {
    accessorKey: "machine_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="pl-0"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const machine = row.original
      const imageUrl = machine.image || "/placeholder-machine.png"
      
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 relative rounded-md overflow-hidden border shrink-0">
            {machine.image && (
              <Image 
                src={imageUrl} 
                alt={machine.machine_name} 
                fill 
                className="object-cover"
                sizes="40px"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium flex items-center truncate">
              <Link href={`/admin/machines/${machine.id}`} className="hover:underline truncate">
                {machine.machine_name}
              </Link>
              {machine.award && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="ml-1 shrink-0">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Award: {machine.award}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {machine.work_area && (
              <div className="text-xs text-muted-foreground truncate">
                Work area: {machine.work_area}
              </div>
            )}
          </div>
        </div>
      )
    },
    size: 220, // Set reasonable width for machine name
  },
  {
    accessorKey: "company",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Brand
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "machine_category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const category = row.getValue("machine_category") as string
      return category ? (
        <Badge variant="outline">{category}</Badge>
      ) : null
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "work_area",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Work Area
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const workArea = row.getValue("work_area") as string
      return workArea || "N/A"
    },
  },
  {
    accessorKey: "speed_category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Speed
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const speed = row.getValue("speed_category") as string
      return speed || "N/A"
    },
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const price = row.getValue("price") as number
      const formatted = price ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(price) : "N/A"
      
      return (
        <div className="font-medium">
          {formatted}
        </div>
      )
    },
  },
  {
    accessorKey: "favorited",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Favorites
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const favorites = row.getValue("favorited") as number
      return (
        <div className="font-medium text-center">
          {favorites || 0}
        </div>
      )
    },
  },
  {
    accessorKey: "rating",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rating
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const rating = row.getValue("rating") as number
      
      return (
        <div className="font-medium flex items-center justify-center">
          {rating ? rating.toFixed(1) : "N/A"}
          {rating ? (
            <Star className="h-4 w-4 ml-1 text-yellow-400 fill-yellow-400" />
          ) : null}
        </div>
      )
    },
  },
  {
    accessorKey: "published_at",
    header: "Status",
    cell: ({ row }) => {
      const published = row.original.published_at
      const updated = row.original.updated_at

      return (
        <div>
          <Badge
            variant={published ? "success" : "secondary"}
            className={published ? "" : ""}
          >
            {published ? "Published" : "Draft"}
          </Badge>
          {updated && (
            <div className="text-xs text-muted-foreground mt-1">
              Updated: {format(new Date(updated), "MMM d, yyyy")}
            </div>
          )}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const machine = row.original

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/admin/machines/${machine.id}`} className="cursor-pointer flex items-center">
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/machines/${machine.id}`} className="cursor-pointer flex items-center" target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  <span>View</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center">
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer flex items-center text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    size: 50, // Set fixed width for actions column
  },
  // Adding additional machine feature columns (hidden by default)
  {
    accessorKey: "laser_type",
    header: "Laser Type",
    enableHiding: true,
    cell: ({ row }) => row.getValue("laser_type") || "N/A",
  },
  {
    accessorKey: "laser_power",
    header: "Laser Power",
    enableHiding: true,
    cell: ({ row }) => row.getValue("laser_power") || "N/A",
  },
  {
    accessorKey: "height",
    header: "Height",
    enableHiding: true,
    cell: ({ row }) => row.getValue("height") || "N/A",
  },
  {
    accessorKey: "machine_size",
    header: "Machine Size",
    enableHiding: true,
    cell: ({ row }) => row.getValue("machine_size") || "N/A",
  },
  {
    accessorKey: "speed",
    header: "Speed",
    enableHiding: true,
    cell: ({ row }) => row.getValue("speed") || "N/A",
  },
  {
    accessorKey: "acceleration",
    header: "Acceleration",
    enableHiding: true,
    cell: ({ row }) => row.getValue("acceleration") || "N/A",
  },
  {
    accessorKey: "software",
    header: "Software",
    enableHiding: true,
    cell: ({ row }) => row.getValue("software") || "N/A",
  },
  {
    accessorKey: "focus",
    header: "Focus",
    enableHiding: true,
    cell: ({ row }) => row.getValue("focus") || "N/A",
  },
  {
    accessorKey: "enclosure",
    header: "Enclosure",
    enableHiding: true,
    cell: ({ row }) => row.getValue("enclosure") || "N/A",
  },
  {
    accessorKey: "wifi",
    header: "WiFi",
    enableHiding: true,
    cell: ({ row }) => {
      const wifi = row.getValue("wifi")
      return wifi ? "Yes" : "No"
    },
  },
  {
    accessorKey: "camera",
    header: "Camera",
    enableHiding: true,
    cell: ({ row }) => {
      const camera = row.getValue("camera")
      return camera ? "Yes" : "No"
    },
  },
  {
    accessorKey: "passthrough",
    header: "Passthrough",
    enableHiding: true,
    cell: ({ row }) => row.getValue("passthrough") || "N/A",
  },
  {
    accessorKey: "controller",
    header: "Controller",
    enableHiding: true,
    cell: ({ row }) => row.getValue("controller") || "N/A",
  },
  {
    accessorKey: "warranty",
    header: "Warranty",
    enableHiding: true,
    cell: ({ row }) => row.getValue("warranty") || "N/A",
  },
]

// Define category filter options based on machine data
const getCategoryFilterOptions = (data: TableMachine[]) => {
  const categories = new Set<string>()
  
  data.forEach(machine => {
    if (machine.machine_category) {
      categories.add(machine.machine_category)
    }
  })
  
  return Array.from(categories).map(category => ({
    label: category,
    value: category,
  }))
}

// Define brand filter options based on machine data
const getBrandFilterOptions = (data: TableMachine[]) => {
  const brands = new Set<string>()
  
  data.forEach(machine => {
    if (machine.company) {
      brands.add(machine.company)
    }
  })
  
  return Array.from(brands).map(brand => ({
    label: brand,
    value: brand,
  }))
}

export function MachinesTable({ data }: { data: TableMachine[] }) {
  const router = useRouter()
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null)
  const [isBulkDelete, setIsBulkDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  
  // Generate filter options from data
  const categoryFilters = getCategoryFilterOptions(data)
  const brandFilters = getBrandFilterOptions(data)

  // Handler for opening delete confirmation for a single machine
  const handleDeleteClick = (machineId: string) => {
    setMachineToDelete(machineId)
    setIsBulkDelete(false)
    setIsDeleteDialogOpen(true)
  }

  // Handler for opening delete confirmation for multiple machines
  const handleBulkDeleteClick = () => {
    setIsBulkDelete(true)
    setIsDeleteDialogOpen(true)
  }

  // Perform the actual deletion
  const performDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    
    try {
      if (isBulkDelete) {
        // Delete all selected machines
        const results = await Promise.allSettled(
          selectedMachines.map(id => deleteMachine(id))
        )
        
        // Check for any errors
        const errors = results.filter(result => result.status === 'rejected')
        if (errors.length > 0) {
          setDeleteError(`Failed to delete ${errors.length} machines`)
        }
      } else if (machineToDelete) {
        // Delete a single machine
        await deleteMachine(machineToDelete)
      }
      
      // Close dialog and refresh data
      setIsDeleteDialogOpen(false)
      setMachineToDelete(null)
      setSelectedMachines([])
      
      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error("Error deleting machine(s):", error)
      setDeleteError(error instanceof Error ? error.message : "Failed to delete machine(s)")
    } finally {
      setIsDeleting(false)
    }
  }

  // Get machine name for confirmation dialog
  const getMachineNameById = (id: string) => {
    const machine = data.find(m => m.id === id)
    return machine ? machine.machine_name : "Unknown Machine"
  }
  
  // Modify the column definition for actions
  const actionsColumn: ColumnDef<TableMachine> = {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const machine = row.original

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/admin/machines/${machine.id}`} className="cursor-pointer flex items-center">
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/machines/${machine.id}`} className="cursor-pointer flex items-center" target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  <span>View</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer flex items-center">
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer flex items-center text-red-600 focus:text-red-600"
                onClick={() => handleDeleteClick(machine.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    size: 50, // Set fixed width for actions column
  }

  // Replace the actions column in the columns array
  const updatedColumns = columns.map(col => 
    col.id === "actions" ? actionsColumn : col
  )
  
  return (
    <div>
      {selectedMachines.length > 0 && (
        <div className="bg-muted/50 p-2 mb-4 rounded flex items-center justify-between">
          <span className="text-sm">
            {selectedMachines.length} {selectedMachines.length === 1 ? 'machine' : 'machines'} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Copy className="h-3.5 w-3.5 mr-1" />
              Duplicate
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleBulkDeleteClick}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}
      
      <DataTable 
        columns={updatedColumns} 
        data={data}
        filterableColumns={[
          {
            id: "machine_category",
            title: "Category",
            options: categoryFilters,
          },
          {
            id: "company",
            title: "Brand",
            options: brandFilters,
          },
        ]}
        searchableColumns={[
          {
            id: "machine_name",
            title: "name",
          },
        ]}
        onRowSelectionChange={setSelectedMachines}
        initialColumnVisibility={{
          // Hide feature columns by default
          laser_type: false,
          laser_power: false,
          height: false,
          machine_size: false,
          speed: false,
          acceleration: false,
          software: false,
          focus: false,
          enclosure: false,
          wifi: false,
          camera: false,
          passthrough: false,
          controller: false,
          warranty: false,
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBulkDelete 
                ? `Delete ${selectedMachines.length} machines?` 
                : `Delete ${getMachineNameById(machineToDelete || '')}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              {isBulkDelete 
                ? ` selected machines` 
                : ` machine`} 
              from the database.
              {deleteError && (
                <div className="mt-2 text-red-600 font-medium">{deleteError}</div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                performDelete()
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 