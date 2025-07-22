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
    try {
      const discoveryRequest = {
        scan_log_id: scanLog.id,
        site_id: id,
        base_url: site.base_url,
        sitemap_url: site.sitemap_url,
        scraping_config: site.scraping_config || {},
        scan_type: scanData.scan_type
      }

      console.log(`Triggering discovery for site ${id}, scan log ID: ${scanLog.id}`)
      
      // Call Python discovery service (runs on port 8001)
      const response = await fetch('http://localhost:8001/api/v1/discover-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discoveryRequest)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to start discovery')
      }

      const result = await response.json()
      console.log('Discovery started:', result)
      
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
      message: "Crawl job queued successfully"
    })

  } catch (error: any) {
    console.error("Error triggering crawl:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}