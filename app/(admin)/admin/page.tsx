import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createServerClient } from "@/lib/supabase/server"
import { Layers, Tag, Star, Building } from "lucide-react"
import Link from "next/link"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createServerClient()

  // Get counts for dashboard
  const [machinesResponse, categoriesResponse, reviewsResponse, brandsResponse] = await Promise.all([
    supabase.from("machines").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("brands").select("id", { count: "exact", head: true }),
  ])

  const machineCount = machinesResponse.count || 0
  const categoryCount = categoriesResponse.count || 0
  const reviewCount = reviewsResponse.count || 0
  const brandCount = brandsResponse.count || 0

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="text-muted-foreground mb-6">
        <p>Welcome to the admin area. The header and footer are hidden here for a clean backend experience.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard title="Machines" value={machineCount} icon={Layers} href="/admin/machines" color="bg-blue-500" />
        <DashboardCard
          title="Categories"
          value={categoryCount}
          icon={Tag}
          href="/admin/categories"
          color="bg-green-500"
        />
        <DashboardCard title="Reviews" value={reviewCount} icon={Star} href="/admin/reviews" color="bg-amber-500" />
        <DashboardCard title="Brands" value={brandCount} icon={Building} href="/admin/brands" color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent activity to display.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/admin/machines/new"
                className="block w-full p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add New Machine
              </Link>
              <Link
                href="/admin/categories/new"
                className="block w-full p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add New Category
              </Link>
              <Link
                href="/admin/brands/new"
                className="block w-full p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add New Brand
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  value,
  icon: Icon,
  href,
  color,
}: {
  title: string
  value: number
  icon: React.ElementType
  href: string
  color: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

