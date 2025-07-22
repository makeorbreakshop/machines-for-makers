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

    // TODO: Queue the actual crawl job here
    // For now, we'll just return the scan log ID that can be used to track progress
    // In a real implementation, this would:
    // 1. Add job to a queue (Redis, database job queue, etc.)
    // 2. Background worker would pick up the job
    // 3. Worker would crawl the site and update the scan log
    // 4. Worker would discover products and populate discovered_machines table

    console.log(`Manual crawl triggered for site ${id}, scan log ID: ${scanLog.id}`)
    console.log(`Site URL: ${site.base_url}`)
    console.log(`Scan type: ${scanData.scan_type}`)

    // For development, we'll simulate adding a job to a queue
    const crawlJob = {
      scanLogId: scanLog.id,
      siteId: id,
      baseUrl: site.base_url,
      sitemapUrl: site.sitemap_url,
      scrapingConfig: site.scraping_config,
      scanType: scanData.scan_type
    }

    // TODO: Replace this with actual queue integration
    // await addCrawlJobToQueue(crawlJob)

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