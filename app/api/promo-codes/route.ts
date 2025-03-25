import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PromoCode } from '@/types/promo-codes'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const machineId = searchParams.get('machine_id')
  const brandId = searchParams.get('brand_id')
  const categoryId = searchParams.get('category_id')
  
  const supabase = await createServerClient()
  
  // Fetch all promo codes
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
  
  if (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: 'Failed to fetch promo codes', details: error }, { status: 500 })
  }
  
  // Filter the results in JavaScript rather than trying to build a complex query
  let filteredCodes = data || []
  
  // Apply filters based on URL parameters
  if (machineId || brandId || categoryId) {
    filteredCodes = filteredCodes.filter(code => {
      // Include global codes
      if (code.is_global) return true
      
      // Check specific filters
      if (machineId && code.applies_to_machine_id === machineId) return true
      if (brandId && code.applies_to_brand_id === brandId) return true
      if (categoryId && code.applies_to_category_id === categoryId) return true
      
      return false
    })
  }
  
  return NextResponse.json({ promoCodes: filteredCodes as PromoCode[] })
} 