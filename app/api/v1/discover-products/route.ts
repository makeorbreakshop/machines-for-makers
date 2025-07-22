import { createServiceClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

// POST start product discovery for a manufacturer site
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await request.json()

    const { site_id, scan_type = 'discovery', force = false } = body

    // Validate required fields
    if (!site_id) {
      return NextResponse.json(
        { error: "site_id is required" },
        { status: 400 }
      )
    }

    // Check if site exists and is active
    const { data: site, error: siteError } = await supabase
      .from("manufacturer_sites")
      .select("*")
      .eq("id", site_id)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: "Manufacturer site not found" },
        { status: 404 }
      )
    }

    if (!site.is_active && !force) {
      return NextResponse.json(
        { error: "Site is inactive. Use force=true to override." },
        { status: 400 }
      )
    }

    // Check for recent scans (prevent duplicate runs)
    const recentCutoff = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    const { data: recentScans } = await supabase
      .from("site_scan_logs")
      .select("id, status")
      .eq("site_id", site_id)
      .gte("started_at", recentCutoff.toISOString())
      .eq("status", "running")

    if (recentScans && recentScans.length > 0 && !force) {
      return NextResponse.json(
        { 
          error: "A scan is already running for this site. Use force=true to override.",
          running_scan_id: recentScans[0].id
        },
        { status: 409 }
      )
    }

    // Create scan log entry
    const { data: scanLog, error: scanError } = await supabase
      .from("site_scan_logs")
      .insert({
        site_id,
        scan_type,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (scanError) {
      console.error("Error creating scan log:", scanError)
      return NextResponse.json(
        { error: "Failed to create scan log" },
        { status: 500 }
      )
    }

    // TODO: Queue the actual discovery job
    // For now, we'll call the Python service directly
    try {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'
      const discoveryResponse = await fetch(`${pythonServiceUrl}/api/v1/discover-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scan_log_id: scanLog.id,
          site_id,
          base_url: site.base_url,
          sitemap_url: site.sitemap_url,
          scraping_config: site.scraping_config,
          scan_type
        }),
      })

      if (!discoveryResponse.ok) {
        // Update scan log with error
        await supabase
          .from("site_scan_logs")
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_log: { error: 'Failed to start discovery in Python service' }
          })
          .eq("id", scanLog.id)

        return NextResponse.json(
          { error: "Failed to start discovery process" },
          { status: 500 }
        )
      }

      const discoveryResult = await discoveryResponse.json()
      console.log(`Discovery started for site ${site_id}:`, discoveryResult)

    } catch (pythonServiceError) {
      console.error("Error calling Python service:", pythonServiceError)
      
      // Update scan log with error
      await supabase
        .from("site_scan_logs")
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_log: { error: `Python service error: ${pythonServiceError}` }
        })
        .eq("id", scanLog.id)

      return NextResponse.json(
        { 
          error: "Python service unavailable. Discovery process not started.",
          details: pythonServiceError instanceof Error ? pythonServiceError.message : String(pythonServiceError)
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      scan_log_id: scanLog.id,
      site_url: site.base_url,
      scan_type,
      message: "Product discovery started"
    })

  } catch (error: any) {
    console.error("Error starting product discovery:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}