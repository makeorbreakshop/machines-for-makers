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
    
    // First get discovered URLs
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
    
    // Get unique manufacturer IDs and machine IDs
    const manufacturerIds = [...new Set(urls.map(u => u.manufacturer_id).filter(Boolean))]
    const machineIds = [...new Set(urls.map(u => u.machine_id).filter(Boolean))]
    
    // Fetch manufacturer sites
    const { data: manufacturerSites } = await supabase
      .from('manufacturer_sites')
      .select('id, name, base_url')
      .in('id', manufacturerIds)
    
    // Fetch machines if any
    const { data: machines } = machineIds.length > 0 
      ? await supabase
          .from('machines')
          .select('id, "Machine Name", slug')
          .in('id', machineIds)
      : { data: [] }
    
    // Create lookup maps
    const manufacturerMap = new Map(manufacturerSites?.map(m => [m.id, m]) || [])
    const machineMap = new Map(machines?.map(m => [m.id, m]) || [])
    
    // Combine the data
    const enrichedUrls = urls.map(url => ({
      ...url,
      manufacturer_sites: manufacturerMap.get(url.manufacturer_id) || { id: url.manufacturer_id, name: 'Unknown', base_url: '' },
      machines: url.machine_id ? machineMap.get(url.machine_id) || null : null
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