import { NextResponse } from 'next/server'
import { PromoCode } from '@/types/promo-codes'
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const machineId = searchParams.get('machine_id')
  const brandId = searchParams.get('brand_id')
  const categoryId = searchParams.get('category_id')
  
  try {
    // Get Supabase URL and key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Create a new Supabase client for this request
    const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    
    // Fetch all promo codes
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
  
    if (error) {
      console.error("Supabase error:", error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
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
  } catch (error: any) {
    console.error("Error in promo-codes API route:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error?.message || String(error) },
      { status: 500 }
    )
  }
} 