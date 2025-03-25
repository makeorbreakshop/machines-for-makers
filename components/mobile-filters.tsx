"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal, ChevronDown, ChevronUp, Check } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { PriceRangeSlider } from "@/components/price-range-slider"
import { RangeSlider } from "@/components/ui/range-slider"

export default function MobileFilters() {
  const [open, setOpen] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 15000])
  const [powerRange, setPowerRange] = useState<[number, number]>([0, 150])
  const [speedRange, setSpeedRange] = useState<[number, number]>([0, 2000])
  const [minRating, setMinRating] = useState(0)
  const [selectedLaserTypes, setSelectedLaserTypes] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  // Map user-friendly laser type names to database field names
  const laserTypeMap = useMemo(() => ({
    "Fiber": "fiber",
    "Infrared": "infared", // Handle database misspelling
    "MOPA": "mopa",
    "CO2 RF": "co2-rf",
    "CO2 Glass": "co2-glass", 
    "Diode": "diode",
    "UV": "uv"
  }), [])

  // Print laser type mapping for debugging
  useEffect(() => {
    console.log("============ MOBILE FILTERS DEBUGGING ============");
    console.log("Laser Type Mapping (UI Name -> DB Value):", laserTypeMap);
    console.log("==================================================");
  }, [laserTypeMap]);

  // Expanded sections tracking
  const [expandedSections, setExpandedSections] = useState({
    laserType: true,
    price: true,
    power: true,
    speed: false,
    features: true,
    brands: false,
    rating: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    })
  }

  // Make sure these match the keys in the laserTypeMap
  const laserTypes = ["Diode", "CO2 RF", "CO2 Glass", "Fiber", "Infrared", "MOPA", "UV"]
  const brands = ["Thunder Laser", "OMTech", "xTool", "WeCreat", "CommMarker"]
  const features = ["Camera", "WiFi", "Enclosure", "Auto Focus", "Passthrough"]

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
    if (selectedFeatures.includes(feature)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== feature))
    } else {
      setSelectedFeatures([...selectedFeatures, feature])
    }
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

  const handleApply = () => {
    // Map laser types to database values
    const dbLaserTypes = selectedLaserTypes.map(type => {
      const dbValue = laserTypeMap[type as keyof typeof laserTypeMap] || type.toLowerCase();
      console.log(`Mapping UI laser type "${type}" to database value "${dbValue}"`);
      return dbValue;
    });

    // Apply the filters (this would usually call a parent function)
    console.log("Applying filters with laser types:", dbLaserTypes);
    // Close sheet
    setOpen(false);
  }

  const activeFilterCount =
    selectedLaserTypes.length +
    selectedBrands.length +
    (priceRange[0] > 0 || priceRange[1] < 15000 ? 1 : 0) +
    (powerRange[0] > 0 || powerRange[1] < 150 ? 1 : 0) +
    (speedRange[0] > 0 || speedRange[1] < 2000 ? 1 : 0) +
    selectedFeatures.length +
    (minRating > 0 ? 1 : 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="md:hidden flex items-center gap-2 rounded-full h-auto py-2 px-4 border-gray-300 hover:border-gray-400 bg-white"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5 ml-1">{activeFilterCount}</span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md p-0">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
            {/* Laser Type Section */}
            <div className="border-b pb-6">
              <button
                onClick={() => toggleSection("laserType")}
                className="flex items-center justify-between w-full mb-4 font-medium text-lg"
              >
                <span>Laser Type</span>
                {expandedSections.laserType ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.laserType && (
                <div className="space-y-3">
                  {laserTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center ${
                          selectedLaserTypes.includes(type) ? "bg-primary border-primary" : "border-gray-300"
                        }`}
                        onClick={() => toggleLaserType(type)}
                      >
                        {selectedLaserTypes.includes(type) && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Price Range Section */}
            <div className="border-b pb-6">
              <button
                onClick={() => toggleSection("price")}
                className="flex items-center justify-between w-full mb-4 font-medium text-lg"
              >
                <span>Price</span>
                {expandedSections.price ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.price && (
                <div>
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
            <div className="border-b pb-6">
              <button
                onClick={() => toggleSection("power")}
                className="flex items-center justify-between w-full mb-4 font-medium text-lg"
              >
                <span>Power (Watts)</span>
                {expandedSections.power ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.power && (
                <div>
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
            <div className="border-b pb-6">
              <button
                onClick={() => toggleSection("speed")}
                className="flex items-center justify-between w-full mb-4 font-medium text-lg"
              >
                <span>Speed (mm/s)</span>
                {expandedSections.speed ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.speed && (
                <div>
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
            <div className="border-b pb-6">
              <button
                onClick={() => toggleSection("features")}
                className="flex items-center justify-between w-full mb-4 font-medium text-lg"
              >
                <span>Features</span>
                {expandedSections.features ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.features && (
                <div className="space-y-3">
                  {features.map((feature) => (
                    <label key={feature} className="flex items-center gap-2 cursor-pointer">
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center ${
                          selectedFeatures.includes(feature) ? "bg-primary border-primary" : "border-gray-300"
                        }`}
                        onClick={() => toggleFeature(feature)}
                      >
                        {selectedFeatures.includes(feature) && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-sm">{feature}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Brands Section */}
            <div className="border-b pb-6">
              <button
                onClick={() => toggleSection("brands")}
                className="flex items-center justify-between w-full mb-4 font-medium text-lg"
              >
                <span>Brands</span>
                {expandedSections.brands ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.brands && (
                <div className="space-y-3">
                  {brands.map((brand) => (
                    <label key={brand} className="flex items-center gap-2 cursor-pointer">
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center ${
                          selectedBrands.includes(brand) ? "bg-primary border-primary" : "border-gray-300"
                        }`}
                        onClick={() => toggleBrand(brand)}
                      >
                        {selectedBrands.includes(brand) && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-sm">{brand}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Rating Section */}
            <div>
              <button
                onClick={() => toggleSection("rating")}
                className="flex items-center justify-between w-full mb-4 font-medium text-lg"
              >
                <span>Rating</span>
                {expandedSections.rating ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedSections.rating && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
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

          <div className="p-4 border-t flex justify-between">
            <Button variant="ghost" onClick={handleClear} className="font-medium">
              Clear all
            </Button>
            <Button onClick={handleApply} className="px-6 py-2 rounded-lg">
              Show results {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

