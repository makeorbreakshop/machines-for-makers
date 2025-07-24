import { createServerClient } from "@/lib/supabase/server"
import { requireAdminAuth } from "@/lib/auth-utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SiteScansPage({ params }: PageProps) {
  await requireAdminAuth()
  const { id } = await params
  const supabase = await createServerClient()

  // Get site info
  const { data: site } = await supabase
    .from("manufacturer_sites")
    .select("*")
    .eq("id", id)
    .single()

  // Get scan logs
  const { data: scans } = await supabase
    .from("site_scan_logs")
    .select("*")
    .eq("site_id", id)
    .order("created_at", { ascending: false })
    .limit(20)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="animate-pulse">Running</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/manufacturer-sites">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Scan History: {site?.name}</h1>
          <p className="text-muted-foreground">{site?.base_url}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {scans?.map((scan) => (
          <Card key={scan.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(scan.status)}
                    Scan #{scan.id.slice(0, 8)}
                  </CardTitle>
                  <CardDescription>
                    Started {formatDistanceToNow(new Date(scan.created_at))} ago
                  </CardDescription>
                </div>
                {getStatusBadge(scan.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{scan.scan_type || 'discovery'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Products Found</p>
                  <p className="font-medium">{scan.products_found || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Processed</p>
                  <p className="font-medium">{scan.products_processed || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost</p>
                  <p className="font-medium">${scan.ai_cost_usd?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {scan.error_message && (
                <div className="mt-4 p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-red-800">{scan.error_message}</p>
                </div>
              )}

              {scan.status === 'completed' && scan.products_found > 0 && (
                <div className="mt-4">
                  <Link href={`/admin/discovery?scan_id=${scan.id}`}>
                    <Button size="sm" variant="outline">
                      View Discovered Products
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!scans || scans.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No scans yet. Click the play button to start discovering products.
          </CardContent>
        </Card>
      )}
    </div>
  )
}