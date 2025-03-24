"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { PriceRangeSlider } from "@/components/price-range-slider"
import { RangeSlider } from "@/components/ui/range-slider"
import { Check, ChevronDown, ChevronUp, Wifi, Camera, Box, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Category, Brand } from "@/lib/database-types"

interface SidebarFilterProps {
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
  filteredCount?: number
}

export default function SidebarFilter({
  categories,
  brands,
  onApplyFilters,
  initialFilters,
  filteredCount = 0,
}: SidebarFilterProps) {
  // Map user-friendly feature names to database field names - memoize to prevent recreating on each render
  const featureMap = useMemo(() => ({
    "Camera": "Camera",
    "WiFi": "Wifi",
    "Enclosure": "Enclosure",
    "Auto Focus": "Focus",
    "Passthrough": "Passthrough",
  }), [])

  const reverseFeatureMap = useMemo(() => 
    Object.entries(featureMap).reduce<Record<string, string>>(
      (acc, [display, db]) => ({ ...acc, [db]: display }),
      {}
    ),
    [featureMap]
  )

  const features = useMemo(() => Object.keys(featureMap), [featureMap])
  const laserTypes = ["Diode", "CO2-RF", "CO2-Glass", "Fiber", "Infrared", "MOPA", "UV"]

  // Initialize with default values or initialFilters if provided
  const [selectedLaserTypes, setSelectedLaserTypes] = useState<string[]>(initialFilters?.laserTypes || [])
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialFilters?.brands || [])
  const [priceRange, setPriceRange] = useState<[number, number]>(initialFilters?.priceRange || [0, 15000])
  const [powerRange, setPowerRange] = useState<[number, number]>(initialFilters?.powerRange || [0, 150])
  const [speedRange, setSpeedRange] = useState<[number, number]>(initialFilters?.speedRange || [0, 2000])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() => 
    (initialFilters?.features || []).map(f => reverseFeatureMap[f] || f)
  )
  const [minRating, setMinRating] = useState<number>(initialFilters?.minRating || 0)

  // Debounce timers
  const priceDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const powerDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const speedDebounceTimer = useRef<NodeJS.Timeout | null>(null)

  const getCurrentFilters = useCallback(() => ({
    laserTypes: selectedLaserTypes,
    brands: selectedBrands,
    priceRange,
    powerRange,
    speedRange,
    features: selectedFeatures.map(feature => featureMap[feature as keyof typeof featureMap]),
    minRating,
  }), [
    selectedLaserTypes,
    selectedBrands,
    priceRange,
    powerRange,
    speedRange,
    selectedFeatures,
    minRating,
    featureMap
  ])

  const applyFilters = useCallback((filters: any) => {
    onApplyFilters(filters)
  }, [onApplyFilters])

  const toggleFeature = useCallback((feature: string) => {
    const newFeatures = selectedFeatures.includes(feature)
      ? selectedFeatures.filter((f) => f !== feature)
      : [...selectedFeatures, feature]

    setSelectedFeatures(newFeatures)
    
    // Create a new filters object with the updated features
    // Map feature display names to database field names correctly
    const updatedFilters = {
      laserTypes: selectedLaserTypes,
      brands: selectedBrands,
      priceRange,
      powerRange,
      speedRange,
      features: newFeatures.map(f => featureMap[f as keyof typeof featureMap]),
      minRating,
    }
    
    console.log('Applying features filter:', updatedFilters.features)
    applyFilters(updatedFilters)
  }, [
    featureMap,
    selectedFeatures,
    selectedLaserTypes,
    selectedBrands,
    priceRange,
    powerRange,
    speedRange,
    minRating,
    applyFilters
  ])

  const handlePriceChange = useCallback((value: [number, number]) => {
    setPriceRange(value)

    // Clear any existing timer
    if (priceDebounceTimer.current) {
      clearTimeout(priceDebounceTimer.current)
    }

    // Set a new timer to apply filters after a delay
    priceDebounceTimer.current = setTimeout(() => {
      const updatedFilters = {
        laserTypes: selectedLaserTypes,
        brands: selectedBrands,
        priceRange: value,
        powerRange,
        speedRange,
        features: selectedFeatures.map(f => featureMap[f as keyof typeof featureMap]),
        minRating,
      }
      applyFilters(updatedFilters)
    }, 500) // 500ms debounce
  }, [
    featureMap,
    selectedLaserTypes,
    selectedBrands,
    powerRange,
    speedRange,
    selectedFeatures,
    minRating,
    applyFilters
  ])

  const handlePowerChange = useCallback((value: [number, number]) => {
    setPowerRange(value)

    // Clear any existing timer
    if (powerDebounceTimer.current) {
      clearTimeout(powerDebounceTimer.current)
    }

    // Set a new timer to apply filters after a delay
    powerDebounceTimer.current = setTimeout(() => {
      const updatedFilters = {
        laserTypes: selectedLaserTypes,
        brands: selectedBrands,
        priceRange,
        powerRange: value,
        speedRange,
        features: selectedFeatures.map(f => featureMap[f as keyof typeof featureMap]),
        minRating,
      }
      applyFilters(updatedFilters)
    }, 500) // 500ms debounce
  }, [
    featureMap,
    selectedLaserTypes,
    selectedBrands,
    priceRange,
    speedRange,
    selectedFeatures,
    minRating,
    applyFilters
  ])

  const handleSpeedChange = useCallback((value: [number, number]) => {
    setSpeedRange(value)

    // Clear any existing timer
    if (speedDebounceTimer.current) {
      clearTimeout(speedDebounceTimer.current)
    }

    // Set a new timer to apply filters after a delay
    speedDebounceTimer.current = setTimeout(() => {
      const updatedFilters = {
        laserTypes: selectedLaserTypes,
        brands: selectedBrands,
        priceRange,
        powerRange,
        speedRange: value,
        features: selectedFeatures.map(f => featureMap[f as keyof typeof featureMap]),
        minRating,
      }
      applyFilters(updatedFilters)
    }, 500) // 500ms debounce
  }, [
    featureMap,
    selectedLaserTypes,
    selectedBrands,
    priceRange,
    powerRange,
    selectedFeatures,
    minRating,
    applyFilters
  ])

  const handleRatingChange = useCallback((rating: number) => {
    const newRating = rating === minRating ? 0 : rating
    setMinRating(newRating)
    
    // Create a new filters object with the updated rating
    const updatedFilters = {
      laserTypes: selectedLaserTypes,
      brands: selectedBrands,
      priceRange,
      powerRange,
      speedRange,
      features: selectedFeatures.map(f => featureMap[f as keyof typeof featureMap]),
      minRating: newRating,
    }
    
    applyFilters(updatedFilters)
  }, [
    featureMap,
    selectedLaserTypes,
    selectedBrands,
    priceRange,
    powerRange,
    speedRange,
    selectedFeatures,
    minRating,
    applyFilters
  ])

  const handleClear = useCallback(() => {
    const clearedFilters = {
      laserTypes: [],
      brands: [],
      priceRange: [0, 15000] as [number, number],
      powerRange: [0, 150] as [number, number],
      speedRange: [0, 2000] as [number, number],
      features: [] as string[],
      minRating: 0,
    }

    setSelectedLaserTypes([])
    setSelectedBrands([])
    setPriceRange([0, 15000])
    setPowerRange([0, 150])
    setSpeedRange([0, 2000])
    setSelectedFeatures([])
    setMinRating(0)

    onApplyFilters(clearedFilters)
  }, [onApplyFilters])

  // Expanded sections tracking - initially expand all sections
  const [expandedSections, setExpandedSections] = useState({
    laserType: true,
    price: true,
    power: true,
    speed: true,
    features: true,
    brands: true,
    rating: true,
  })

  // Update state when initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      setSelectedLaserTypes(initialFilters.laserTypes || [])
      setSelectedBrands(initialFilters.brands || [])
      setPriceRange(initialFilters.priceRange || [0, 15000])
      setPowerRange(initialFilters.powerRange || [0, 150])
      setSpeedRange(initialFilters.speedRange || [0, 2000])
      // Properly map feature database names to display names
      setSelectedFeatures(
        (initialFilters.features || [])
          .map(f => reverseFeatureMap[f] || f)
          .filter(f => f) // Remove any undefined values
      )
      setMinRating(initialFilters.minRating || 0)
    }
  }, [initialFilters, reverseFeatureMap])

  const toggleLaserType = useCallback((type: string) => {
    const newTypes = selectedLaserTypes.includes(type)
      ? selectedLaserTypes.filter((t) => t !== type)
      : [...selectedLaserTypes, type]

    setSelectedLaserTypes(newTypes)
    
    // Create a new filters object with the updated laser types
    const updatedFilters = {
      laserTypes: newTypes,
      brands: selectedBrands,
      priceRange,
      powerRange,
      speedRange,
      features: selectedFeatures.map(f => featureMap[f as keyof typeof featureMap]),
      minRating,
    }
    
    applyFilters(updatedFilters)
  }, [
    featureMap,
    selectedLaserTypes,
    selectedBrands,
    priceRange,
    powerRange,
    speedRange,
    selectedFeatures,
    minRating,
    applyFilters
  ])

  const toggleBrand = useCallback((brand: string) => {
    const newBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand]

    setSelectedBrands(newBrands)
    
    // Create a new filters object with the updated brands
    const updatedFilters = {
      laserTypes: selectedLaserTypes,
      brands: newBrands,
      priceRange,
      powerRange,
      speedRange,
      features: selectedFeatures.map(f => featureMap[f as keyof typeof featureMap]),
      minRating,
    }
    
    applyFilters(updatedFilters)
  }, [
    featureMap,
    selectedLaserTypes,
    selectedBrands,
    priceRange,
    powerRange,
    speedRange,
    selectedFeatures,
    minRating,
    applyFilters
  ])

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    })
  }, [expandedSections])

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (priceDebounceTimer.current) clearTimeout(priceDebounceTimer.current)
      if (powerDebounceTimer.current) clearTimeout(powerDebounceTimer.current)
      if (speedDebounceTimer.current) clearTimeout(speedDebounceTimer.current)
    }
  }, [])

  const activeFilterCount =
    (selectedLaserTypes?.length || 0) +
    (selectedBrands?.length || 0) +
    (priceRange?.[0] > 0 || priceRange?.[1] < 15000 ? 1 : 0) +
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
    <div className="w-full bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">Filters</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 px-2 text-sm">
            Clear all
          </Button>
        )}
      </div>

      {/* Active filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          {selectedLaserTypes.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1 px-2 py-1">
              {type}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleLaserType(type)} />
            </Badge>
          ))}
          {selectedBrands.map((brand) => (
            <Badge key={brand} variant="secondary" className="flex items-center gap-1 px-2 py-1">
              {brand}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleBrand(brand)} />
            </Badge>
          ))}
          {(priceRange[0] > 0 || priceRange[1] < 15000) && (
            <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
              ${priceRange[0]} - {priceRange[1] >= 15000 ? "$15,000+" : `$${priceRange[1]}`}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handlePriceChange([0, 15000])} />
            </Badge>
          )}
          {/* Add similar badges for other active filters */}
        </div>
      )}

      <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
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
            <div className="grid grid-cols-1 gap-2 mt-2">
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
                  ${priceRange[0]} - {priceRange[1] >= 15000 ? "$15,000+" : `$${priceRange[1]}`}
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
                onValueChange={handlePriceChange}
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
                onValueChange={handlePowerChange}
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
                  {speedRange[0].toLocaleString()} - {speedRange[1].toLocaleString()} mm/s
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
                onValueChange={handleSpeedChange}
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
            <div className="grid grid-cols-1 gap-2 mt-2 max-h-[150px] overflow-y-auto pr-2">
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
                <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{minRating}+</span>
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
                  onClick={() => handleRatingChange(rating)}
                >
                  {rating}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="pt-2 border-t text-sm text-center">
        <span className="font-medium">{filteredCount}</span> machines match your filters
      </div>
    </div>
  )
}

