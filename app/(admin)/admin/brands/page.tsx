import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdminAuth } from "@/lib/auth-utils"

// Add export const dynamic = 'force-dynamic' to prevent static generation
export const dynamic = 'force-dynamic'

export default async function BrandsPage() {
  // Check auth first - will redirect if not authenticated
  await requireAdminAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Brands</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brands Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <p className="text-xl text-muted-foreground">Coming Soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 