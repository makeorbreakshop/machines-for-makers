export const runtime = 'nodejs'

import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Fetch discovered machines with site information
    const { data: discoveredProducts, error } = await supabase
      .from("discovered_machines")
      .select(`
        id,
        source_url,
        raw_data,
        normalized_data,
        validation_errors,
        validation_warnings,
        status,
        machine_type,
        similarity_score,
        created_at,
        imported_machine_id,
        scan_log_id,
        site_scan_logs (
          site_id,
          manufacturer_sites (
            name,
            base_url
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data for component
    const safeData = (discoveredProducts || []).map((product: any) => ({
      id: product.id,
      source_url: product.source_url,
      raw_data: product.raw_data,
      normalized_data: product.normalized_data,
      validation_errors: product.validation_errors || [],
      validation_warnings: product.validation_warnings || [],
      status: product.status,
      machine_type: product.machine_type,
      similarity_score: product.similarity_score,
      created_at: product.created_at,
      imported_machine_id: product.imported_machine_id,
      scan_log: {
        site: {
          name: product.site_scan_logs?.manufacturer_sites?.name || 'Unknown Site',
          base_url: product.site_scan_logs?.manufacturer_sites?.base_url || ''
        }
      }
    }))

    return NextResponse.json({ data: safeData })
  } catch (error) {
    console.error('Error fetching discovered machines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discovered machines' },
      { status: 500 }
    )
  }
}