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
import { ArrowUpDown, Copy, Eye, MoreHorizontal, Pencil, Star, Trash2, ChevronDown, X } from "lucide-react"
import { useState, useCallback, useRef, useEffect } from "react"
import { usePersistentFilters } from "@/lib/hooks/use-persistent-filters"
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
      const imageUrl = machine.image || "/placeholder.svg?height=200&width=200"
      
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
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
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
          {published && (
            <div className="text-xs text-muted-foreground mt-1">
              Published: {format(new Date(published), "MMM d, yyyy")}
            </div>
          )}
          {!published && updated && (
            <div className="text-xs text-muted-foreground mt-1">
              Updated: {format(new Date(updated), "MMM d, yyyy")}
            </div>
          )}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const publishedA = rowA.original.published_at
      const publishedB = rowB.original.published_at
      
      // Handle null values (drafts) - put them at the end
      if (!publishedA && !publishedB) return 0
      if (!publishedA) return 1
      if (!publishedB) return -1
      
      // Sort by published date
      return new Date(publishedA).getTime() - new Date(publishedB).getTime()
    },
    filterFn: (row, id, value) => {
      const published = row.original.published_at
      const status = published ? "Published" : "Draft"
      return value.includes(status)
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
              <DropdownMenuItem 
                className="cursor-pointer flex items-center"
                onClick={() => handleDuplicateClick(machine.id)}
              >
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

// Define status filter options for published/draft
const getStatusFilterOptions = () => {
  return [
    { label: "Published", value: "Published" },
    { label: "Draft", value: "Draft" },
  ]
}

export function MachinesTable({ data }: { data: TableMachine[] }) {
  const router = useRouter()
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null)
  const [isBulkDelete, setIsBulkDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [tableInstance, setTableInstance] = useState<any>(null)
  
  // Persistent filter states
  const {
    categoryFilter,
    brandFilter, 
    statusFilter,
    setCategoryFilter,
    setBrandFilter,
    setStatusFilter,
    clearAllFilters,
    hasFilters,
    isInitialized
  } = usePersistentFilters()
  
  // Filter the data based on active filters
  const filteredData = data.filter(machine => {
    // Category filter
    if (categoryFilter.length > 0 && !categoryFilter.includes(machine.machine_category || '')) {
      return false
    }
    
    // Brand filter
    if (brandFilter.length > 0 && !brandFilter.includes(machine.company || '')) {
      return false
    }
    
    // Status filter
    if (statusFilter.length > 0) {
      const status = machine.published_at ? "Published" : "Draft"
      if (!statusFilter.includes(status)) {
        return false
      }
    }
    
    return true
  })
  
  // Generate filter options from data
  const categoryFilters = getCategoryFilterOptions(data)
  const brandFilters = getBrandFilterOptions(data)
  const statusFilters = getStatusFilterOptions()

  // Handler for opening delete confirmation for a single machine
  const handleDeleteClick = (machineId: string) => {
    setMachineToDelete(machineId)
    setIsBulkDelete(false)
    setIsDeleteDialogOpen(true)
  }

  // Handler for opening delete confirmation for multiple machines
  const handleBulkDeleteClick = () => {
    setSelectedMachines(getSelectedMachines())
    setIsBulkDelete(true)
    setIsDeleteDialogOpen(true)
  }

  // Handler for duplicating a single machine
  const handleDuplicateClick = async (machineId: string) => {
    setIsDuplicating(true)
    try {
      await duplicateMachine(machineId)
      router.refresh()
    } catch (error) {
      console.error("Error duplicating machine:", error)
    } finally {
      setIsDuplicating(false)
    }
  }

  // Handler for bulk duplicating machines
  const handleBulkDuplicateClick = async () => {
    const selectedIds = getSelectedMachines()
    setIsDuplicating(true)
    try {
      await Promise.all(selectedIds.map(id => duplicateMachine(id)))
      router.refresh()
    } catch (error) {
      console.error("Error duplicating machines:", error)
    } finally {
      setIsDuplicating(false)
    }
  }

  // Function to duplicate a machine
  const duplicateMachine = async (machineId: string) => {
    const machine = data.find(m => m.id === machineId)
    if (!machine) throw new Error("Machine not found")

    // Create the duplicate data
    const duplicateData = {
      machine_name: `${machine.machine_name} (Copy)`,
      company: machine.company,
      machine_category: machine.machine_category,
      laser_category: machine.machine_category, // Assuming this maps to machine_category
      price: machine.price,
      rating: machine.rating,
      award: machine.award,
      laser_type_a: machine.laser_type,
      laser_power_a: machine.laser_power,
      work_area: machine.work_area,
      speed: machine.speed,
      height: machine.height,
      machine_size: machine.machine_size,
      acceleration: machine.acceleration,
      software: machine.software,
      focus: machine.focus,
      enclosure: machine.enclosure === "Yes",
      wifi: machine.wifi === "Yes",
      camera: machine.camera === "Yes",
      passthrough: machine.passthrough === "Yes",
      controller: machine.controller,
      warranty: machine.warranty,
      image_url: machine.image,
      is_featured: false, // Set to false for copies
      slug: `${machine.machine_name.toLowerCase().replace(/\s+/g, '-')}-copy-${Date.now()}`
    }

    // Call the API to create the duplicate
    const response = await fetch('/api/machines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateData),
    })

    if (!response.ok) {
      throw new Error('Failed to duplicate machine')
    }

    return response.json()
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
              <DropdownMenuItem 
                className="cursor-pointer flex items-center"
                onClick={() => handleDuplicateClick(machine.id)}
              >
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

  const handleTableReady = useCallback((table: any) => {
    setTableInstance(table)
  }, [])

  // Get selected machines from table instance
  const getSelectedMachines = () => {
    if (!tableInstance) return []
    const selectedRows = tableInstance.getSelectedRowModel().rows
    return selectedRows.map((row: any) => row.original.id)
  }
  
  return (
    <div>
      {getSelectedMachines().length > 0 && (
        <div className="bg-muted/50 p-2 mb-4 rounded flex items-center justify-between">
          <span className="text-sm">
            {getSelectedMachines().length} {getSelectedMachines().length === 1 ? 'machine' : 'machines'} selected
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBulkDuplicateClick}
              disabled={isDuplicating}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              {isDuplicating ? "Duplicating..." : "Duplicate"}
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
      
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex gap-2 flex-wrap">
        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={categoryFilter.length > 0 ? "default" : "outline"} 
              size="sm" 
              className="h-9"
            >
              Category
              {categoryFilter.length > 0 && (
                <Badge className="ml-2 bg-background text-foreground" variant="secondary">
                  {categoryFilter.length}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]" align="start">
            <DropdownMenuLabel className="flex items-center justify-between">
              Category
              {categoryFilter.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setCategoryFilter([])}
                  className="h-auto p-0 text-xs"
                >
                  Clear
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {categoryFilters.map((category) => (
              <DropdownMenuItem
                key={category.value}
                onClick={(e) => {
                  e.preventDefault()
                  setCategoryFilter(
                    categoryFilter.includes(category.value)
                      ? categoryFilter.filter((c: string) => c !== category.value)
                      : [...categoryFilter, category.value]
                  )
                }}
                className="cursor-pointer"
              >
                <Checkbox
                  checked={categoryFilter.includes(category.value)}
                  className="mr-2"
                />
                {category.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Brand Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={brandFilter.length > 0 ? "default" : "outline"} 
              size="sm" 
              className="h-9"
            >
              Brand
              {brandFilter.length > 0 && (
                <Badge className="ml-2 bg-background text-foreground" variant="secondary">
                  {brandFilter.length}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]" align="start">
            <DropdownMenuLabel className="flex items-center justify-between">
              Brand
              {brandFilter.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setBrandFilter([])}
                  className="h-auto p-0 text-xs"
                >
                  Clear
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {brandFilters.map((brand) => (
              <DropdownMenuItem
                key={brand.value}
                onClick={(e) => {
                  e.preventDefault()
                  setBrandFilter(
                    brandFilter.includes(brand.value)
                      ? brandFilter.filter((b: string) => b !== brand.value)
                      : [...brandFilter, brand.value]
                  )
                }}
                className="cursor-pointer"
              >
                <Checkbox
                  checked={brandFilter.includes(brand.value)}
                  className="mr-2"
                />
                {brand.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={statusFilter.length > 0 ? "default" : "outline"} 
              size="sm" 
              className="h-9"
            >
              Status
              {statusFilter.length > 0 && (
                <Badge className="ml-2 bg-background text-foreground" variant="secondary">
                  {statusFilter.length}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]" align="start">
            <DropdownMenuLabel className="flex items-center justify-between">
              Status
              {statusFilter.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setStatusFilter([])}
                  className="h-auto p-0 text-xs"
                >
                  Clear
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusFilters.map((status) => (
              <DropdownMenuItem
                key={status.value}
                onClick={(e) => {
                  e.preventDefault()
                  setStatusFilter(
                    statusFilter.includes(status.value)
                      ? statusFilter.filter((s: string) => s !== status.value)
                      : [...statusFilter, status.value]
                  )
                }}
                className="cursor-pointer"
              >
                <Checkbox
                  checked={statusFilter.includes(status.value)}
                  className="mr-2"
                />
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        
        {/* Clear Filters Button */}
        {hasFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="h-9 whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
      
      {/* Results Summary */}
      {isInitialized && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          {/* Active Filters Summary */}
          {hasFilters ? (
            <div className="flex flex-wrap gap-1 text-sm text-muted-foreground">
              <span>Active filters:</span>
              {categoryFilter.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {categoryFilter.length} categor{categoryFilter.length === 1 ? 'y' : 'ies'}
                </Badge>
              )}
              {brandFilter.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {brandFilter.length} brand{brandFilter.length === 1 ? '' : 's'}
                </Badge>
              )}
              {statusFilter.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {statusFilter.length} status{statusFilter.length === 1 ? '' : 'es'}
                </Badge>
              )}
            </div>
          ) : (
            <div></div>
          )}
          
          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredData.length} of {data.length} machines
          </div>
        </div>
      )}
      
      {/* Show loading state while filters are initializing */}
      {!isInitialized ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading filters...</div>
        </div>
      ) : (
        <DataTable 
          columns={updatedColumns} 
          data={filteredData}
        searchableColumns={[
          {
            id: "machine_name",
            title: "name",
          },
        ]}
        onTableReady={handleTableReady}
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
      )}

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