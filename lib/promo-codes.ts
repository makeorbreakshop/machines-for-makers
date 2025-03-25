"use client"

import { PromoCode, PromoCodeDisplay } from "@/types/promo-codes"

// Format a date for display
function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  }).format(date)
}

// Format the discount for display
function formatDiscount(promoCode: PromoCode): string {
  if (promoCode.discount_percent) {
    return `${promoCode.discount_percent}% off`
  } else if (promoCode.discount_amount) {
    // Handle both string and number values for discount_amount
    const amount = typeof promoCode.discount_amount === 'string' 
      ? parseFloat(promoCode.discount_amount)
      : promoCode.discount_amount;
    
    return `$${amount.toFixed(2)} off`
  }
  return 'Special offer'
}

// Check if a promo code is currently active
function isPromoCodeActive(promoCode: PromoCode): boolean {
  const now = new Date();
  
  // For xTool promo codes specifically, ignore valid_from date entirely
  if (promoCode.applies_to_brand_id === '2b0c2371-bedb-4af3-8457-be2d26a378c8') {
    // Only check if code has expired (valid_until)
    const validUntil = promoCode.valid_until ? new Date(promoCode.valid_until) : null;
    const isNotExpired = !validUntil || validUntil >= now;
    
    // Check if code still has uses left
    const hasUsesLeft = !promoCode.max_uses || promoCode.current_uses < promoCode.max_uses;
    
    return isNotExpired && hasUsesLeft;
  }
  
  // Regular processing for other promo codes
  const validFrom = new Date(promoCode.valid_from);
  const validUntil = promoCode.valid_until ? new Date(promoCode.valid_until) : null;
  
  // Check if code is valid based on dates
  const isInValidDateRange = validFrom <= now && (!validUntil || validUntil >= now);
  
  // Check if code still has uses left
  const hasUsesLeft = !promoCode.max_uses || promoCode.current_uses < promoCode.max_uses;
  
  return isInValidDateRange && hasUsesLeft;
}

// Transform a PromoCode to a display-friendly format
export function formatPromoCodeForDisplay(promoCode: PromoCode): PromoCodeDisplay {
  return {
    code: promoCode.code,
    description: promoCode.description || '',
    discountText: formatDiscount(promoCode),
    validUntil: formatDate(promoCode.valid_until),
    isActive: isPromoCodeActive(promoCode),
    affiliateLink: promoCode.affiliate_link || null
  }
}

// Fetch promo codes for a machine, brand, or category
export async function fetchPromoCodes({
  machineId,
  brandId,
  categoryId
}: {
  machineId?: string | number;
  brandId?: string | number;
  categoryId?: string | number;
}): Promise<PromoCodeDisplay[]> {
  // Build query parameters
  const params = new URLSearchParams()
  if (machineId) params.append('machine_id', machineId.toString())
  if (brandId) params.append('brand_id', brandId.toString())
  if (categoryId) params.append('category_id', categoryId.toString())
  
  try {
    const response = await fetch(`/api/promo-codes?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch promo codes')
    }
    
    const { promoCodes } = await response.json()
    
    // Format promo codes for display
    return promoCodes.map(formatPromoCodeForDisplay)
  } catch (error) {
    console.error('Error fetching promo codes:', error)
    return []
  }
} 