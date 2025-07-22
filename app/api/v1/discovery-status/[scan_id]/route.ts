import { createServiceClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

// GET discovery status by scan log ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scan_id: string }> }
) {
  try {
    const { scan_id } = await params
    const supabase = createServiceClient()

    // Get scan log details
    const { data: scanLog, error: scanError } = await supabase
      .from("site_scan_logs")
      .select(`
        *,
        manufacturer_sites(
          id,
          base_url,
          brands(Name)
        )
      `)
      .eq("id", scan_id)
      .single()

    if (scanError || !scanLog) {
      return NextResponse.json(
        { error: "Scan log not found" },
        { status: 404 }
      )
    }

    // Get discovered machines count for this scan
    const { count: discoveredCount, error: countError } = await supabase
      .from("discovered_machines")
      .select("*", { count: 'exact', head: true })
      .eq("site_id", scanLog.site_id)
      .gte("discovered_at", scanLog.started_at)

    if (countError) {
      console.error("Error counting discovered machines:", countError)
    }

    // Get recent discovered machines as examples
    const { data: recentMachines, error: machinesError } = await supabase
      .from("discovered_machines")
      .select("id, discovered_url, page_title, import_status, discovered_at")
      .eq("site_id", scanLog.site_id)
      .gte("discovered_at", scanLog.started_at)
      .order("discovered_at", { ascending: false })
      .limit(10)

    if (machinesError) {
      console.error("Error fetching recent machines:", machinesError)
    }

    // Calculate progress
    const progress = scanLog.status === 'completed' ? 100 : 
                    scanLog.status === 'failed' ? 0 :
                    scanLog.pages_crawled ? Math.min((scanLog.pages_crawled / 100) * 100, 99) : 0

    // Calculate duration
    const startTime = new Date(scanLog.started_at)
    const endTime = scanLog.completed_at ? new Date(scanLog.completed_at) : new Date()
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.floor(durationMs / 60000)

    const response = {
      scan_id,
      status: scanLog.status,
      scan_type: scanLog.scan_type,
      site_url: scanLog.manufacturer_sites?.base_url,
      brand_name: scanLog.manufacturer_sites?.brands?.Name,
      started_at: scanLog.started_at,
      completed_at: scanLog.completed_at,
      duration_minutes: durationMinutes,
      progress_percent: progress,
      
      // Statistics
      pages_crawled: scanLog.pages_crawled || 0,
      products_found: scanLog.products_found || 0,
      new_products: scanLog.new_products || 0,
      discovered_machines_count: discoveredCount || 0,
      cost_usd: scanLog.cost_usd ? parseFloat(scanLog.cost_usd.toString()) : null,
      
      // Error information
      error_log: scanLog.error_log,
      
      // Recent discoveries
      recent_machines: recentMachines || [],
      
      // Status indicators
      is_running: scanLog.status === 'running',
      is_completed: scanLog.status === 'completed',
      is_failed: scanLog.status === 'failed',
      
      // Next steps
      next_actions: getNextActions(scanLog.status, discoveredCount || 0)
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error("Error fetching discovery status:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}

function getNextActions(status: string, discoveredCount: number): string[] {
  const actions = []

  if (status === 'running') {
    actions.push("Discovery is in progress...")
  } else if (status === 'completed') {
    if (discoveredCount > 0) {
      actions.push(`Review ${discoveredCount} discovered products in the admin panel`)
      actions.push("Approve or reject products for import")
    } else {
      actions.push("No products discovered - check site configuration")
      actions.push("Consider updating product URL patterns")
    }
  } else if (status === 'failed') {
    actions.push("Review error log and fix issues")
    actions.push("Check site accessibility and robots.txt")
    actions.push("Retry discovery with updated configuration")
  }

  return actions
}