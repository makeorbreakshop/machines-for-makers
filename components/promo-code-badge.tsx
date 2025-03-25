"use client"

import { Copy, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { PromoCodeDisplay } from "@/types/promo-codes"

interface PromoCodeBadgeProps {
  promoCode: PromoCodeDisplay
  className?: string
  size?: "sm" | "md" | "lg"
  simplified?: boolean
}

export function PromoCodeBadge({
  promoCode,
  className,
  size = "md",
  simplified = false
}: PromoCodeBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1 gap-1",
    md: "text-sm px-3 py-1.5 gap-1.5",
    lg: "text-base px-4 py-2 gap-2"
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promoCode.code)
    toast({
      title: "Code copied!",
      description: `"${promoCode.code}" has been copied to clipboard.`,
      duration: 3000
    })
  }

  const openAffiliateLink = () => {
    if (promoCode.affiliateLink) {
      window.open(promoCode.affiliateLink, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div 
      className={cn(
        "flex items-center rounded-md border border-dashed",
        promoCode.isActive 
          ? "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400" 
          : "bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800/30 dark:border-gray-700",
        sizeClasses[size],
        simplified ? "justify-between w-full" : "w-fit",
        className
      )}
    >
      <div className={cn("flex", simplified ? "flex-row items-center" : "flex-col flex-1")}>
        <span className="font-medium">{promoCode.code}</span>
        
        {!simplified && (
          <>
            {promoCode.description && (
              <span className="text-xs opacity-80">{promoCode.description}</span>
            )}
            <span className="text-xs font-semibold">{promoCode.discountText}</span>
            {promoCode.validUntil && (
              <span className="text-xs opacity-70">Expires: {promoCode.validUntil}</span>
            )}
          </>
        )}
      </div>
      
      <div className="flex gap-1">
        {promoCode.affiliateLink && (
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-full h-6 w-6",
              promoCode.isActive
                ? "hover:bg-green-100 dark:hover:bg-green-900/30"
                : "hover:bg-gray-200 dark:hover:bg-gray-700/50"
            )}
            onClick={openAffiliateLink}
            title="Visit site"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="sr-only">Visit site</span>
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "rounded-full h-6 w-6",
            promoCode.isActive
              ? "hover:bg-green-100 dark:hover:bg-green-900/30"
              : "hover:bg-gray-200 dark:hover:bg-gray-700/50"
          )}
          onClick={copyToClipboard}
          title="Copy code"
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="sr-only">Copy code</span>
        </Button>
      </div>
    </div>
  )
} 