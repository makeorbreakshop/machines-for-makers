import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { productIds, single } = await request.json()

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
        // Get the discovered product
        const { data: discoveredProduct, error: fetchError } = await supabase
          .from('discovered_machines')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError || !discoveredProduct) {
          errors.push(`Product ${productId} not found`)
          continue
        }

        if (discoveredProduct.status === 'approved') {
          results.push({
            productId,
            status: 'already_approved',
            machineId: discoveredProduct.imported_machine_id
          })
          continue
        }

        // Create machine from normalized data
        const machineData = {
          id: uuidv4(),
          ...discoveredProduct.normalized_data,
          // Add discovery metadata
          discovery_source: 'automated_discovery',
          specifications: discoveredProduct.raw_data || {},
          // Set as draft initially
          "Published On": null, // Draft state
          "Updated On": new Date().toISOString(),
        }

        // Insert into machines table
        const { data: newMachine, error: insertError } = await supabase
          .from('machines')
          .insert([machineData])
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting machine:', insertError)
          errors.push(`Failed to create machine for product ${productId}: ${insertError.message}`)
          continue
        }

        // Update discovered_machines status
        const { error: updateError } = await supabase
          .from('discovered_machines')
          .update({
            status: 'approved',
            imported_machine_id: newMachine.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)

        if (updateError) {
          console.error('Error updating discovery status:', updateError)
          // Try to cleanup the created machine
          await supabase.from('machines').delete().eq('id', newMachine.id)
          errors.push(`Failed to update discovery status for product ${productId}`)
          continue
        }

        results.push({
          productId,
          status: 'approved',
          machineId: newMachine.id
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
    console.error('Error in discovery approve:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}