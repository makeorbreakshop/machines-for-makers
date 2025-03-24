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
    priceRange: [number, number]
    powerRange: [number, number]
    speedRange: [number, number]
    features: string[]
    isTopPick?: boolean
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

  // Map user-friendly laser type names to database field names
  const laserTypeMap = useMemo(() => ({
    "Fiber": "fiber",
    "Infrared": "infared", // Handle database misspelling
    "MOPA": "mopa",
    "CO2 RF": "co2-rf",
    "CO2 Glass": "co2-glass", 
    "Diode": "diode",
  } as Record<string, string>), [])

  // Print laser type mapping for debugging
  useEffect(() => {
    console.log("============ SIDEBAR FILTER DEBUGGING ============");
    console.log("Laser Type Mapping (UI Name -> DB Value):", laserTypeMap);
    console.log("==================================================");
  }, [laserTypeMap]);

  // Create a reverse mapping for display names
  const reverseLaserTypeMap = useMemo(() => 
    Object.entries(laserTypeMap).reduce<Record<string, string>>(
      (acc, [display, db]) => ({ ...acc, [db.toLowerCase()]: display }),
      {}
    ), 
    [laserTypeMap]
  )

  const features = useMemo(() => Object.keys(featureMap), [featureMap])
  // Display names for UI - keeping order consistent
  const laserTypes = ["Diode", "CO2 RF", "CO2 Glass", "Fiber", "Infrared", "MOPA"]

  // Initialize with default values or initialFilters if provided
  const [selectedLaserTypes, setSelectedLaserTypes] = useState<string[]>(initialFilters?.laserTypes || [])
  const [priceRange, setPriceRange] = useState<[number, number]>(initialFilters?.priceRange || [0, 15000])
  const [powerRange, setPowerRange] = useState<[number, number]>(initialFilters?.powerRange || [0, 150])
  const [speedRange, setSpeedRange] = useState<[number, number]>(initialFilters?.speedRange || [0, 2000])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() => 
    (initialFilters?.features || []).map(f => reverseFeatureMap[f] || f)
  )
  const [isTopPick, setIsTopPick] = useState<boolean>(initialFilters?.isTopPick || false)

  // Debounce timers
  const priceDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const powerDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const speedDebounceTimer = useRef<NodeJS.Timeout | null>(null)

  const getCurrentFilters = useCallback(() => {
    // We don't need to map the laser types here since we're now doing it
    // directly in the checkbox handler
    return {
      laserTypes: selectedLaserTypes.map(type => {
        // Make sure we're using the right database value for each laser type
        const dbValue = laserTypeMap[type] || type.toLowerCase();
        console.log(`Mapping UI laser type "${type}" to database value "${dbValue}"`);
        return dbValue;
      }),
      priceRange,
      powerRange,
      speedRange,
      features: selectedFeatures.map(feature => featureMap[feature as keyof typeof featureMap]),
      isTopPick,
    };
  }, [
    selectedLaserTypes,
    priceRange,
    powerRange,
    speedRange,
    selectedFeatures,
    isTopPick,
    featureMap,
    laserTypeMap
  ])

  const applyFilters = useCallback((filters: any) => {
    // Add a clear console log for laser type filters
    if (filters.laserTypes && filters.laserTypes.length > 0) {
      console.log(`APPLYING LASER TYPE FILTERS FROM SIDEBAR: ${filters.laserTypes.join(', ')}`);
    }
    onApplyFilters(filters)
  }, [onApplyFilters])

  const clearAllFilters = useCallback(() => {
    setSelectedLaserTypes([])
    setPriceRange([0, 15000])
    setPowerRange([0, 150])
    setSpeedRange([0, 2000])
    setSelectedFeatures([])
    setIsTopPick(false)
    
    const resetFilters = {
      laserTypes: [],
      priceRange: [0, 15000],
      powerRange: [0, 150],
      speedRange: [0, 2000],
      features: [],
      isTopPick: false,
    }
    
    applyFilters(resetFilters)
  }, [applyFilters])

  const toggleTopPick = useCallback(() => {
    const newIsTopPick = !isTopPick
    setIsTopPick(newIsTopPick)
    
    const currentFilters = getCurrentFilters();
    const updatedFilters = {
      ...currentFilters,
      isTopPick: newIsTopPick
    };
    
    applyFilters(updatedFilters)
  }, [isTopPick, getCurrentFilters, applyFilters])

  const toggleFeature = useCallback((feature: string) => {
    const newFeatures = selectedFeatures.includes(feature)
      ? selectedFeatures.filter((f) => f !== feature)
      : [...selectedFeatures, feature]

    setSelectedFeatures(newFeatures)
    
    // Get current filters and update the features
    const currentFilters = getCurrentFilters();
    const updatedFilters = {
      ...currentFilters,
      features: newFeatures.map(f => featureMap[f as keyof typeof featureMap])
    };
    
    applyFilters(updatedFilters);
  }, [
    featureMap,
    selectedFeatures,
    getCurrentFilters,
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
      const currentFilters = getCurrentFilters();
      const updatedFilters = {
        ...currentFilters,
        priceRange: value
      };
      applyFilters(updatedFilters);
    }, 500) // 500ms debounce
  }, [getCurrentFilters, applyFilters])

  const handlePowerChange = useCallback((value: [number, number]) => {
    setPowerRange(value)

    // Clear any existing timer
    if (powerDebounceTimer.current) {
      clearTimeout(powerDebounceTimer.current)
    }

    // Set a new timer to apply filters after a delay
    powerDebounceTimer.current = setTimeout(() => {
      const currentFilters = getCurrentFilters();
      const updatedFilters = {
        ...currentFilters,
        powerRange: value
      };
      applyFilters(updatedFilters);
    }, 500) // 500ms debounce
  }, [getCurrentFilters, applyFilters])

  const handleSpeedChange = useCallback((value: [number, number]) => {
    setSpeedRange(value)

    // Clear any existing timer
    if (speedDebounceTimer.current) {
      clearTimeout(speedDebounceTimer.current)
    }

    // Set a new timer to apply filters after a delay
    speedDebounceTimer.current = setTimeout(() => {
      const currentFilters = getCurrentFilters();
      const updatedFilters = {
        ...currentFilters,
        speedRange: value
      };
      applyFilters(updatedFilters);
    }, 500) // 500ms debounce
  }, [getCurrentFilters, applyFilters])

  // Expanded sections tracking - initially expand all sections
  const [expandedSections, setExpandedSections] = useState({
    topPick: true,
    laserType: true,
    price: true,
    power: true,
    speed: true,
    features: true,
  })

  // Update state when initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      // Map database laser types back to UI display names
      const mappedLaserTypes = (initialFilters.laserTypes || [])
        .map(dbType => {
          const dbTypeLower = (dbType || "").toLowerCase();
          // Find the UI key for this database value
          const entry = Object.entries(laserTypeMap).find(([_, dbValue]) => 
            dbValue.toLowerCase() === dbTypeLower
          );
          return entry ? entry[0] : dbType;
        });
      
      console.log('initialFilters.laserTypes:', initialFilters.laserTypes);
      console.log('Mapped back to UI names:', mappedLaserTypes);
      
      setSelectedLaserTypes(mappedLaserTypes);
      setPriceRange(initialFilters.priceRange || [0, 15000])
      setPowerRange(initialFilters.powerRange || [0, 150])
      setSpeedRange(initialFilters.speedRange || [0, 2000])
      // Properly map feature database names to display names
      setSelectedFeatures(
        (initialFilters.features || [])
          .map(f => reverseFeatureMap[f] || f)
          .filter(f => f) // Remove any undefined values
      )
      setIsTopPick(initialFilters.isTopPick || false)
    }
  }, [initialFilters, reverseFeatureMap, laserTypeMap])

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
    (priceRange?.[0] > 0 || priceRange?.[1] < 15000 ? 1 : 0) +
    (powerRange?.[0] > 0 || powerRange?.[1] < 150 ? 1 : 0) +
    (speedRange?.[0] > 0 || speedRange?.[1] < 2000 ? 1 : 0) +
    (selectedFeatures?.length || 0)

  // Feature icons mapping with better icons
  const featureIcons = {
    Camera: <Camera className="h-4 w-4" />,
    WiFi: <Wifi className="h-4 w-4" />,
    Enclosure: <Box className="h-4 w-4" />,
    "Auto Focus": <Camera className="h-4 w-4" />,
    Passthrough: <Box className="h-4 w-4" />,
  }

  return (
    <div className="space-y-6">
      {/* Top Pick Filter - simple button, not collapsible */}
      <Button
        variant={isTopPick ? "default" : "outline"}
        className="w-full px-2 py-2 h-auto"
        onClick={toggleTopPick}
      >
        <div className="flex items-center justify-center w-full gap-1.5">
          <Check className={`h-3.5 w-3.5 flex-shrink-0 ${isTopPick ? "opacity-100" : "opacity-0"}`} />
          <span className="text-sm">Top Pick Only</span>
        </div>
      </Button>

      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('laserType')}>
          <h3 className="text-sm font-medium">Laser Type</h3>
          {expandedSections.laserType ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {expandedSections.laserType && (
          <div className="space-y-2">
            {laserTypes.map((type) => (
              <div key={type} className="flex items-center">
                <input
                  type="checkbox"
                  id={`laser-${type}`}
                  checked={selectedLaserTypes.includes(type)}
                  onChange={() => {
                    // Simple debugging for key events
                    console.log(`Toggling ${type} filter`);
                    console.log(`Database mapping: "${type}" -> "${laserTypeMap[type] || type.toLowerCase()}"`);
                    
                    // Toggle the selected type
                    const newTypes = selectedLaserTypes.includes(type)
                      ? selectedLaserTypes.filter(t => t !== type) // Remove if selected
                      : [...selectedLaserTypes, type]; // Add if not selected
                    
                    // Update state
                    setSelectedLaserTypes(newTypes);
                    
                    // Get the database values for the selected types
                    const dbLaserTypes = newTypes.map(t => {
                      const dbValue = laserTypeMap[t] || t.toLowerCase();
                      return dbValue;
                    });
                    console.log(`Selected laser types: ${newTypes.join(', ')}`);
                    console.log(`Mapped to DB values: ${dbLaserTypes.join(', ')}`);
                    
                    // Create updated filters with the new laser types
                    const updatedFilters = {
                      ...getCurrentFilters(),
                      laserTypes: dbLaserTypes
                    };
                    
                    // Apply the filters
                    applyFilters(updatedFilters);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor={`laser-${type}`} className="ml-2 text-sm text-gray-700">
                  {type}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('price')}>
          <h3 className="text-sm font-medium">Price</h3>
          {expandedSections.price ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {expandedSections.price && (
          <PriceRangeSlider
            min={0}
            max={15000}
            step={100}
            value={priceRange}
            onValueChange={handlePriceChange}
          />
        )}
      </div>

      {/* Power Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('power')}>
          <h3 className="text-sm font-medium">Power (Watts)</h3>
          {expandedSections.power ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {expandedSections.power && (
          <RangeSlider
            min={0}
            max={150}
            step={1}
            value={powerRange}
            onValueChange={handlePowerChange}
          />
        )}
      </div>

      {/* Speed Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('speed')}>
          <h3 className="text-sm font-medium">Speed (mm/s)</h3>
          {expandedSections.speed ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {expandedSections.speed && (
          <RangeSlider
            min={0}
            max={2000}
            step={10}
            value={speedRange}
            onValueChange={handleSpeedChange}
          />
        )}
      </div>

      {/* Features */}
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('features')}>
          <h3 className="text-sm font-medium">Features</h3>
          {expandedSections.features ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {expandedSections.features && (
          <div className="space-y-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-center">
                <input
                  type="checkbox"
                  id={`feature-${feature}`}
                  checked={selectedFeatures.includes(feature)}
                  onChange={() => toggleFeature(feature)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor={`feature-${feature}`} className="ml-2 text-sm text-gray-700">
                  {feature}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Showing {filteredCount} result{filteredCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Add a clear filters button at the bottom if any filters are applied */}
      {(selectedLaserTypes.length > 0 || 
         priceRange[0] > 0 || priceRange[1] < 15000 ||
         powerRange[0] > 0 || powerRange[1] < 150 ||
         speedRange[0] > 0 || speedRange[1] < 2000 ||
         selectedFeatures.length > 0 ||
         isTopPick) && (
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2"
            onClick={clearAllFilters}
          >
            <X className="h-4 w-4" />
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  )
}

