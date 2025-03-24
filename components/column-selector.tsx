"use client"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ColumnSelectorProps {
  columnGroups: {
    id: string
    name: string
    columns: {
      id: string
      name: string
    }[]
  }[]
  visibleColumns: string[]
  onColumnToggle: (columnId: string) => void
}

export default function ColumnSelector({ columnGroups, visibleColumns, onColumnToggle }: ColumnSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          Columns <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {columnGroups.map((group) => (
          <div key={group.id}>
            <DropdownMenuLabel>{group.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {group.columns.map((column) => (
                <DropdownMenuItem
                  key={column.id}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => onColumnToggle(column.id)}
                >
                  {column.name}
                  {visibleColumns.includes(column.id) && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

