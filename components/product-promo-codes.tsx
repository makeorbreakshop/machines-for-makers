"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle, MinusCircle } from "lucide-react"
import { PromoCodeBadge } from "@/components/promo-code-badge"
import { PromoCodeDisplay } from "@/types/promo-codes"

interface ProductPromoCodesProps {
  promoCodes: PromoCodeDisplay[]
  className?: string
}

export function ProductPromoCodes({ promoCodes, className }: ProductPromoCodesProps) {
  const [expanded, setExpanded] = useState(false)
  
  if (!promoCodes || promoCodes.length === 0) return null
  
  // Only show active promo codes by default
  const activePromoCodes = promoCodes.filter(code => code.isActive)
  
  if (activePromoCodes.length === 0) return null

  const toggleExpanded = () => setExpanded(!expanded)
  
  // Show just the first promo code when not expanded
  const displayCodes = expanded ? activePromoCodes : [activePromoCodes[0]]
  const hasMoreCodes = activePromoCodes.length > 1

  return (
    <div className={`space-y-2 mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Promo Codes</h3>
        {hasMoreCodes && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs" 
            onClick={toggleExpanded}
          >
            {expanded ? (
              <>
                <MinusCircle className="h-3.5 w-3.5 mr-1" />
                Show less
              </>
            ) : (
              <>
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                Show {activePromoCodes.length - 1} more
              </>
            )}
          </Button>
        )}
      </div>
      
      <div className="flex flex-col gap-2">
        {displayCodes.map((code) => (
          <PromoCodeBadge key={code.code} promoCode={code} />
        ))}
      </div>
    </div>
  )
} 