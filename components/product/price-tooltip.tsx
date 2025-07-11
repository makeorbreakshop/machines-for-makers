"use client"

import { useState } from "react"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { InfoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay 
} from "@/components/ui/dialog"
import { PriceHistoryChart } from "@/components/product/price-history-chart"

interface PriceTooltipProps {
  machineId: string
  price: number
  className?: string
  variant?: "popover" | "dialog"
}

export function PriceTooltip({ 
  machineId, 
  price,
  className,
  variant = "popover",
  children
}: PriceTooltipProps & { children?: React.ReactNode }) {
  if (variant === "popover") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {children ? (
            children
          ) : (
            <button className={`text-slate-400 hover:text-slate-600 transition-colors ${className}`}>
              <InfoIcon className="h-5 w-5" />
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 pb-2">
            <h3 className="font-semibold mb-1">Price History</h3>
            <p className="text-sm text-muted-foreground">Track price changes over time</p>
          </div>
          <PriceHistoryChart 
            machineId={machineId} 
            currentPrice={price}
            compact={true}
          />
          <div className="p-2 text-xs text-center text-muted-foreground border-t">
            <span>Updated daily</span>
          </div>
        </PopoverContent>
      </Popover>
    )
  } else {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className={`text-xs ${className}`}>
            <InfoIcon className="h-3 w-3 mr-1" />
            Price History
          </Button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay className="bg-transparent" />
          <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 border shadow-xl">
            <DialogHeader>
              <DialogTitle>Price History</DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">Track price changes over time</p>
              <PriceHistoryChart 
                machineId={machineId} 
                currentPrice={price}
              />
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    )
  }
} 