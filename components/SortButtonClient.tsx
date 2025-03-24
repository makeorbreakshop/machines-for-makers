"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SortButtonClientProps {
  className?: string
}

export default function SortButtonClient({ className }: SortButtonClientProps) {
  const [sortOption, setSortOption] = useState("newest")

  const handleSortChange = (option: string) => {
    setSortOption(option)
    // In server component context, this doesn't need to do anything
    console.log("Sort changed to:", option)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Sort
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSortChange("newest")}>
          Newest First
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSortChange("price-asc")}>
          Price: Low to High
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSortChange("price-desc")}>
          Price: High to Low
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSortChange("rating-desc")}>
          Highest Rated
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 