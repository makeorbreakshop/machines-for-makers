import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { createServerClient } from "@/lib/supabase/server"
import { Search, Filter, Eye, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { DiscoveryGrid } from "@/components/admin/discovery-grid"
import { requireAdminAuth } from "@/lib/auth-utils"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/ui/table-skeleton"

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
  status: 'pending' | 'approved' | 'rejected' | 'duplicate'
  machine_type: string | null
  similarity_score: number | null
  created_at: string
  scan_log: {
    site: {
      name: string
      base_url: string
    }
  }
}

export default async function DiscoveryPage() {
  await requireAdminAuth()
  
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
      scan_log_id,
      site_scan_logs!inner (
        site_id,
        manufacturer_sites!inner (
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
    scan_log: {
      site: {
        name: product.site_scan_logs.manufacturer_sites.name,
        base_url: product.site_scan_logs.manufacturer_sites.base_url
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error loading discovered products: {error.message}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.withErrors}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle>Discovered Products</CardTitle>
                <CardDescription>
                  Review and manage products found during website crawling
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Eye className="h-4 w-4" />
                <span>Showing latest {Math.min(100, stats.total)} results</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-3">
            <Suspense fallback={<TableSkeleton columns={6} rows={10} />}>
              <DiscoveryGrid data={safeData} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}