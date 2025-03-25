"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  OnChangeFn,
} from "@tanstack/react-table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
}

export function DataTable<TData, TValue>({
  columns,
  data,
  columnVisibility,
  onColumnVisibilityChange,
}: DataTableProps<TData, TValue>) {
  const tableRef = React.useRef<HTMLDivElement>(null);
  
  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility: columnVisibility,
    },
    onColumnVisibilityChange: onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
  })

  // Calculate a minimum width based on the number of visible columns
  // First column at 220px + each additional column at 140px
  const visibleColumnCount = Object.values(columnVisibility || {}).filter(Boolean).length || columns.length
  const minTableWidth = 220 + ((visibleColumnCount - 1) * 140)

  return (
    <div className="rounded-md">
      {/* Custom horizontal scrollable container - bypass ShadCN's built-in scrolling */}
      <div 
        ref={tableRef}
        className="overflow-x-auto"
      >
        {/* Force table to be wider than container to trigger scrolling */}
        <table 
          className="w-full border-collapse" 
          style={{ 
            minWidth: `${minTableWidth}px`,
          }}
        >
          <thead className="bg-white sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header, index) => {
                  // Determine if this is the first column to apply sticky styling
                  const isFirstColumn = index === 0;
                  
                  return (
                    <th
                      key={header.id}
                      className={`p-2 px-3 text-left font-medium text-sm whitespace-nowrap ${
                        isFirstColumn 
                          ? "sticky left-0 z-20 bg-white min-w-[220px] w-[220px] shadow-[2px_0px_5px_0px_rgba(0,0,0,0.05)]" 
                          : "min-w-[120px] w-[140px]"
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={`border-b hover:bg-muted/10 ${rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    // Again, apply sticky styling for the first column in each row
                    const isFirstColumn = cellIndex === 0;
                    
                    return (
                      <td
                        key={cell.id}
                        className={`p-2 px-3 text-sm ${
                          isFirstColumn 
                            ? `sticky left-0 z-10 ${rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"} shadow-[2px_0px_5px_0px_rgba(0,0,0,0.05)]` 
                            : "border-r last:border-r-0"
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 