export interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_percent: number | null
  discount_amount: number | null
  valid_from: string
  valid_until: string | null
  max_uses: number | null
  current_uses: number
  applies_to_machine_id: string | null
  applies_to_brand_id: string | null
  applies_to_category_id: string | null
  is_global: boolean
  created_at: string
  updated_at: string
  affiliate_link?: string | null
}

export interface PromoCodeDisplay {
  code: string
  description: string
  discountText: string
  validUntil: string | null
  isActive: boolean
  affiliateLink?: string | null
} 