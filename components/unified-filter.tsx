import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Filter } from "lucide-react"
import SidebarFilter from "@/components/sidebar-filter"
import type { Category, Brand } from "@/lib/database-types"

interface UnifiedFilterProps {
  categories: Category[]
  brands: Brand[]
  onApplyFilters: (filters: any) => void
  initialFilters?: {
    laserTypes: string[]
    priceRange: [number, number]
    powerRange: [number, number]
    speedRange: [number, number]
    features: string[]
    isTopPick?: boolean
  }
  filteredCount?: number
}

export default function UnifiedFilter({
  categories,
  brands,
  onApplyFilters,
  initialFilters,
  filteredCount = 0,
}: UnifiedFilterProps) {
  // Calculate active filter count for the mobile button badge
  const activeFilterCount = (
    (initialFilters?.laserTypes?.length ?? 0) +
    ((initialFilters?.priceRange?.[0] ?? 0) > 0 || (initialFilters?.priceRange?.[1] ?? 15000) < 15000 ? 1 : 0) +
    ((initialFilters?.powerRange?.[0] ?? 0) > 0 || (initialFilters?.powerRange?.[1] ?? 150) < 150 ? 1 : 0) +
    ((initialFilters?.speedRange?.[0] ?? 0) > 0 || (initialFilters?.speedRange?.[1] ?? 2000) < 2000 ? 1 : 0) +
    (initialFilters?.features?.length ?? 0) +
    (initialFilters?.isTopPick ? 1 : 0)
  )

  return (
    <>
      {/* Desktop version - regular sidebar */}
      <div className="hidden md:block">
        <SidebarFilter
          categories={categories}
          brands={brands}
          onApplyFilters={onApplyFilters}
          initialFilters={initialFilters}
          filteredCount={filteredCount}
        />
      </div>

      {/* Mobile version - sheet with the same SidebarFilter component */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 rounded-full h-auto py-2 px-4 border-gray-300 hover:border-gray-400 bg-white shadow-sm"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5 ml-1">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:max-w-md p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <SheetTitle className="text-lg font-medium">Filters</SheetTitle>
            </SheetHeader>
            <div className="px-4 py-6 overflow-y-auto h-[calc(100vh-5rem)]">
              <SidebarFilter
                categories={categories}
                brands={brands}
                onApplyFilters={onApplyFilters}
                initialFilters={initialFilters}
                filteredCount={filteredCount}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
} 