import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { createServerClient } from "@/lib/supabase/server"
import { Plus, Database } from "lucide-react"
import Link from "next/link"
import { MachinesTable, type TableMachine } from "@/components/admin/machines-table"
import type { Database as DbType } from "@/lib/database-types"
import { requireAdminAuth } from "@/lib/auth-utils"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/ui/table-skeleton"

// Force dynamic to prevent static generation and ensure fresh data
export const dynamic = 'force-dynamic'
// Add nodejs runtime as per DEVELOPMENT_GUIDELINES for server components using Supabase
export const runtime = 'nodejs'

export default async function MachinesPage() {
  // Check auth first - will redirect if not authenticated
  await requireAdminAuth();
  
  const supabase = await createServerClient()

  // Fetch machines with error handling and additional fields
  const { data: machines, error } = await supabase
    .from("machines")
    .select(`
      id,
      "Machine Name",
      "Company",
      "Machine Category",
      "Price",
      "Rating",
      "Published On",
      "Image",
      "Work Area",
      "Favorited",
      "Award",
      "Speed Category",
      "Updated On",
      "Laser Type A",
      "Laser Power A",
      "Height",
      "Machine Size",
      "Speed",
      "Acceleration",
      "Software",
      "Focus",
      "Enclosure",
      "Wifi",
      "Camera",
      "Passthrough",
      "Controller",
      "Warranty"
    `)
    .order("Machine Name", { ascending: true })

  // Transform the data to make it compatible with the expected format
  const safeData: TableMachine[] = (machines || []).map((machine) => ({
    id: machine.id,
    machine_name: machine["Machine Name"] || "",
    company: machine["Company"],
    machine_category: machine["Machine Category"],
    price: machine["Price"],
    rating: machine["Rating"],
    published_at: machine["Published On"],
    image: machine["Image"],
    work_area: machine["Work Area"],
    favorited: machine["Favorited"],
    award: machine["Award"],
    speed_category: machine["Speed Category"],
    updated_at: machine["Updated On"],
    laser_type: machine["Laser Type A"],
    laser_power: machine["Laser Power A"],
    height: machine["Height"],
    machine_size: machine["Machine Size"],
    speed: machine["Speed"],
    acceleration: machine["Acceleration"],
    software: machine["Software"],
    focus: machine["Focus"],
    enclosure: machine["Enclosure"],
    wifi: machine["Wifi"],
    camera: machine["Camera"],
    passthrough: machine["Passthrough"],
    controller: machine["Controller"],
    warranty: machine["Warranty"],
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Machines</h1>
          <p className="text-muted-foreground mt-1">
            Manage all machine listings in the database
          </p>
        </div>
        <Link href="/admin/machines/new">
          <Button className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Machine
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error loading machines: {error.message}</p>
        </div>
      )}

      <div className="grid gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle>All Machines</CardTitle>
                <CardDescription>
                  {safeData.length} machines in database
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Database className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-3">
            <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
              <MachinesTable data={safeData} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

