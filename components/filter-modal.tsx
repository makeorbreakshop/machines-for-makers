"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PriceRangeSlider } from "@/components/price-range-slider"
import { RangeSlider } from "@/components/ui/range-slider"
import { Check, ChevronDown, ChevronUp, Wifi, Camera, Box } from "lucide-react"
import type { Category, Brand } from "@/lib/database-types"

interface FilterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  brands: Brand[]
  onApplyFilters: (filters: any) => void
  initialFilters?: {
    laserTypes: string[]
    brands: string[]
    priceRange: [number, number]
    powerRange: [number, number]
    speedRange: [number, number]
    features: string[]
    minRating: number
  }
  filteredCount?: number // Add prop for the count of filtered machines
  isInSheet?: boolean // Whether this modal is being rendered inside a Sheet component
}

export default function FilterModal({
  open,
  onOpenChange,
  categories,
  brands,
  onApplyFilters,
  initialFilters,
  filteredCount = 0, // Default to 0 if not provided
  isInSheet = false, // Default to false if not provided
}: FilterModalProps) {
  // Initialize with default values or initialFilters if provided
  const [selectedLaserTypes, setSelectedLaserTypes] = useState<string[]>(initialFilters?.laserTypes || [])
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialFilters?.brands || [])
  const [priceRange, setPriceRange] = useState<[number, number]>(initialFilters?.priceRange || [0, 15000])
  const [powerRange, setPowerRange] = useState<[number, number]>(initialFilters?.powerRange || [0, 150])
  const [speedRange, setSpeedRange] = useState<[number, number]>(initialFilters?.speedRange || [0, 2000])
  
  // Map user-friendly feature names to database field names
  const featureMap = {
    "Camera": "camera",
    "WiFi": "wifi",
    "Enclosure": "enclosure",
    "Auto Focus": "auto_focus",
    "Passthrough": "passthrough",
  }

  // Map user-friendly laser type names to database field names
  const laserTypeMap = useMemo(() => ({
    "Fiber": "fiber",
    "Infrared": "infared", // Handle database misspelling
    "MOPA": "mopa",
    "CO2 RF": "co2-rf",
    "CO2-RF": "co2-rf",
    "CO2 Glass": "co2-glass", 
    "CO2-Glass": "co2-glass",
    "Diode": "diode",
    "UV": "uv"
  }), [])

  // Print laser type mapping for debugging
  useEffect(() => {
    console.log("============ FILTER MODAL DEBUGGING ============");
    console.log("Laser Type Mapping (UI Name -> DB Value):", laserTypeMap);
    console.log("==================================================");
  }, [laserTypeMap]);

  const reverseFeatureMap: { [key: string]: string } = Object.entries(featureMap).reduce(
    (acc, [display, db]) => ({ ...acc, [db]: display }),
    {}
  )
  
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    (initialFilters?.features || []).map(f => reverseFeatureMap[f] || f)
  )
  const [minRating, setMinRating] = useState<number>(initialFilters?.minRating || 0)

  // Expanded sections tracking - initially collapse most sections
  const [expandedSections, setExpandedSections] = useState({
    laserType: true,
    price: false,
    power: false,
    speed: false,
    features: false,
    brands: false,
    rating: false,
  })

  // Update state when initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      setSelectedLaserTypes(initialFilters.laserTypes || [])
      setSelectedBrands(initialFilters.brands || [])
      setPriceRange(initialFilters.priceRange || [0, 15000])
      setPowerRange(initialFilters.powerRange || [0, 150])
      setSpeedRange(initialFilters.speedRange || [0, 2000])
      setSelectedFeatures((initialFilters.features || []).map(f => reverseFeatureMap[f] || f))
      setMinRating(initialFilters.minRating || 0)
    }
  }, [initialFilters])

  // Make sure these match the keys in the laserTypeMap
  const laserTypes = ["Diode", "CO2 RF", "CO2 Glass", "Fiber", "Infrared", "MOPA", "UV"]

  const features = Object.keys(featureMap)

  const toggleLaserType = (type: string) => {
    if (selectedLaserTypes.includes(type)) {
      setSelectedLaserTypes(selectedLaserTypes.filter((t) => t !== type))
    } else {
      setSelectedLaserTypes([...selectedLaserTypes, type])
    }
  }

  const toggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(selectedBrands.filter((b) => b !== brand))
    } else {
      setSelectedBrands([...selectedBrands, brand])
    }
  }

  const toggleFeature = (feature: string) => {
    const newFeatures = selectedFeatures.includes(feature)
      ? selectedFeatures.filter((f) => f !== feature)
      : [...selectedFeatures, feature]
    
    setSelectedFeatures(newFeatures)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    })
  }

  const handleApply = () => {
    // Map feature names to database field names
    const featureFields = selectedFeatures.map((feature) => featureMap[feature as keyof typeof featureMap])

    // Map laser types to database values
    const dbLaserTypes = selectedLaserTypes.map(type => {
      // Get database value or default to lowercase
      const dbValue = laserTypeMap[type as keyof typeof laserTypeMap] || type.toLowerCase();
      console.log(`Mapping UI laser type "${type}" to database value "${dbValue}"`);
      return dbValue;
    });

    onApplyFilters({
      laserTypes: dbLaserTypes,
      brands: selectedBrands,
      priceRange,
      powerRange,
      speedRange,
      features: featureFields,
      minRating,
    })
    onOpenChange(false)
  }

  const handleClear = () => {
    setSelectedLaserTypes([])
    setSelectedBrands([])
    setPriceRange([0, 15000])
    setPowerRange([0, 150])
    setSpeedRange([0, 2000])
    setSelectedFeatures([])
    setMinRating(0)
  }

  const activeFilterCount =
    (selectedLaserTypes?.length || 0) +
    (selectedBrands?.length || 0) +
    ((priceRange?.[0] > 0 || priceRange?.[1] < 15000) ? 1 : 0) +
    (powerRange?.[0] > 0 || powerRange?.[1] < 150 ? 1 : 0) +
    (speedRange?.[0] > 0 || speedRange?.[1] < 2000 ? 1 : 0) +
    (selectedFeatures?.length || 0) +
    (minRating > 0 ? 1 : 0)

  // Feature icons mapping
  const featureIcons = {
    Camera: <Camera className="h-4 w-4" />,
    WiFi: <Wifi className="h-4 w-4" />,
    Enclosure: <Box className="h-4 w-4" />,
    "Auto Focus": <Camera className="h-4 w-4" />,
    Passthrough: <Box className="h-4 w-4" />,
  }

  return (
    <>
      {isInSheet ? (
        // When inside a Sheet component, render just the content without Dialog wrapper
        <div className="p-0 gap-0 h-full flex flex-col">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              {/* Laser Type Section */}
              <div className="border-b pb-3">
                <button
                  onClick={() => toggleSection("laserType")}
                  className="flex items-center justify-between w-full py-2 font-medium"
                >
                  <span>Laser Type</span>
                  <div className="flex items-center">
                    {selectedLaserTypes.length > 0 && (
                      <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {selectedLaserTypes.length}
                      </span>
                    )}
                    {expandedSections.laserType ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedSections.laserType && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {laserTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center ${
                            selectedLaserTypes.includes(type) ? "bg-primary border-primary" : "border-gray-300"
                          }`}
                          onClick={() => toggleLaserType(type)}
                        >
                          {selectedLaserTypes.includes(type) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Range Section */}
              <div className="border-b pb-3">
                <button
                  onClick={() => toggleSection("price")}
                  className="flex items-center justify-between w-full py-2 font-medium"
                >
                  <span>Price</span>
                  <div className="flex items-center">
                    {(priceRange[0] > 0 || priceRange[1] < 15000) && (
                      <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        ${priceRange[0].toLocaleString()} - ${priceRange[1] >= 15000 ? "$15,000+" : `$${priceRange[1].toLocaleString()}`}
                      </span>
                    )}
                    {expandedSections.price ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedSections.price && (
                  <div className="mt-2">
                    <PriceRangeSlider
                      min={0}
                      max={15000}
                      step={100}
                      defaultValue={priceRange}
                      value={priceRange}
                      onValueChange={setPriceRange}
                    />
                  </div>
                )}
              </div>

              {/* Power Range Section */}
              <div className="border-b pb-3">
                <button
                  onClick={() => toggleSection("power")}
                  className="flex items-center justify-between w-full py-2 font-medium"
                >
                  <span>Power (Watts)</span>
                  <div className="flex items-center">
                    {(powerRange[0] > 0 || powerRange[1] < 150) && (
                      <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {powerRange[0]}W - {powerRange[1]}W
                      </span>
                    )}
                    {expandedSections.power ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedSections.power && (
                  <div className="mt-2">
                    <RangeSlider
                      min={0}
                      max={150}
                      step={5}
                      defaultValue={powerRange}
                      value={powerRange}
                      onValueChange={setPowerRange}
                      suffix="W"
                    />
                  </div>
                )}
              </div>

              {/* Speed Range Section */}
              <div className="border-b pb-3">
                <button
                  onClick={() => toggleSection("speed")}
                  className="flex items-center justify-between w-full py-2 font-medium"
                >
                  <span>Speed (mm/s)</span>
                  <div className="flex items-center">
                    {(speedRange[0] > 0 || speedRange[1] < 2000) && (
                      <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {speedRange[0]} - {speedRange[1]}
                      </span>
                    )}
                    {expandedSections.speed ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedSections.speed && (
                  <div className="mt-2">
                    <RangeSlider
                      min={0}
                      max={2000}
                      step={100}
                      defaultValue={speedRange}
                      value={speedRange}
                      onValueChange={setSpeedRange}
                      suffix="mm/s"
                    />
                  </div>
                )}
              </div>

              {/* Features Section */}
              <div className="border-b pb-3">
                <button
                  onClick={() => toggleSection("features")}
                  className="flex items-center justify-between w-full py-2 font-medium"
                >
                  <span>Features</span>
                  <div className="flex items-center">
                    {selectedFeatures.length > 0 && (
                      <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {selectedFeatures.length}
                      </span>
                    )}
                    {expandedSections.features ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedSections.features && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {features.map((feature) => (
                      <button
                        key={feature}
                        onClick={() => toggleFeature(feature)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                          selectedFeatures.includes(feature)
                            ? "bg-primary text-white border-primary"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {featureIcons[feature as keyof typeof featureIcons]}
                        <span>{feature}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Brands Section */}
              <div className="border-b pb-3">
                <button
                  onClick={() => toggleSection("brands")}
                  className="flex items-center justify-between w-full py-2 font-medium"
                >
                  <span>Brands</span>
                  <div className="flex items-center">
                    {selectedBrands.length > 0 && (
                      <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {selectedBrands.length}
                      </span>
                    )}
                    {expandedSections.brands ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedSections.brands && (
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-[150px] overflow-y-auto pr-2">
                    {brands.map((brand) => (
                      <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center ${
                            selectedBrands.includes(brand.name) ? "bg-primary border-primary" : "border-gray-300"
                          }`}
                          onClick={() => toggleBrand(brand.name)}
                        >
                          {selectedBrands.includes(brand.name) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm truncate">{brand.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating Section */}
              <div className="pb-3">
                <button
                  onClick={() => toggleSection("rating")}
                  className="flex items-center justify-between w-full py-2 font-medium"
                >
                  <span>Rating</span>
                  <div className="flex items-center">
                    {minRating > 0 && (
                      <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {minRating}+
                      </span>
                    )}
                    {expandedSections.rating ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedSections.rating && (
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          minRating >= rating ? "bg-primary text-white" : "bg-muted/20 text-muted-foreground"
                        }`}
                        onClick={() => setMinRating(rating === minRating ? 0 : rating)}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed footer with action buttons */}
          <div className="border-t p-4 flex justify-between items-center bg-white dark:bg-gray-950 sticky bottom-0 left-0 right-0">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear All
            </Button>
            <div className="flex items-center gap-2">
              {filteredCount > 0 && (
                <span className="text-sm text-gray-500">
                  {filteredCount} {filteredCount === 1 ? 'result' : 'results'}
                </span>
              )}
              <Button size="sm" onClick={handleApply}>
                Show Results
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // When not in a Sheet, use the Dialog wrapper as before
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[550px] p-0 gap-0 max-h-[85vh] flex flex-col">
            {/* Header with title */}
            <div className="px-4 py-3 border-b">
              <DialogTitle className="text-lg font-medium text-center">Filters</DialogTitle>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                {/* Laser Type Section */}
                <div className="border-b pb-3">
                  <button
                    onClick={() => toggleSection("laserType")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                  >
                    <span>Laser Type</span>
                    <div className="flex items-center">
                      {selectedLaserTypes.length > 0 && (
                        <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {selectedLaserTypes.length}
                        </span>
                      )}
                      {expandedSections.laserType ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedSections.laserType && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {laserTypes.map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center ${
                              selectedLaserTypes.includes(type) ? "bg-primary border-primary" : "border-gray-300"
                            }`}
                            onClick={() => toggleLaserType(type)}
                          >
                            {selectedLaserTypes.includes(type) && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-sm">{type}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Range Section */}
                <div className="border-b pb-3">
                  <button
                    onClick={() => toggleSection("price")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                  >
                    <span>Price</span>
                    <div className="flex items-center">
                      {(priceRange[0] > 0 || priceRange[1] < 15000) && (
                        <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          ${priceRange[0].toLocaleString()} - ${priceRange[1] >= 15000 ? "$15,000+" : `$${priceRange[1].toLocaleString()}`}
                        </span>
                      )}
                      {expandedSections.price ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedSections.price && (
                    <div className="mt-2">
                      <PriceRangeSlider
                        min={0}
                        max={15000}
                        step={100}
                        defaultValue={priceRange}
                        value={priceRange}
                        onValueChange={setPriceRange}
                      />
                    </div>
                  )}
                </div>

                {/* Power Range Section */}
                <div className="border-b pb-3">
                  <button
                    onClick={() => toggleSection("power")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                  >
                    <span>Power (Watts)</span>
                    <div className="flex items-center">
                      {(powerRange[0] > 0 || powerRange[1] < 150) && (
                        <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {powerRange[0]}W - {powerRange[1]}W
                        </span>
                      )}
                      {expandedSections.power ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedSections.power && (
                    <div className="mt-2">
                      <RangeSlider
                        min={0}
                        max={150}
                        step={5}
                        defaultValue={powerRange}
                        value={powerRange}
                        onValueChange={setPowerRange}
                        suffix="W"
                      />
                    </div>
                  )}
                </div>

                {/* Speed Range Section */}
                <div className="border-b pb-3">
                  <button
                    onClick={() => toggleSection("speed")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                  >
                    <span>Speed (mm/s)</span>
                    <div className="flex items-center">
                      {(speedRange[0] > 0 || speedRange[1] < 2000) && (
                        <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {speedRange[0]} - {speedRange[1]}
                        </span>
                      )}
                      {expandedSections.speed ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedSections.speed && (
                    <div className="mt-2">
                      <RangeSlider
                        min={0}
                        max={2000}
                        step={100}
                        defaultValue={speedRange}
                        value={speedRange}
                        onValueChange={setSpeedRange}
                        suffix="mm/s"
                      />
                    </div>
                  )}
                </div>

                {/* Features Section */}
                <div className="border-b pb-3">
                  <button
                    onClick={() => toggleSection("features")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                  >
                    <span>Features</span>
                    <div className="flex items-center">
                      {selectedFeatures.length > 0 && (
                        <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {selectedFeatures.length}
                        </span>
                      )}
                      {expandedSections.features ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedSections.features && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {features.map((feature) => (
                        <button
                          key={feature}
                          onClick={() => toggleFeature(feature)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                            selectedFeatures.includes(feature)
                              ? "bg-primary text-white border-primary"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {featureIcons[feature as keyof typeof featureIcons]}
                          <span>{feature}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Brands Section */}
                <div className="border-b pb-3">
                  <button
                    onClick={() => toggleSection("brands")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                  >
                    <span>Brands</span>
                    <div className="flex items-center">
                      {selectedBrands.length > 0 && (
                        <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {selectedBrands.length}
                        </span>
                      )}
                      {expandedSections.brands ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedSections.brands && (
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-[150px] overflow-y-auto pr-2">
                      {brands.map((brand) => (
                        <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center ${
                              selectedBrands.includes(brand.name) ? "bg-primary border-primary" : "border-gray-300"
                            }`}
                            onClick={() => toggleBrand(brand.name)}
                          >
                            {selectedBrands.includes(brand.name) && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-sm truncate">{brand.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rating Section */}
                <div className="pb-3">
                  <button
                    onClick={() => toggleSection("rating")}
                    className="flex items-center justify-between w-full py-2 font-medium"
                  >
                    <span>Rating</span>
                    <div className="flex items-center">
                      {minRating > 0 && (
                        <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {minRating}+
                        </span>
                      )}
                      {expandedSections.rating ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedSections.rating && (
                    <div className="flex items-center gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            minRating >= rating ? "bg-primary text-white" : "bg-muted/20 text-muted-foreground"
                          }`}
                          onClick={() => setMinRating(rating === minRating ? 0 : rating)}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with action buttons */}
            <div className="border-t p-4 flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear All
              </Button>
              <div className="flex items-center gap-2">
                {filteredCount > 0 && (
                  <span className="text-sm text-gray-500">
                    {filteredCount} {filteredCount === 1 ? 'result' : 'results'}
                  </span>
                )}
                <Button size="sm" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

