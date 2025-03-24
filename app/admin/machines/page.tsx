import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createServerClient } from "@/lib/supabase/server"
import { Plus, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { Machine } from "@/lib/database-types"

// Define columns for the machines table
const columns: ColumnDef<Machine>[] = [
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
      const price = Number.parseFloat(row.getValue("price"))
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
  const supabase = createServerClient()

  const { data: machines, error } = await supabase
    .from("machines")
    .select("*")
    .order("machine_name", { ascending: true })

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
          <DataTable columns={columns} data={machines || []} />
        </CardContent>
      </Card>
    </div>
  )
}

