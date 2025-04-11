import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdminAuth } from "@/lib/auth-utils"
import { MachineScraperForm } from "@/components/admin/machine-scraper-form"

// Force dynamic to prevent static generation and ensure fresh data
export const dynamic = 'force-dynamic'
// Add nodejs runtime as per DEVELOPMENT_GUIDELINES for server components using Supabase
export const runtime = 'nodejs'

export default async function MachineScraper() {
  // Check auth first - will redirect if not authenticated
  await requireAdminAuth();
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Machine Scraper</h1>
          <p className="text-muted-foreground mt-1">
            Extract machine data from product URLs
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Machine Data Scraper</CardTitle>
            <CardDescription>
              Enter a product URL to extract machine specifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MachineScraperForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 