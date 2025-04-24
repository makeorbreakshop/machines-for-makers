"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Filter, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

interface PriceHistoryFiltersProps {
  filters: {
    status: string[];
    batchId: string | null;
    startDate: Date | null;
    endDate: Date | null;
    search: string;
    machineName: string;
    brand: string;
    minPriceChange: number | null;
    maxPriceChange: number | null;
    extractionMethod: string[];
    confidence: number | null;
  };
  onFilterChange: (filters: any) => void;
  onSavePreset?: () => void;
}

export function PriceHistoryFilters({ 
  filters, 
  onFilterChange,
  onSavePreset
}: PriceHistoryFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Toggle status filter
  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    
    onFilterChange({ status: newStatus });
  }
  
  // Clear all filters
  const clearFilters = () => {
    onFilterChange({
      status: [],
      batchId: null,
      startDate: null,
      endDate: null,
      search: "",
      machineName: "",
      brand: "",
      minPriceChange: null,
      maxPriceChange: null,
      extractionMethod: [],
      confidence: null
    });
  }
  
  // Format filter counts for display
  const getActiveFilterCount = () => {
    let count = 0;
    
    if (filters.status.length > 0) count++;
    if (filters.search) count++;
    if (filters.machineName) count++;
    if (filters.brand) count++;
    if (filters.minPriceChange !== null) count++;
    if (filters.maxPriceChange !== null) count++;
    if (filters.extractionMethod.length > 0) count++;
    if (filters.confidence !== null) count++;
    if (filters.startDate !== null && filters.endDate !== null) count++;
    
    return count;
  }
  
  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {getActiveFilterCount() > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFilters}
            >
              Clear All
            </Button>
          )}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Advanced Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Confidence</h4>
                  <Select
                    value={filters.confidence?.toString() || ""}
                    onValueChange={(value) => {
                      onFilterChange({ 
                        confidence: value ? parseFloat(value) : null 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any confidence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any confidence</SelectItem>
                      <SelectItem value="0.95">High (95%+)</SelectItem>
                      <SelectItem value="0.85">Medium (85%+)</SelectItem>
                      <SelectItem value="0.75">Low (75%+)</SelectItem>
                      <SelectItem value="0.5">Very Low (50%+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Price Change</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="minPriceChange">Min %</Label>
                      <Input
                        id="minPriceChange"
                        type="number"
                        placeholder="Min %"
                        value={filters.minPriceChange?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          onFilterChange({ minPriceChange: value });
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPriceChange">Max %</Label>
                      <Input
                        id="maxPriceChange"
                        type="number"
                        placeholder="Max %"
                        value={filters.maxPriceChange?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          onFilterChange({ maxPriceChange: value });
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Extraction Method</h4>
                  <div className="flex flex-wrap gap-2">
                    {["STATIC", "SLICE_FAST", "SLICE_BALANCED", "JS", "FULL_HTML"].map((method) => (
                      <Badge 
                        key={method}
                        variant={filters.extractionMethod.includes(method) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newMethods = filters.extractionMethod.includes(method)
                            ? filters.extractionMethod.filter(m => m !== method)
                            : [...filters.extractionMethod, method];
                          onFilterChange({ extractionMethod: newMethods });
                        }}
                      >
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {onSavePreset && (
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={onSavePreset}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Preset
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="search">Search</Label>
          <Input 
            id="search"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search machines or brands"
          />
        </div>
        
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input 
            id="brand"
            value={filters.brand}
            onChange={(e) => onFilterChange({ brand: e.target.value })}
            placeholder="Filter by brand"
          />
        </div>
        
        <div>
          <Label htmlFor="machineName">Machine Name</Label>
          <Input 
            id="machineName"
            value={filters.machineName}
            onChange={(e) => onFilterChange({ machineName: e.target.value })}
            placeholder="Filter by machine name"
          />
        </div>
      </div>
      
      <Separator className="my-4" />
      
      <div>
        <Label className="mb-2 block">Status</Label>
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm"
            variant={filters.status.includes('SUCCESS') ? "default" : "outline"}
            onClick={() => toggleStatus('SUCCESS')}
          >
            Success
          </Button>
          <Button 
            size="sm"
            variant={filters.status.includes('FAILED') ? "default" : "outline"}
            onClick={() => toggleStatus('FAILED')}
          >
            Failed
          </Button>
          <Button 
            size="sm"
            variant={filters.status.includes('NEEDS_REVIEW') ? "default" : "outline"}
            onClick={() => toggleStatus('NEEDS_REVIEW')}
          >
            Needs Review
          </Button>
        </div>
      </div>
    </div>
  )
} 