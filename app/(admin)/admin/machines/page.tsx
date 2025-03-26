import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createServerClient } from "@/lib/supabase/server"
import { Plus } from "lucide-react"
import Link from "next/link"
import { MachinesTable, type TableMachine } from "@/components/admin/machines-table"
import type { Machine } from "@/lib/database-types"

// Add export const dynamic = 'force-dynamic' to prevent static generation
export const dynamic = 'force-dynamic'

export default async function MachinesPage() {
  const supabase = await createServerClient()

  const { data: machines, error } = await supabase
    .from("machines")
    .select("*")
    .order("Machine Name", { ascending: true })

  // Log any errors for debugging
  if (error) {
    console.error("Error fetching machines:", error.message)
  }

  // Transform the data to make it compatible with the expected format
  const safeData: TableMachine[] = machines?.map((machine: Machine) => ({
    id: machine.id,
    machine_name: machine["Machine Name"] || "",
    company: machine["Company"],
    machine_category: machine["Machine Category"],
    price: machine["Price"],
    rating: machine["Rating"],
    published_at: machine["Published On"],
  })) || []

  // Log the data count for debugging
  console.log(`Machines count: ${machines?.length || 0}`)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Machines</h1>
        <Link href="/admin/machines/new">
          <Button>
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

      <Card>
        <CardHeader>
          <CardTitle>All Machines ({safeData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <MachinesTable data={safeData} />
        </CardContent>
      </Card>
    </div>
  )
}

