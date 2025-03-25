"use client"

import { useState } from "react"
import { PromoCodeDisplay } from "@/types/promo-codes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, Tag } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface ProductPromoSimpleProps {
  promoCode: PromoCodeDisplay
  className?: string
}

export function ProductPromoSimple({ promoCode, className }: ProductPromoSimpleProps) {
  // Don't render if it's just an affiliate link with no actual discount
  if (promoCode.discountText === 'Special offer' && promoCode.description?.toLowerCase().includes('affiliate')) {
    return null
  }

  const [copied, setCopied] = useState(false)
  
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

  // Extract numeric value from discount text (e.g., "10% off" → "10")
  const discountValue = promoCode.discountText.match(/(\d+)/)?.[0] || ""

  return (
    <div className={cn(
      "inline-flex items-center gap-2",
      className
    )}>
      <Badge 
        variant="outline"
        className="bg-green-50/70 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 font-mono px-2 py-1 h-7"
      >
        <Tag className="h-3 w-3 mr-1 text-green-600 dark:text-green-500" />
        {promoCode.code} <span className="ml-1 font-semibold">({promoCode.discountText})</span>
      </Badge>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-green-700 dark:text-green-400 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
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
  )
} 