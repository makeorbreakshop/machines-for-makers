"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { DEFAULT_INK_PACKAGE_PRICE, DEFAULT_ML_PER_SET } from "../config";

interface InkPriceInputProps {
  inkPrice: number;
  onInkPriceChange: (price: number) => void;
  mlPerSet: number;
  onMlPerSetChange: (ml: number) => void;
}

export default function InkPriceInput({
  inkPrice,
  onInkPriceChange,
  mlPerSet,
  onMlPerSetChange,
}: InkPriceInputProps) {
  const [priceInput, setPriceInput] = useState(inkPrice.toString());
  const [mlInput, setMlInput] = useState(mlPerSet.toString());
  const [priceError, setPriceError] = useState<string | null>(null);
  const [mlError, setMlError] = useState<string | null>(null);

  // Update local state when props change
  useEffect(() => {
    setPriceInput(inkPrice.toString());
  }, [inkPrice]);

  useEffect(() => {
    setMlInput(mlPerSet.toString());
  }, [mlPerSet]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPriceInput(value);
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setPriceError("Please enter a valid price");
      return;
    }
    
    setPriceError(null);
    onInkPriceChange(numValue);
  };

  const handleMlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMlInput(value);
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setMlError("Please enter a valid amount");
      return;
    }
    
    setMlError(null);
    onMlPerSetChange(numValue);
  };

  const saveToLocalStorage = () => {
    if (!priceError && !mlError) {
      localStorage.setItem("inkPrice", priceInput);
      localStorage.setItem("mlPerSet", mlInput);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">Ink Price Information</h3>
      
      <div className="space-y-2">
        <Label htmlFor="ink-price">Ink Package Price ($)</Label>
        <div className="flex gap-2">
          <Input
            id="ink-price"
            type="number"
            min="0"
            step="0.01"
            value={priceInput}
            onChange={handlePriceChange}
            className={priceError ? "border-destructive" : ""}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={saveToLocalStorage}
            title="Save as default"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
        {priceError && <p className="text-xs text-destructive">{priceError}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="ml-per-set">Total mL per Ink Set</Label>
        <Input
          id="ml-per-set"
          type="number"
          min="1"
          step="1"
          value={mlInput}
          onChange={handleMlChange}
          className={mlError ? "border-destructive" : ""}
        />
        {mlError && <p className="text-xs text-destructive">{mlError}</p>}
        <p className="text-xs text-muted-foreground">
          Typically 600ml for standard CMYK ink sets
        </p>
      </div>
    </div>
  );
} 