"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  getFilteredRowModel,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Search, X, SlidersHorizontal } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Interface for filter options
export interface FilterOption {
  label: string
  value: string
}

// Interface for filterable columns
export interface FilterableColumn {
  id: string
  title: string
  options: FilterOption[]
}

// Interface for searchable columns
export interface SearchableColumn {
  id: string
  title: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterableColumns?: FilterableColumn[]
  searchableColumns?: SearchableColumn[]
  initialColumnVisibility?: VisibilityState
  onTableReady?: (table: any) => void
}

export function DataTable<TData, TValue>({ 
  columns, 
  data, 
  filterableColumns = [],
  searchableColumns = [],
  initialColumnVisibility,
  onTableReady,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility || {})
  const [activeFilters, setActiveFilters] = useState<{[key: string]: string[]}>({})
  
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Use initialColumnVisibility on first render if provided
  useEffect(() => {
    if (initialColumnVisibility && Object.keys(initialColumnVisibility).length > 0) {
      setColumnVisibility(initialColumnVisibility)
    }
  }, [initialColumnVisibility])


  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility,
    },
  })

  // Call onTableReady when table is created
  useEffect(() => {
    if (onTableReady) {
      onTableReady(table)
    }
  }, [table, onTableReady])

  // Apply active filters to column filters
  useEffect(() => {
    Object.entries(activeFilters).forEach(([columnId, values]) => {
      if (values.length > 0) {
        table.getColumn(columnId)?.setFilterValue(values)
      } else {
        table.getColumn(columnId)?.setFilterValue(undefined)
      }
    })
  }, [activeFilters, table])

  // Update pagination when items per page changes
  useEffect(() => {
    table.setPageSize(itemsPerPage)
  }, [itemsPerPage, table])

  // Handle filter changes
  const handleFilterChange = (columnId: string, value: string, checked: boolean) => {
    setActiveFilters(prev => {
      const currentFilters = prev[columnId] || []
      
      if (checked) {
        return {
          ...prev,
          [columnId]: [...currentFilters, value]
        }
      } else {
        return {
          ...prev,
          [columnId]: currentFilters.filter(v => v !== value)
        }
      }
    })
  }

  // Clear filter for a specific column
  const clearColumnFilter = (columnId: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [columnId]: []
    }))
  }

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({})
    setGlobalFilter("")
  }

  // Function to get the number of active filters
  const getActiveFilterCount = () => {
    let count = 0
    
    if (globalFilter) count++
    
    Object.values(activeFilters).forEach(values => {
      count += values.length
    })
    
    return count
  }
  
  const activeFilterCount = getActiveFilterCount()

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div className="flex flex-1 items-center relative min-w-0 max-w-full md:max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              searchableColumns.length > 0 
                ? `Search ${searchableColumns.map(col => col.title).join(", ")}...` 
                : "Search..."
            }
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 w-full"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              onClick={() => setGlobalFilter("")}
              className="absolute right-0 top-0 h-9 w-9 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-2">
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(value)}
                    >
                      {column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {filterableColumns.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-dashed">
                  <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 bg-primary text-primary-foreground" variant="default">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0 max-h-[calc(100vh-120px)] overflow-auto" align="end">
                <div className="p-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Filters</span>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      onClick={clearAllFilters}
                      className="h-8 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <Separator />
                {filterableColumns.map((column) => (
                  <div key={column.id} className="p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{column.title}</span>
                      {activeFilters[column.id]?.length > 0 && (
                        <Button
                          variant="ghost"
                          onClick={() => clearColumnFilter(column.id)}
                          className="h-8 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-1.5 mt-2">
                      {column.options.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${column.id}-${option.value}`}
                            checked={activeFilters[column.id]?.includes(option.value) || false}
                            onCheckedChange={(checked) =>
                              handleFilterChange(column.id, option.value, checked === true)
                            }
                          />
                          <Label
                            htmlFor={`filter-${column.id}-${option.value}`}
                            className="text-sm font-normal"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="[&>td]:py-2 [&>td]:px-3"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 mt-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${itemsPerPage}`}
              onValueChange={(value) => {
                setItemsPerPage(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

