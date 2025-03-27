"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet"
import { Button } from "./ui/button"
import { SlidersHorizontal } from "lucide-react"
import { Separator } from "./ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
import { Slider } from "./ui/slider"

interface MobileFiltersProps {
  categories: any[]
  brands: any[]
  onApplyFilters: (filters: any) => void
  activeFilters: {
    laserTypes: string[]
    brands: string[]
    priceRange: [number, number]
    powerRange: [number, number]
    speedRange: [number, number]
    features: string[]
    minRating: number
  }
  onSortChange: (sort: string) => void
  activeSort: string
}

export default function MobileFilters({
  categories,
  brands,
  onApplyFilters,
  activeFilters,
  onSortChange,
  activeSort,
}: MobileFiltersProps) {
  const [localFilters, setLocalFilters] = useState(activeFilters)

  const handleFilterChange = (key: string, value: any) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleApply = () => {
    onApplyFilters(localFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      laserTypes: [] as string[],
      brands: [] as string[],
      priceRange: [0, 35000] as [number, number],
      powerRange: [0, 150] as [number, number],
      speedRange: [0, 2000] as [number, number],
      features: [] as string[],
      minRating: 0,
    }
    setLocalFilters(resetFilters)
    onApplyFilters(resetFilters)
  }

  return (
    <div className="flex gap-2">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="py-4 flex flex-col gap-6">
            {/* Categories */}
            <div className="space-y-4">
              <h3 className="font-medium">Categories</h3>
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={localFilters.laserTypes.includes(category.name)}
                    onCheckedChange={(checked) => {
                      handleFilterChange(
                        "laserTypes",
                        checked
                          ? [...localFilters.laserTypes, category.name]
                          : localFilters.laserTypes.filter((t) => t !== category.name)
                      )
                    }}
                  />
                  <Label htmlFor={`category-${category.id}`}>{category.name}</Label>
                </div>
              ))}
            </div>

            <Separator />

            {/* Brands */}
            <div className="space-y-4">
              <h3 className="font-medium">Brands</h3>
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand.id}`}
                    checked={localFilters.brands.includes(brand.name)}
                    onCheckedChange={(checked) => {
                      handleFilterChange(
                        "brands",
                        checked
                          ? [...localFilters.brands, brand.name]
                          : localFilters.brands.filter((b) => b !== brand.name)
                      )
                    }}
                  />
                  <Label htmlFor={`brand-${brand.id}`}>{brand.name}</Label>
                </div>
              ))}
            </div>

            <Separator />

            {/* Price Range */}
            <div className="space-y-4">
              <h3 className="font-medium">Price Range</h3>
              <Slider
                min={0}
                max={35000}
                step={100}
                value={localFilters.priceRange}
                onValueChange={(value) => handleFilterChange("priceRange", value)}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>${localFilters.priceRange[0]}</span>
                <span>${localFilters.priceRange[1]}</span>
              </div>
            </div>

            <Separator />

            {/* Power Range */}
            <div className="space-y-4">
              <h3 className="font-medium">Power Range (W)</h3>
              <Slider
                min={0}
                max={150}
                step={1}
                value={localFilters.powerRange}
                onValueChange={(value) => handleFilterChange("powerRange", value)}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{localFilters.powerRange[0]}W</span>
                <span>{localFilters.powerRange[1]}W</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Reset
              </Button>
              <Button onClick={handleApply} className="flex-1">
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sort Dropdown */}
      <Select value={activeSort} onValueChange={onSortChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="price-asc">Price: Low to High</SelectItem>
          <SelectItem value="price-desc">Price: High to Low</SelectItem>
          <SelectItem value="rating-desc">Highest Rated</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
} 