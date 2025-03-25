"use client"

import { useState } from "react"
import { PromoCodeDisplay } from "@/types/promo-codes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Copy, Tag, Scissors, Check, ChevronDown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface ProductPromoHighlightProps {
  promoCode: PromoCodeDisplay
  className?: string
}

export function ProductPromoHighlight({ promoCode, className }: ProductPromoHighlightProps) {
  const [copied, setCopied] = useState(false)

  // Extract numeric value from discount text (e.g., "10% off" → "10")
  const discountValue = promoCode.discountText.match(/(\d+)/)?.[0] || ""
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(promoCode.code)
    setCopied(true)
    toast({
      title: "Code copied!",
      description: `"${promoCode.code}" has been copied to clipboard.`,
      duration: 3000
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "border border-dashed rounded-md p-3 mb-4 bg-green-50/70 dark:bg-green-950/20 border-green-200 dark:border-green-800",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-green-600 dark:text-green-500" />
          <span className="text-sm font-medium text-green-800 dark:text-green-400">
            Save {discountValue && <span className="font-bold">{discountValue}%</span>} with promo code:
          </span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="h-7 px-2 border-green-200 dark:border-green-800 bg-white/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-900 text-xs"
            >
              Details
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">About this promo</h4>
              {promoCode.description && (
                <p className="text-xs text-muted-foreground">{promoCode.description}</p>
              )}
              <div className="text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{promoCode.discountText}</div>
                {promoCode.validUntil && (
                  <div>Expires: {promoCode.validUntil}</div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="mt-2 flex items-center">
        <div className="flex-1 relative">
          <Badge
            variant="outline"
            className="w-full h-9 justify-between items-center bg-white dark:bg-gray-900 border-green-200 dark:border-green-800 text-base font-mono font-bold px-3 py-1"
          >
            {promoCode.code}
            <Scissors className="h-3.5 w-3.5 rotate-90 text-green-600 dark:text-green-500" />
          </Badge>
          
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-full rounded-l-none text-xs px-3 text-green-700 dark:text-green-400 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-center text-green-700 dark:text-green-500">
        Copy code and apply at checkout to save {promoCode.discountText.toLowerCase()}
      </div>
    </div>
  )
} 