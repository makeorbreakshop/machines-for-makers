import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { createServerClient } from "@/lib/supabase/server"
import { Search, Filter, Eye, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { DiscoveryGrid } from "@/components/admin/discovery-grid"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { DiscoveryClientWrapper } from "./discovery-client-wrapper"

// Force dynamic to prevent static generation and ensure fresh data
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface DiscoveredProduct {
  id: string
  source_url: string
  raw_data: any
  normalized_data: any
  validation_errors: string[]
  validation_warnings: string[]
  status: 'pending' | 'approved' | 'rejected' | 'duplicate' | 'imported'
  machine_type: string | null
  similarity_score: number | null
  created_at: string
  imported_machine_id: string | null
  scan_log: {
    site: {
      name: string
      base_url: string
    }
  }
}

export default async function DiscoveryPage() {
  
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

  // Transform data for component
  const safeData: DiscoveredProduct[] = (discoveredProducts || []).map((product: any) => ({
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

  // Calculate summary stats
  const stats = safeData.reduce((acc, product) => {
    acc.total++
    acc[product.status]++
    if (product.validation_errors.length > 0) acc.withErrors++
    return acc
  }, {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    duplicate: 0,
    imported: 0,
    withErrors: 0
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Product Discovery</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve products discovered from manufacturer websites
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error loading discovered products: {error.message}</p>
        </div>
      )}


      <Suspense fallback={<TableSkeleton columns={6} rows={10} />}>
        <DiscoveryClientWrapper data={safeData} />
      </Suspense>
    </div>
  )
}