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
        const data = discoveredProduct.normalized_data || discoveredProduct.raw_data;
        
        // Get or create the brand
        const brandName = data.company || data.brand || data.manufacturer || 'Unknown Brand';
        
        // Check if brand exists and get its slug
        const { data: existingBrand, error: brandFetchError } = await supabase
          .from('brands')
          .select('Name, Slug')
          .eq('Name', brandName)
          .single();

        if (brandFetchError) {
          console.error('Brand not found:', brandName, brandFetchError);
          errors.push(`Brand "${brandName}" not found in brands table for product ${productId}`);
          continue;
        }
        
        // Helper function to ensure URLs use https
        const ensureHttps = (url: string | null): string | null => {
          if (!url) return null;
          if (typeof url !== 'string') return null;
          return url.replace(/^http:\/\//i, 'https://');
        };
        
        const machineData = {
          'Machine Name': data.name || data.title || data.machine_name || 'Imported Machine',
          'Company': existingBrand.Slug,
          'Machine Category': data.machine_category || 'laser',
          'Laser Category': data.laser_category || null,
          'Price': data.price ? parseFloat(String(data.price).replace(/[^0-9.-]/g, '')) || null : null,
          'Laser Type A': data.laser_type_a || data.laser_type || null,
          'Laser Power A': data.laser_power_a || data.power || null,
          'Work Area': data.work_area || null,
          'Speed': data.speed || null,
          'Image': ensureHttps(data.images?.[0] || data.image || data.image_url || null),
          'Description': data.description || null,
          'product_link': ensureHttps(discoveredProduct.source_url),
          'Hidden': true, // Start as hidden/draft
          'Published On': null, // Start as draft
          'Created On': new Date().toISOString(),
          'Updated On': new Date().toISOString(),
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

        // Update discovered_machines with imported machine ID and mark as approved
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