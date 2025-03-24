"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"

interface PriceRangeSliderProps {
  min: number
  max: number
  step?: number
  defaultValue?: [number, number]
  value?: [number, number]
  onValueChange?: (value: [number, number]) => void
}

export function PriceRangeSlider({
  min,
  max,
  step = 100,
  defaultValue = [min, max],
  value,
  onValueChange,
}: PriceRangeSliderProps) {
  const [internalValue, setInternalValue] = React.useState<[number, number]>(value || defaultValue)
  const [minInput, setMinInput] = React.useState<string>((value || defaultValue)[0].toString())
  const [maxInput, setMaxInput] = React.useState<string>((value || defaultValue)[1].toString())

  // Flag to prevent update loops
  const isUpdatingRef = React.useRef(false)

  // Update internal state when external value changes
  React.useEffect(() => {
    if (value && !isUpdatingRef.current) {
      setInternalValue(value)
      setMinInput(value[0].toString())
      setMaxInput(value[1].toString())
    }
  }, [value])

  // Update the input fields when the slider changes
  const handleSliderChange = (newValue: [number, number]) => {
    isUpdatingRef.current = true
    setInternalValue(newValue)
    setMinInput(newValue[0].toString())
    setMaxInput(newValue[1].toString())

    if (onValueChange) {
      onValueChange(newValue)
    }

    // Reset the flag after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }

  // Handle min input change
  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setMinInput(newValue)

    const numValue = Number.parseInt(newValue)
    if (!isNaN(numValue) && numValue >= min && numValue <= internalValue[1]) {
      isUpdatingRef.current = true
      const updatedValue: [number, number] = [numValue, internalValue[1]]
      setInternalValue(updatedValue)

      if (onValueChange) {
        onValueChange(updatedValue)
      }

      // Reset the flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    }
  }

  // Handle max input change
  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setMaxInput(newValue)

    const numValue = Number.parseInt(newValue)
    if (!isNaN(numValue) && numValue <= max && numValue >= internalValue[0]) {
      isUpdatingRef.current = true
      const updatedValue: [number, number] = [internalValue[0], numValue]
      setInternalValue(updatedValue)

      if (onValueChange) {
        onValueChange(updatedValue)
      }

      // Reset the flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    }
  }

  // Handle blur events to validate and format inputs
  const handleInputBlur = () => {
    let minVal = Number.parseInt(minInput)
    let maxVal = Number.parseInt(maxInput)

    if (isNaN(minVal)) minVal = min
    if (isNaN(maxVal)) maxVal = max

    minVal = Math.max(min, Math.min(minVal, internalValue[1]))
    maxVal = Math.min(max, Math.max(maxVal, internalValue[0]))

    setMinInput(minVal.toString())
    setMaxInput(maxVal.toString())

    isUpdatingRef.current = true
    const updatedValue: [number, number] = [minVal, maxVal]
    setInternalValue(updatedValue)

    if (onValueChange) {
      onValueChange(updatedValue)
    }

    // Reset the flag after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }

  return (
    <div className="space-y-4">
      <Slider
        value={internalValue}
        max={max}
        min={min}
        step={step}
        onValueChange={handleSliderChange}
        className="my-6"
      />
      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="min-price" className="text-xs text-muted-foreground">
            Min
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="min-price"
              type="number"
              min={min}
              max={internalValue[1]}
              value={minInput}
              onChange={handleMinInputChange}
              onBlur={handleInputBlur}
              className="pl-6 w-full"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="max-price" className="text-xs text-muted-foreground">
            Max
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="max-price"
              type="number"
              min={internalValue[0]}
              max={max}
              value={maxInput}
              onChange={handleMaxInputChange}
              onBlur={handleInputBlur}
              className="pl-6 w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

