import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const url = new URL(request.url)
    
    // Parse query parameters
    const status = url.searchParams.get('status')
    const machineType = url.searchParams.get('machine_type')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('discovered_machines')
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
        scan_log_id,
        site_scan_logs!inner (
          site_id,
          manufacturer_sites!inner (
            name,
            base_url
          )
        )
      `)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (machineType) {
      query = query.eq('machine_type', machineType)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching discovered machines:', error)
      return NextResponse.json(
        { error: 'Failed to fetch discovered machines' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Error in discovery GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}