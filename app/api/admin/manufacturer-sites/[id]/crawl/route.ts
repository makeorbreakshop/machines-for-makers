import { createServiceClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

// POST trigger manual crawl for a manufacturer site
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()
    const body = await request.json()

    // Validate site exists
    const { data: site, error: siteError } = await supabase
      .from("manufacturer_sites")
      .select("*")
      .eq("id", id)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: "Manufacturer site not found" },
        { status: 404 }
      )
    }

    // Create a scan log entry
    const scanData = {
      site_id: id,
      scan_type: body.scan_type || 'discovery',
      status: 'running',
      started_at: new Date().toISOString()
    }

    const { data: scanLog, error: scanError } = await supabase
      .from("site_scan_logs")
      .insert(scanData)
      .select()
      .single()

    if (scanError) {
      console.error("Error creating scan log:", scanError)
      return NextResponse.json({ error: scanError.message }, { status: 500 })
    }

    // Call the Python discovery service
    let result = null
    try {
      const discoveryRequest = {
        manufacturer_id: id,
        base_url: site.base_url,
        max_pages: body.max_pages || 5
      }

      console.log(`Triggering discovery for site ${id}, scan log ID: ${scanLog.id}`)
      
      // Call Python discovery service (runs on port 8000)
      const response = await fetch('http://localhost:8000/api/v1/discover-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discoveryRequest)
      }).catch(fetchError => {
        console.error('Failed to reach discovery service:', fetchError)
        throw new Error('Discovery service is not running. Please start it with: cd price-extractor-python && ./start-discovery')
      })

      if (!response.ok) {
        const error = await response.json()
        const errorMessage = typeof error.detail === 'string' 
          ? error.detail 
          : JSON.stringify(error.detail || error)
        throw new Error(errorMessage || 'Failed to start discovery')
      }

      result = await response.json()
      console.log('Discovery completed:', result)
      
      // Save discovered URLs to database
      if (result.urls && result.urls.length > 0) {
        // Find the corresponding brand for this manufacturer site
        const { data: brand } = await supabase
          .from("brands")
          .select("id")
          .ilike("Name", site.name)
          .single()
        
        if (!brand) {
          console.error(`No brand found matching site name: ${site.name}`)
          throw new Error(`No brand found for manufacturer site: ${site.name}`)
        }
        
        // Create a map of URL to category from categorized data
        const categoryMap = new Map<string, string>()
        if (result.categorized) {
          for (const [category, urls] of Object.entries(result.categorized)) {
            (urls as string[]).forEach(url => categoryMap.set(url, category))
          }
        }
        
        const urlsToInsert = result.urls.map((url: string) => ({
          manufacturer_id: brand.id, // Use the matched brand ID
          url: url,
          category: categoryMap.get(url) || 'unknown',
          status: 'pending',
          discovered_at: new Date().toISOString()
        }))
        
        const { error: insertError } = await supabase
          .from("discovered_urls")
          .upsert(urlsToInsert, { 
            onConflict: 'manufacturer_id,url',
            ignoreDuplicates: false 
          })
        
        if (insertError) {
          console.error("Error saving discovered URLs:", insertError)
        } else {
          console.log(`Saved ${urlsToInsert.length} discovered URLs`)
        }
        
        // Update scan log with success
        await supabase
          .from("site_scan_logs")
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            urls_found: result.total_urls_found,
            credits_used: result.credits_used
          })
          .eq("id", scanLog.id)
        
        // Run duplicate detection for this manufacturer
        try {
          console.log('Running duplicate detection...')
          const duplicateResponse = await fetch('http://localhost:8000/api/v1/run-duplicate-detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manufacturer_id: brand.id })
          })
          
          if (duplicateResponse.ok) {
            const duplicateResults = await duplicateResponse.json()
            console.log('Duplicate detection results:', duplicateResults)
          } else {
            console.error('Duplicate detection failed:', await duplicateResponse.text())
          }
        } catch (duplicateError) {
          console.error('Error running duplicate detection:', duplicateError)
          // Don't fail the whole process if duplicate detection fails
        }
      }
      
    } catch (error) {
      console.error('Failed to start discovery:', error)
      // Update scan log with error
      await supabase
        .from("site_scan_logs")
        .update({ 
          status: 'failed',
          error_log: { error: error.message }
        })
        .eq("id", scanLog.id)
    }

    return NextResponse.json({
      success: true,
      scanLogId: scanLog.id,
      message: "Crawl job queued successfully",
      results: result || null
    })

  } catch (error: any) {
    console.error("Error triggering crawl:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}