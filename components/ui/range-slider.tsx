"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"

interface RangeSliderProps {
  min: number
  max: number
  step?: number
  defaultValue?: [number, number]
  value?: [number, number]
  onValueChange?: (value: [number, number]) => void
  prefix?: string
  suffix?: string
}

export function RangeSlider({
  min,
  max,
  step = 1,
  defaultValue = [min, max],
  value,
  onValueChange,
  prefix = "",
  suffix = "",
}: RangeSliderProps) {
  const [internalValue, setInternalValue] = React.useState<[number, number]>(value || defaultValue)
  const [minInput, setMinInput] = React.useState<string>(String((value || defaultValue)[0]))
  const [maxInput, setMaxInput] = React.useState<string>(String((value || defaultValue)[1]))

  // Flag to prevent update loops
  const isUpdatingRef = React.useRef(false)

  // Update internal state when external value changes
  React.useEffect(() => {
    if (value && !isUpdatingRef.current) {
      setInternalValue(value)
      setMinInput(String(value[0]))
      setMaxInput(String(value[1]))
    }
  }, [value])

  // Update the input fields when the slider changes
  const handleSliderChange = (newValue: [number, number]) => {
    isUpdatingRef.current = true
    setInternalValue(newValue)
    setMinInput(String(newValue[0]))
    setMaxInput(String(newValue[1]))

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

    setMinInput(String(minVal))
    setMaxInput(String(maxVal))

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
          <label htmlFor="min-value" className="text-xs text-muted-foreground">
            Min
          </label>
          <div className="relative">
            {prefix && (
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>
            )}
            <Input
              id="min-value"
              type="number"
              min={min}
              max={internalValue[1]}
              value={minInput}
              onChange={handleMinInputChange}
              onBlur={handleInputBlur}
              className={prefix ? "pl-6 w-full" : "w-full"}
            />
            {suffix && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {suffix}
              </span>
            )}
          </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="max-value" className="text-xs text-muted-foreground">
            Max
          </label>
          <div className="relative">
            {prefix && (
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>
            )}
            <Input
              id="max-value"
              type="number"
              min={internalValue[0]}
              max={max}
              value={maxInput}
              onChange={handleMaxInputChange}
              onBlur={handleInputBlur}
              className={prefix ? "pl-6 w-full" : "w-full"}
            />
            {suffix && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {suffix}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

