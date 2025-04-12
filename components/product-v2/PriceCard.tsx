"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"
import { InfoIcon } from "lucide-react"
import { PriceTooltip } from "@/components/product/price-tooltip"

interface PriceCardProps {
  name: string
  price: number
  machineId: string
  mrsp?: number | null
  onAddToCart: () => void
  disabled?: boolean
  showPriceHistory?: boolean
}

export function PriceCard({ name, price, machineId, mrsp, onAddToCart, disabled, showPriceHistory = true }: PriceCardProps) {
  const discount = mrsp && mrsp > price ? Math.round(((mrsp - price) / mrsp) * 100) : null
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{name}</CardTitle>
        {discount && (
          <CardDescription className="text-green-600 font-medium">
            {discount}% off MSRP
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{formatPrice(price)}</span>
          {mrsp && mrsp > price && (
            <span className="text-muted-foreground line-through">{formatPrice(mrsp)}</span>
          )}
          {showPriceHistory && (
            <PriceTooltip 
              machineId={machineId}
              price={price}
              variant="dialog"
              className="ml-1"
            />
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onAddToCart} disabled={disabled}>
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  )
} 