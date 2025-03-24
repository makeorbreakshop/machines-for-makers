import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createServerClient } from "@/lib/supabase/server"
import { Plus, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { Machine } from "@/lib/database-types"

// Add export const dynamic = 'force-dynamic' to prevent static generation
export const dynamic = 'force-dynamic'

// Define a simpler type for the table data
interface TableMachine {
  id: string
  machine_name: string
  company: string | null
  machine_category: string | null
  price: number | null
  rating: number | null
  published_at: string | null
}

// Define columns for the machines table
const columns: ColumnDef<TableMachine>[] = [
  {
    accessorKey: "machine_name",
    header: "Name",
    cell: ({ row }) => {
      const machine = row.original
      return (
        <div className="font-medium">
          <Link href={`/admin/machines/${machine.id}`} className="hover:underline">
            {machine.machine_name}
          </Link>
        </div>
      )
    },
  },
  {
    accessorKey: "company",
    header: "Brand",
  },
  {
    accessorKey: "machine_category",
    header: "Category",
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const price = Number.parseFloat(row.getValue("price") as string)
      return price ? `$${price.toLocaleString()}` : "N/A"
    },
  },
  {
    accessorKey: "rating",
    header: "Rating",
  },
  {
    accessorKey: "published_at",
    header: "Status",
    cell: ({ row }) => {
      const published = row.original.published_at
      return (
        <div
          className={`px-2 py-1 rounded-full text-xs ${
            published ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {published ? "Published" : "Draft"}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const machine = row.original
      return (
        <div className="flex items-center gap-2">
          <Link href={`/admin/machines/${machine.id}`}>
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  },
]

export default async function MachinesPage() {
  const supabase = await createServerClient()

  const { data: machines, error } = await supabase
    .from("machines")
    .select("*")
    .order("machine_name", { ascending: true })

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

      <Card>
        <CardHeader>
          <CardTitle>All Machines</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={safeData} />
        </CardContent>
      </Card>
    </div>
  )
}

