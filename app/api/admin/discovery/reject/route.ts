import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { productIds, reason } = await request.json()

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs are required' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    for (const productId of productIds) {
      try {
        // Check if product exists and is not already processed
        const { data: existing, error: fetchError } = await supabase
          .from('discovered_machines')
          .select('id, status')
          .eq('id', productId)
          .single()

        if (fetchError || !existing) {
          errors.push(`Product ${productId} not found`)
          continue
        }

        if (existing.status === 'rejected') {
          results.push({
            productId,
            status: 'already_rejected'
          })
          continue
        }

        // Update status to rejected
        const { error: updateError } = await supabase
          .from('discovered_machines')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Store rejection reason in validation_errors
            validation_errors: existing.status === 'pending' ? 
              [`Rejected: ${reason || 'No reason provided'}`] :
              [`Rejected: ${reason || 'No reason provided'}`] // Override existing errors
          })
          .eq('id', productId)

        if (updateError) {
          console.error('Error updating discovery status:', updateError)
          errors.push(`Failed to reject product ${productId}: ${updateError.message}`)
          continue
        }

        results.push({
          productId,
          status: 'rejected'
        })

      } catch (error) {
        console.error(`Error processing product ${productId}:`, error)
        errors.push(`Error processing product ${productId}: ${error}`)
      }
    }

    const response = {
      success: errors.length === 0,
      results,
      errors
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(response, { status: 400 })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in discovery reject:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}