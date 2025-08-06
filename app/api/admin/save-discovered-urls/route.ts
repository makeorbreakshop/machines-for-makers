import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface SaveDiscoveredURLsRequest {
  manufacturer_id: string
  urls: string[]
  categories?: Record<string, string>
  classified_urls?: {
    auto_skip: Array<{url: string, classification: string, confidence: number, reason: string, category: string}>
    high_confidence: Array<{url: string, classification: string, confidence: number, reason: string, category: string}>
    needs_review: Array<{url: string, classification: string, confidence: number, reason: string, category: string}>
    duplicate_likely: Array<{url: string, classification: string, confidence: number, reason: string, category: string}>
  }
  classification_summary?: any
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body: SaveDiscoveredURLsRequest = await request.json()
    
    const { manufacturer_id, urls, categories = {}, classified_urls, classification_summary } = body
    
    if (!manufacturer_id || (!urls || urls.length === 0) && !classified_urls) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    let urlsToInsert: any[] = []
    let summary = {
      total: 0,
      auto_skip: 0,
      high_confidence: 0,
      needs_review: 0,
      duplicate_likely: 0,
      saved: 0
    }
    
    // Handle classified URLs if provided
    if (classified_urls) {
      // Save all URLs for auditing (including auto_skip)
      const urlsToSave = [
        ...classified_urls.high_confidence,
        ...classified_urls.needs_review,
        ...classified_urls.auto_skip,
        ...classified_urls.duplicate_likely
      ]
      
      urlsToInsert = urlsToSave.map(item => {
        // Determine if this should be auto-skipped
        const mlClassification = (item as any).ml_classification
        const shouldAutoSkip = mlClassification && 
          ['MATERIAL', 'ACCESSORY', 'SERVICE'].includes(mlClassification)
        
        const urlData = {
          manufacturer_id,
          url: item.url,
          category: item.category || categories[item.url] || 'unknown',
          status: shouldAutoSkip ? 'skipped' : 'pending',
          // Use the new ML columns
          ml_classification: mlClassification || null,
          ml_confidence: (item as any).confidence || null,
          ml_reason: (item as any).reason || null,
          machine_type: (item as any).machine_type || null,
          should_auto_skip: shouldAutoSkip,
          // Explicitly set all URLs to unreviewed when bringing them in
          reviewed: false
        }
        
        // Log what we're saving
        if (mlClassification === 'MACHINE') {
          console.log(`Saving MACHINE as pending: ${item.url}`)
        } else if (shouldAutoSkip) {
          console.log(`Saving ${mlClassification} as skipped: ${item.url}`)
        }
        
        return urlData
      })
      
      summary = {
        total: Object.values(classified_urls).flat().length,
        auto_skip: classified_urls.auto_skip.length,
        high_confidence: classified_urls.high_confidence.length,
        needs_review: classified_urls.needs_review.length,
        duplicate_likely: classified_urls.duplicate_likely.length,
        saved: urlsToInsert.length
      }
    } else {
      // Fallback to old method for backwards compatibility
      urlsToInsert = urls.map(url => ({
        manufacturer_id,
        url,
        category: categories[url] || 'unknown',
        status: 'pending',
        reviewed: false
      }))
      
      summary.total = urls.length
      summary.saved = urls.length
    }
    
    console.log(`Saving ${urlsToInsert.length} URLs to database`)
    console.log(`Status breakdown: ${urlsToInsert.filter(u => u.status === 'pending').length} pending, ${urlsToInsert.filter(u => u.status === 'skipped').length} skipped`)
    console.log(`Sample URL being saved:`, JSON.stringify(urlsToInsert[0], null, 2))
    
    // Upsert URLs but force update of key fields including reviewed status
    // When URLs already exist, we want to reset them to unreviewed state
    const { data, error } = await supabase
      .from('discovered_urls')
      .upsert(urlsToInsert, {
        onConflict: 'manufacturer_id,url',
        ignoreDuplicates: false,
        // Update all fields on conflict to ensure reviewed is set to false
        defaultToNull: false
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
      total: summary.total,
      classification_summary: summary,
      auto_skip_count: summary.auto_skip,
      high_confidence_count: summary.high_confidence,
      needs_review_count: summary.needs_review,
      duplicate_likely_count: summary.duplicate_likely
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
    const reviewed = searchParams.get('reviewed')
    
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
    
    if (reviewed) {
      query = query.eq('reviewed', reviewed === 'true')
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