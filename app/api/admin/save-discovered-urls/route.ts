import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface SaveDiscoveredURLsRequest {
  manufacturer_id: string
  urls: string[]
  categories?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body: SaveDiscoveredURLsRequest = await request.json()
    
    const { manufacturer_id, urls, categories = {} } = body
    
    if (!manufacturer_id || !urls || urls.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Prepare URLs for insertion
    const urlsToInsert = urls.map(url => ({
      manufacturer_id,
      url,
      category: categories[url] || 'unknown',
      status: 'pending'
    }))
    
    // Insert URLs (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('discovered_urls')
      .upsert(urlsToInsert, {
        onConflict: 'manufacturer_id,url',
        ignoreDuplicates: false
      })
      .select()
    
    if (error) {
      console.error('Error saving discovered URLs:', error)
      return NextResponse.json(
        { error: 'Failed to save URLs' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      saved: data?.length || 0,
      total: urls.length
    })
    
  } catch (error) {
    console.error('Error in save-discovered-urls:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const manufacturer_id = searchParams.get('manufacturer_id')
    const status = searchParams.get('status')
    const duplicate_status = searchParams.get('duplicate_status')
    
    // First get discovered URLs with duplicate detection fields
    let query = supabase
      .from('discovered_urls')
      .select('*')
      .order('discovered_at', { ascending: false })
    
    if (manufacturer_id) {
      query = query.eq('manufacturer_id', manufacturer_id)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (duplicate_status) {
      query = query.eq('duplicate_status', duplicate_status)
    }
    
    const { data: urls, error } = await query
    
    if (error) {
      console.error('Error fetching discovered URLs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch URLs' },
        { status: 500 }
      )
    }
    
    if (!urls || urls.length === 0) {
      return NextResponse.json([])
    }
    
    // Get unique manufacturer IDs and existing machine IDs
    const manufacturerIds = [...new Set(urls.map(u => u.manufacturer_id).filter(Boolean))]
    const existingMachineIds = [...new Set(urls.map(u => u.existing_machine_id).filter(Boolean))]
    
    // Fetch manufacturer sites
    const { data: manufacturerSites } = await supabase
      .from('manufacturer_sites')
      .select('id, name, base_url')
      .in('id', manufacturerIds)
    
    // Fetch existing machines if any
    const { data: existingMachines } = existingMachineIds.length > 0 
      ? await supabase
          .from('machines')
          .select('id, "Machine Name", "Company", "Machine Category", "Internal link", "Image", "Laser Power A", "Price"')
          .in('id', existingMachineIds)
      : { data: [] }
    
    // Create lookup maps
    const manufacturerMap = new Map(manufacturerSites?.map(m => [m.id, m]) || [])
    const existingMachineMap = new Map(existingMachines?.map(m => [m.id, m]) || [])
    
    // Combine the data
    const enrichedUrls = urls.map(url => ({
      ...url,
      manufacturer_sites: manufacturerMap.get(url.manufacturer_id) || { id: url.manufacturer_id, name: 'Unknown', base_url: '' },
      existing_machine: url.existing_machine_id ? existingMachineMap.get(url.existing_machine_id) || null : null
    }))
    
    return NextResponse.json(enrichedUrls)
    
  } catch (error) {
    console.error('Error in get discovered URLs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}